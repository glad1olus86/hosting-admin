const HESTIA_HOST = process.env.HESTIA_HOST || "https://localhost:8083";
const HESTIA_USER = process.env.HESTIA_USER || "admin";
const HESTIA_PASSWORD = process.env.HESTIA_PASSWORD || "";

interface HestiaResponse {
  error?: number;
  data?: any;
}

async function hestiaCommand(cmd: string, ...args: string[]): Promise<any> {
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
    // Skip SSL verification for self-signed certs
    cache: "no-store",
  });

  const text = await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// === USERS ===
export async function listUsers() {
  const data = await hestiaCommand("v-list-users", "json");
  // Returns object where keys are usernames
  // Transform to array
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
  // v-list-sys-info returns system info
  return hestiaCommand("v-list-sys-info", "json");
}

export async function listPackages() {
  const data = await hestiaCommand("v-list-user-packages", "json");
  return Object.entries(data).map(([name, info]: [string, any]) => ({
    name,
    ...info,
  }));
}
