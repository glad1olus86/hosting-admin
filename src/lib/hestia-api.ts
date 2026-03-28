const HESTIA_HOST = process.env.HESTIA_HOST || "https://localhost:8083";
const HESTIA_USER = process.env.HESTIA_USER || "admin";
const HESTIA_PASSWORD = process.env.HESTIA_PASSWORD || "";

export async function hestiaCommand(cmd: string, ...args: string[]): Promise<any> {
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

  const trimmed = text.trim();

  // HestiaCP success responses for write commands:
  // "0", "OK", "ok", empty string, or any "0\n" variant
  const successValues = ["0", "ok", ""];
  if (successValues.includes(trimmed.toLowerCase())) {
    return { success: true };
  }

  // Try parse JSON (for list/read commands)
  try {
    const data = JSON.parse(text);
    return data;
  } catch {
    // HestiaCP error codes are single numbers (1-12+)
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

    // Detect "Error: ..." responses from HestiaCP
    if (/^Error:/im.test(trimmed)) {
      const errorMsg = trimmed.replace(/^Error:\s*/i, "").trim();
      console.error(`[HestiaAPI] ${cmd} error: "${errorMsg}"`);
      throw new Error(errorMsg);
    }

    // Some commands return plain text success messages like "OK", "Done", etc.
    // If HTTP was 200 and text is short, treat as success
    if (trimmed.length < 100 && response.ok) {
      console.log(`[HestiaAPI] ${cmd} treating as success: "${trimmed}"`);
      return { success: true, message: trimmed };
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

export async function listSystemIps(): Promise<Record<string, any>> {
  return hestiaCommand("v-list-sys-ips", "json");
}

export async function addDomain(user: string, domain: string, ip?: string) {
  try {
    if (ip) {
      return await hestiaCommand("v-add-domain", user, domain, ip);
    }
    return await hestiaCommand("v-add-domain", user, domain);
  } catch (err: any) {
    // v-add-domain creates web+mail+dns. If web succeeded but mail already exists,
    // HestiaCP returns "Error: Mail domain exists" — this is non-critical
    if (err.message && /mail domain/i.test(err.message)) {
      console.log(`[HestiaAPI] addDomain: mail warning ignored: ${err.message}`);
      return { success: true, warning: err.message };
    }
    throw err;
  }
}

export async function deleteDomain(user: string, domain: string) {
  return hestiaCommand("v-delete-web-domain", user, domain);
}

export async function addLetsEncrypt(user: string, domain: string) {
  await hestiaCommand("v-add-letsencrypt-domain", user, domain);
  // Auto-enable HTTP→HTTPS redirect
  try {
    await hestiaCommand("v-add-web-domain-ssl-force", user, domain);
  } catch {
    // Non-critical, SSL still works without redirect
  }
  return { success: true };
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
    cpuCount = parseInt(info.CPU_CORES || info.CPU_COUNT || "0", 10);
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
// Raw command that returns text (for commands that don't support JSON)
async function hestiaCommandRaw(cmd: string, ...args: string[]): Promise<string> {
  const params = new URLSearchParams();
  params.append("user", HESTIA_USER);
  params.append("password", HESTIA_PASSWORD);
  params.append("returncode", "no");
  params.append("cmd", cmd);
  args.forEach((arg, index) => {
    params.append(`arg${index + 1}`, arg);
  });

  const response = await fetch(`${HESTIA_HOST}/api/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`HestiaCP returned HTTP ${response.status}`);
  return response.text();
}

// Returns raw bytes (for binary file downloads)
async function hestiaCommandBuffer(cmd: string, ...args: string[]): Promise<ArrayBuffer> {
  const params = new URLSearchParams();
  params.append("user", HESTIA_USER);
  params.append("password", HESTIA_PASSWORD);
  params.append("returncode", "no");
  params.append("cmd", cmd);
  args.forEach((arg, index) => {
    params.append(`arg${index + 1}`, arg);
  });

  const response = await fetch(`${HESTIA_HOST}/api/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`HestiaCP returned HTTP ${response.status}`);
  return response.arrayBuffer();
}

// For action commands (create, delete, etc.) — uses returncode=yes for reliable error detection
export async function hestiaActionCommand(cmd: string, ...args: string[]): Promise<void> {
  const params = new URLSearchParams();
  params.append("user", HESTIA_USER);
  params.append("password", HESTIA_PASSWORD);
  params.append("returncode", "yes");
  params.append("cmd", cmd);
  args.forEach((arg, index) => {
    params.append(`arg${index + 1}`, arg);
  });

  console.log(`[HestiaAPI] action: ${cmd} args=[${args.join(", ")}]`);

  const response = await fetch(`${HESTIA_HOST}/api/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    cache: "no-store",
  });

  const text = await response.text();
  const code = parseInt(text.trim(), 10);

  console.log(`[HestiaAPI] action: ${cmd} returncode=${code}`);

  if (isNaN(code) || code !== 0) {
    const errorMessages: Record<number, string> = {
      1: "Not enough arguments",
      2: "Object or argument is not valid",
      3: "Object doesn't exist",
      4: "Object already exists",
      5: "Object is suspended",
      6: "Object is already unsuspended",
      7: "Object can't be deleted (used by another object)",
      8: "Hosting package limits exceeded",
      9: "Wrong password",
      10: "Permission denied",
      11: "Subsystem is disabled",
      12: "Configuration is broken",
    };
    throw new Error(errorMessages[code] || `HestiaCP error (code ${code}): ${text.trim().substring(0, 100)}`);
  }
}

export async function listDirectory(user: string, path: string = "/") {
  // v-list-fs-directory returns pipe-delimited format:
  // TYPE|PERMISSIONS|DATE|TIME|OWNER|GROUP|SIZE|NAME
  const raw = await hestiaCommandRaw("v-list-fs-directory", user, path);
  const trimmed = raw.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) return [];

  const lines = trimmed.split("\n").filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("|");
    if (parts.length >= 8) {
      return {
        name: parts.slice(7).join("|").trim(), // filename may contain pipes
        TYPE: parts[0]?.trim(),
        PERMISSIONS: parts[1]?.trim(),
        DATE: parts[2]?.trim(),
        TIME: parts[3]?.trim(),
        OWNER: parts[4]?.trim(),
        GROUP: parts[5]?.trim(),
        SIZE: parts[6]?.trim(),
      };
    }
    return { name: line.trim(), TYPE: "f" };
  }).filter((f) => f.name && f.name !== "." && f.name !== "..");
}

export async function readFile(user: string, path: string) {
  return hestiaCommandRaw("v-open-fs-file", user, path);
}

export async function readFileBuffer(user: string, path: string) {
  return hestiaCommandBuffer("v-open-fs-file", user, path);
}

export async function createDirectory(user: string, path: string) {
  await hestiaActionCommand("v-add-fs-directory", user, path);
  return { success: true };
}

export async function deleteFile(user: string, path: string) {
  await hestiaActionCommand("v-delete-fs-file", user, path);
  return { success: true };
}

export async function deleteDirectory(user: string, path: string) {
  await hestiaActionCommand("v-delete-fs-directory", user, path);
  return { success: true };
}

export async function copyFile(user: string, srcPath: string, dstPath: string) {
  await hestiaActionCommand("v-copy-fs-file", user, srcPath, dstPath);
  return { success: true };
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
  await hestiaActionCommand("v-add-database", user, dbName, dbUser, dbPassword, type);
  return { success: true };
}

export async function deleteDatabase(user: string, dbName: string) {
  await hestiaActionCommand("v-delete-database", user, dbName);
  return { success: true };
}

export async function changeDatabasePassword(user: string, dbName: string, dbPassword: string) {
  await hestiaActionCommand("v-change-database-password", user, dbName, dbPassword);
  return { success: true };
}

export async function suspendDatabase(user: string, dbName: string) {
  await hestiaActionCommand("v-suspend-database", user, dbName);
  return { success: true };
}

export async function unsuspendDatabase(user: string, dbName: string) {
  await hestiaActionCommand("v-unsuspend-database", user, dbName);
  return { success: true };
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
  await hestiaActionCommand("v-add-mail-domain", user, domain);
  // Enable DKIM by default
  try { await hestiaActionCommand("v-add-mail-domain-dkim", user, domain); } catch {}
  return { success: true };
}

export async function deleteMailDomain(user: string, domain: string) {
  await hestiaActionCommand("v-delete-mail-domain", user, domain);
  return { success: true };
}

export async function addMailAccount(user: string, domain: string, account: string, password: string) {
  await hestiaActionCommand("v-add-mail-account", user, domain, account, password);
  return { success: true };
}

export async function deleteMailAccount(user: string, domain: string, account: string) {
  await hestiaActionCommand("v-delete-mail-account", user, domain, account);
  return { success: true };
}

export async function toggleMailDkim(user: string, domain: string, enable: boolean) {
  if (enable) {
    await hestiaActionCommand("v-add-mail-domain-dkim", user, domain);
  } else {
    await hestiaActionCommand("v-delete-mail-domain-dkim", user, domain);
  }
}

export async function toggleMailAntivirus(user: string, domain: string, enable: boolean) {
  if (enable) {
    await hestiaActionCommand("v-add-mail-domain-antivirus", user, domain);
  } else {
    await hestiaActionCommand("v-delete-mail-domain-antivirus", user, domain);
  }
}

export async function toggleMailAntispam(user: string, domain: string, enable: boolean) {
  if (enable) {
    await hestiaActionCommand("v-add-mail-domain-antispam", user, domain);
  } else {
    await hestiaActionCommand("v-delete-mail-domain-antispam", user, domain);
  }
}

export async function setMailCatchall(user: string, domain: string, email: string) {
  await hestiaActionCommand("v-change-mail-domain-catchall", user, domain, email);
}

export async function removeMailCatchall(user: string, domain: string) {
  await hestiaActionCommand("v-delete-mail-domain-catchall", user, domain);
}

export async function changeMailAccountPassword(user: string, domain: string, account: string, password: string) {
  await hestiaActionCommand("v-change-mail-account-password", user, domain, account, password);
}

export async function changeMailAccountQuota(user: string, domain: string, account: string, quota: string) {
  await hestiaActionCommand("v-change-mail-account-quota", user, domain, account, quota);
}

export async function suspendMailAccount(user: string, domain: string, account: string) {
  await hestiaActionCommand("v-suspend-mail-account", user, domain, account);
}

export async function unsuspendMailAccount(user: string, domain: string, account: string) {
  await hestiaActionCommand("v-unsuspend-mail-account", user, domain, account);
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

export async function deleteDnsDomain(user: string, domain: string) {
  await hestiaActionCommand("v-delete-dns-domain", user, domain);
  return { success: true };
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

// v-add-dns-record USER DOMAIN RECORD TYPE VALUE [PRIORITY] [ID] [RESTART] [TTL]
export async function addDnsRecord(user: string, domain: string, record: string, type: string, value: string, priority?: string, ttl?: string) {
  const args: string[] = [user, domain, record, type, value];
  args.push(priority || ""); // priority
  args.push("");             // id (auto)
  args.push("");             // restart
  if (ttl) args.push(ttl);
  await hestiaActionCommand("v-add-dns-record", ...args);
  return { success: true };
}

export async function deleteDnsRecord(user: string, domain: string, recordId: string) {
  await hestiaActionCommand("v-delete-dns-record", user, domain, recordId);
  return { success: true };
}

// Edit = delete old + add new
export async function editDnsRecord(
  user: string, domain: string, oldId: string,
  record: string, type: string, value: string, priority?: string, ttl?: string
) {
  await deleteDnsRecord(user, domain, oldId);
  return addDnsRecord(user, domain, record, type, value, priority, ttl);
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
  await hestiaActionCommand("v-add-letsencrypt-domain", ...args);
  return { success: true };
}

export async function deleteLetsEncryptDomain(user: string, domain: string) {
  await hestiaActionCommand("v-delete-letsencrypt-domain", user, domain);
  return { success: true };
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
  await hestiaActionCommand("v-schedule-user-backup", user);
  return { success: true };
}

export async function restoreBackup(user: string, backup: string) {
  await hestiaActionCommand("v-schedule-user-restore", user, backup);
  return { success: true };
}

export async function deleteBackup(user: string, backup: string) {
  await hestiaActionCommand("v-delete-user-backup", user, backup);
  return { success: true };
}

// === FTP ===
export async function listAllFtpAccounts() {
  const users = await listUsers();
  const allFtp: any[] = [];
  for (const user of users) {
    try {
      const domains = await listDomains(user.username);
      for (const domain of domains) {
        const ftpUsers = domain.FTP_USER ? String(domain.FTP_USER).split(":").filter(Boolean) : [];
        const ftpPaths = domain.FTP_PATH ? String(domain.FTP_PATH).split(":") : [];
        ftpUsers.forEach((ftpUser: string, index: number) => {
          allFtp.push({
            ftpUser,
            domain: domain.domain,
            user: user.username,
            path: ftpPaths[index] || "",
          });
        });
      }
    } catch {}
  }
  return allFtp;
}

export async function addFtpAccount(user: string, domain: string, ftpUser: string, password: string) {
  await hestiaActionCommand("v-add-web-domain-ftp", user, domain, ftpUser, password);
  return { success: true };
}

export async function deleteFtpAccount(user: string, domain: string, ftpUser: string) {
  await hestiaActionCommand("v-delete-web-domain-ftp", user, domain, ftpUser);
  return { success: true };
}

export async function changeFtpPassword(user: string, domain: string, ftpUser: string, password: string) {
  await hestiaActionCommand("v-change-web-domain-ftp-password", user, domain, ftpUser, password);
  return { success: true };
}

// === DOMAIN TEMPLATES ===
export async function listBackendTemplates(): Promise<string[]> {
  const data = await hestiaCommand("v-list-web-templates-backend", "json");
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) return Object.keys(data);
  return [];
}

export async function listWebTemplates(): Promise<string[]> {
  const data = await hestiaCommand("v-list-web-templates", "json");
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) return Object.keys(data);
  return [];
}

export async function listProxyTemplates(): Promise<string[]> {
  const data = await hestiaCommand("v-list-web-templates-proxy", "json");
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data !== null) return Object.keys(data);
  return [];
}

export async function changeBackendTemplate(user: string, domain: string, template: string) {
  await hestiaActionCommand("v-change-web-domain-backend-tpl", user, domain, template);
  return { success: true };
}

export async function changeWebTemplate(user: string, domain: string, template: string) {
  await hestiaActionCommand("v-change-web-domain-tpl", user, domain, template);
  return { success: true };
}

export async function changeProxyTemplate(user: string, domain: string, template: string) {
  await hestiaActionCommand("v-change-web-domain-proxy-tpl", user, domain, template);
  return { success: true };
}

// === DOMAIN ALIASES ===
export async function addDomainAlias(user: string, domain: string, alias: string) {
  await hestiaActionCommand("v-add-web-domain-alias", user, domain, alias);
  return { success: true };
}

export async function deleteDomainAlias(user: string, domain: string, alias: string) {
  await hestiaActionCommand("v-delete-web-domain-alias", user, domain, alias);
  return { success: true };
}

// === DOMAIN REDIRECTS ===
export async function addDomainRedirect(user: string, domain: string, redirect: string, httpCode?: string) {
  const args = [user, domain, redirect];
  if (httpCode) args.push(httpCode);
  await hestiaActionCommand("v-add-web-domain-redirect", ...args);
  return { success: true };
}

export async function deleteDomainRedirect(user: string, domain: string, redirectId: string) {
  await hestiaActionCommand("v-delete-web-domain-redirect", user, domain, redirectId);
  return { success: true };
}

// === SUSPEND/UNSUSPEND DOMAIN ===
export async function suspendDomain(user: string, domain: string) {
  await hestiaActionCommand("v-suspend-web-domain", user, domain);
  return { success: true };
}

export async function unsuspendDomain(user: string, domain: string) {
  await hestiaActionCommand("v-unsuspend-web-domain", user, domain);
  return { success: true };
}

// === HTTP AUTH ===
export async function addHttpAuth(user: string, domain: string, authUser: string, password: string) {
  await hestiaActionCommand("v-add-web-domain-httpauth", user, domain, authUser, password);
  return { success: true };
}

export async function deleteHttpAuth(user: string, domain: string, authUser: string) {
  await hestiaActionCommand("v-delete-web-domain-httpauth", user, domain, authUser);
  return { success: true };
}

export async function listHttpAuth(user: string, domain: string) {
  const data = await hestiaCommand("v-list-web-domain-httpauth", user, domain, "json");
  if (typeof data !== "object" || data === null || Array.isArray(data)) return [];
  return Object.entries(data).map(([authUser, info]: [string, any]) => ({
    authUser,
    ...info,
  }));
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
