const HESTIA_HOST = process.env.HESTIA_HOST || "https://localhost:8083";
const HESTIA_USER = process.env.HESTIA_USER || "admin";
const HESTIA_PASSWORD = process.env.HESTIA_PASSWORD || "";

async function hestiaCommand(cmd: string, ...args: string[]): Promise<any> {
  const params = new URLSearchParams();
  params.append("user", HESTIA_USER);
  params.append("password", HESTIA_PASSWORD);
  params.append("returncode", "no");
  params.append("cmd", cmd);

  args.forEach((arg, index) => {
    params.append(`arg${index + 1}`, arg);
  });

  console.log(`[HestiaAPI] ${cmd} → ${HESTIA_HOST}/api/`);

  let response: Response;
  try {
    response = await fetch(`${HESTIA_HOST}/api/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });
  } catch (err: any) {
    console.error(`[HestiaAPI] Connection failed: ${err.message}`);
    throw new Error(`Cannot connect to HestiaCP at ${HESTIA_HOST}: ${err.message}`);
  }

  const text = await response.text();
  console.log(`[HestiaAPI] ${cmd} status=${response.status} length=${text.length}`);

  if (!response.ok) {
    console.error(`[HestiaAPI] HTTP ${response.status}: ${text.substring(0, 200)}`);
    throw new Error(`HestiaCP returned HTTP ${response.status}`);
  }

  // HestiaCP returns "0\n" for success on write commands
  if (text.trim() === "0") {
    return { success: true };
  }

  // Try parse JSON
  try {
    const data = JSON.parse(text);
    return data;
  } catch {
    // Not JSON — could be an error code or message
    const trimmed = text.trim();
    // HestiaCP error codes are single numbers
    if (/^\d+$/.test(trimmed)) {
      const code = parseInt(trimmed, 10);
      const errorMessages: Record<number, string> = {
        1: "Not enough arguments",
        2: "Object or argument is not valid",
        3: "Object doesn't exist",
        4: "Object already exists",
        5: "Object is suspended",
        6: "Object is already unsuspended",
        7: "Object can't be deleted because is used by another object",
        8: "Object can't be created because of hosting package limits",
        9: "Wrong password",
        10: "Object can't be accessed (permission denied)",
        11: "Subsystem is disabled",
        12: "Configuration is broken",
      };
      throw new Error(errorMessages[code] || `HestiaCP error code: ${code}`);
    }
    console.error(`[HestiaAPI] Unexpected response: ${trimmed.substring(0, 300)}`);
    throw new Error(`HestiaCP returned unexpected response: ${trimmed.substring(0, 100)}`);
  }
}

// === USERS ===
export async function listUsers() {
  const data = await hestiaCommand("v-list-users", "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    console.error("[HestiaAPI] listUsers: unexpected data type:", typeof data);
    return [];
  }
  return Object.entries(data).map(([username, info]: [string, any]) => ({
    username,
    ...info,
  }));
}

export async function addUser(
  username: string,
  password: string,
  email: string,
  package_name: string = "default"
) {
  return hestiaCommand("v-add-user", username, password, email, package_name);
}

export async function deleteUser(username: string) {
  return hestiaCommand("v-delete-user", username);
}

export async function suspendUser(username: string) {
  return hestiaCommand("v-suspend-user", username);
}

export async function unsuspendUser(username: string) {
  return hestiaCommand("v-unsuspend-user", username);
}

// === DOMAINS ===
export async function listDomains(user: string = "admin") {
  const data = await hestiaCommand("v-list-web-domains", user, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return [];
  }
  return Object.entries(data).map(([domain, info]: [string, any]) => ({
    domain,
    user,
    ...info,
  }));
}

export async function listAllDomains() {
  const users = await listUsers();
  const allDomains: any[] = [];
  for (const user of users) {
    try {
      const domains = await listDomains(user.username);
      allDomains.push(...domains);
    } catch {
      // User might have no domains
    }
  }
  return allDomains;
}

export async function addDomain(user: string, domain: string) {
  return hestiaCommand("v-add-domain", user, domain);
}

export async function deleteDomain(user: string, domain: string) {
  return hestiaCommand("v-delete-web-domain", user, domain);
}

export async function addLetsEncrypt(user: string, domain: string) {
  return hestiaCommand("v-add-letsencrypt-domain", user, domain);
}

// === SYSTEM ===
export async function getSystemInfo() {
  return hestiaCommand("v-list-sys-info", "json");
}

export async function getSystemStats() {
  // Get multiple stats for dashboard
  const [sysInfo, users, packages] = await Promise.allSettled([
    hestiaCommand("v-list-sys-info", "json"),
    hestiaCommand("v-list-users", "json"),
    hestiaCommand("v-list-user-packages", "json"),
  ]);

  const sys = sysInfo.status === "fulfilled" ? sysInfo.value : null;
  const usersData = users.status === "fulfilled" ? users.value : null;
  const pkgsData = packages.status === "fulfilled" ? packages.value : null;

  // Count users (excluding system users)
  let userCount = 0;
  let totalDomains = 0;
  let totalDisk = 0;
  let totalBandwidth = 0;
  if (usersData && typeof usersData === "object" && !Array.isArray(usersData)) {
    for (const [, info] of Object.entries(usersData) as [string, any][]) {
      userCount++;
      totalDomains += parseInt(info.U_WEB_DOMAINS || "0", 10);
      totalDisk += parseInt(info.U_DISK || "0", 10);
      totalBandwidth += parseInt(info.U_BANDWIDTH || "0", 10);
    }
  }

  // Parse system info
  let hostname = "";
  let os = "";
  let cpuCount = 0;
  let uptime = "";
  let loadAvg = "";
  if (sys && typeof sys === "object") {
    // v-list-sys-info returns nested object
    const info = sys.sysinfo || sys;
    hostname = info.HOSTNAME || "";
    os = info.OS || "";
    cpuCount = parseInt(info.CPU_COUNT || "0", 10);
    uptime = info.UPTIME || "";
    loadAvg = info.LOADAVERAGE || "";
  }

  return {
    users: userCount,
    domains: totalDomains,
    diskUsed: totalDisk, // in MB
    bandwidth: totalBandwidth, // in MB
    hostname,
    os,
    cpuCount,
    uptime,
    loadAvg,
    packages: pkgsData && typeof pkgsData === "object" ? Object.keys(pkgsData).length : 0,
  };
}

export async function listPackages() {
  const data = await hestiaCommand("v-list-user-packages", "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return [];
  }
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    ...info,
  }));
}

// === SERVICES ===
export async function listServices() {
  try {
    const data = await hestiaCommand("v-list-sys-services", "json");
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return [];
    }
    return Object.entries(data).map(([name, info]: [string, any]) => ({
      name,
      ...info,
    }));
  } catch {
    return [];
  }
}

// === FILE SYSTEM ===
export async function listDirectory(user: string, path: string = "/") {
  const data = await hestiaCommand("v-list-fs-directory", user, path, "json");
  if (typeof data !== "object" || data === null) return [];
  // Returns object with filenames as keys
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    ...info,
  }));
}

export async function readFile(user: string, path: string) {
  return hestiaCommand("v-open-fs-file", user, path);
}

export async function createDirectory(user: string, path: string) {
  return hestiaCommand("v-add-fs-directory", user, path);
}

export async function deleteFile(user: string, path: string) {
  return hestiaCommand("v-delete-fs-file", user, path);
}

export async function deleteDirectory(user: string, path: string) {
  return hestiaCommand("v-delete-fs-directory", user, path);
}

// === DATABASES ===
export async function listDatabases(user: string) {
  const data = await hestiaCommand("v-list-databases", user, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    user,
    ...info,
  }));
}

export async function listAllDatabases() {
  const users = await listUsers();
  const allDbs: any[] = [];
  for (const user of users) {
    try {
      const dbs = await listDatabases(user.username);
      allDbs.push(...dbs);
    } catch {
      // User might have no databases
    }
  }
  return allDbs;
}

export async function addDatabase(user: string, dbName: string, dbUser: string, dbPassword: string, type: string = "mysql") {
  return hestiaCommand("v-add-database", user, dbName, dbUser, dbPassword, type);
}

export async function deleteDatabase(user: string, dbName: string) {
  return hestiaCommand("v-delete-database", user, dbName);
}

// === MAIL ===
export async function listMailDomains(user: string) {
  const data = await hestiaCommand("v-list-mail-domains", user, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([domain, info]: [string, any]) => ({
    domain,
    user,
    ...info,
  }));
}

export async function listAllMailDomains() {
  const users = await listUsers();
  const all: any[] = [];
  for (const user of users) {
    try {
      const domains = await listMailDomains(user.username);
      all.push(...domains);
    } catch {}
  }
  return all;
}

export async function listMailAccounts(user: string, domain: string) {
  const data = await hestiaCommand("v-list-mail-accounts", user, domain, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([account, info]: [string, any]) => ({
    account,
    domain,
    user,
    ...info,
  }));
}

export async function addMailDomain(user: string, domain: string) {
  return hestiaCommand("v-add-mail-domain", user, domain);
}

export async function deleteMailDomain(user: string, domain: string) {
  return hestiaCommand("v-delete-mail-domain", user, domain);
}

export async function addMailAccount(user: string, domain: string, account: string, password: string) {
  return hestiaCommand("v-add-mail-account", user, domain, account, password);
}

export async function deleteMailAccount(user: string, domain: string, account: string) {
  return hestiaCommand("v-delete-mail-account", user, domain, account);
}

// === DNS ===
export async function listDnsDomains(user: string) {
  const data = await hestiaCommand("v-list-dns-domains", user, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([domain, info]: [string, any]) => ({
    domain,
    user,
    ...info,
  }));
}

export async function listAllDnsDomains() {
  const users = await listUsers();
  const all: any[] = [];
  for (const user of users) {
    try {
      const domains = await listDnsDomains(user.username);
      all.push(...domains);
    } catch {}
  }
  return all;
}

export async function listDnsRecords(user: string, domain: string) {
  const data = await hestiaCommand("v-list-dns-records", user, domain, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([id, info]: [string, any]) => ({
    id,
    domain,
    user,
    ...info,
  }));
}

export async function addDnsRecord(user: string, domain: string, recordId: string, type: string, value: string, priority?: string) {
  const args = [user, domain, recordId, type, value];
  if (priority) args.push(priority);
  return hestiaCommand("v-add-dns-record", ...args);
}

export async function deleteDnsRecord(user: string, domain: string, recordId: string) {
  return hestiaCommand("v-delete-dns-record", user, domain, recordId);
}

// === SSL ===
export async function listSslCertificates() {
  // Get all domains with SSL info
  const users = await listUsers();
  const certs: any[] = [];
  for (const user of users) {
    try {
      const domains = await listDomains(user.username);
      for (const domain of domains) {
        certs.push({
          domain: domain.domain,
          user: user.username,
          ssl: domain.SSL || "no",
          sslHome: domain.SSL_HOME || "",
          letsencrypt: domain.LETSENCRYPT || "no",
          sslExpiry: domain.SSL_EXPIRE || "",
          sslIssuer: domain.SSL_ISSUER || "",
        });
      }
    } catch {}
  }
  return certs;
}

export async function addLetsEncryptDomain(user: string, domain: string, aliases?: string) {
  const args = [user, domain];
  if (aliases) args.push(aliases);
  return hestiaCommand("v-add-letsencrypt-domain", ...args);
}

export async function deleteLetsEncryptDomain(user: string, domain: string) {
  return hestiaCommand("v-delete-letsencrypt-domain", user, domain);
}

// === BACKUPS ===
export async function listBackups(user: string) {
  const data = await hestiaCommand("v-list-user-backups", user, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([filename, info]: [string, any]) => ({
    filename,
    user,
    ...info,
  }));
}

export async function listAllBackups() {
  const users = await listUsers();
  const all: any[] = [];
  for (const user of users) {
    try {
      const backups = await listBackups(user.username);
      all.push(...backups);
    } catch {}
  }
  return all;
}

export async function createBackup(user: string) {
  return hestiaCommand("v-schedule-user-backup", user);
}

export async function restoreBackup(user: string, backup: string) {
  return hestiaCommand("v-schedule-user-restore", user, backup);
}

export async function deleteBackup(user: string, backup: string) {
  return hestiaCommand("v-delete-user-backup", user, backup);
}

// === DEBUG ===
export async function testConnection(): Promise<{
  ok: boolean;
  host: string;
  user: string;
  error?: string;
  rawResponse?: string;
}> {
  try {
    const params = new URLSearchParams();
    params.append("user", HESTIA_USER);
    params.append("password", HESTIA_PASSWORD);
    params.append("returncode", "no");
    params.append("cmd", "v-list-users");
    params.append("arg1", "json");

    const response = await fetch(`${HESTIA_HOST}/api/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });

    const text = await response.text();

    // Try to parse as JSON
    try {
      const json = JSON.parse(text);
      const userCount = Object.keys(json).length;
      return {
        ok: true,
        host: HESTIA_HOST,
        user: HESTIA_USER,
        rawResponse: `JSON with ${userCount} users: ${Object.keys(json).join(", ")}`,
      };
    } catch {
      return {
        ok: false,
        host: HESTIA_HOST,
        user: HESTIA_USER,
        error: `HTTP ${response.status}, not JSON`,
        rawResponse: text.substring(0, 500),
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      host: HESTIA_HOST,
      user: HESTIA_USER,
      error: err.message,
    };
  }
}
