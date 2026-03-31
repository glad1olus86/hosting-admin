import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isNextResponse, canAccessUser } from "@/lib/auth-guard";
import { execAsUser, execAsRoot } from "@/lib/ssh-client";

// GET — check if WordPress is installed on this domain and return admin users
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");
  const domain = searchParams.get("domain");
  console.log(`[WP-Admin] GET user=${user} domain=${domain}`);
  if (!user || !domain) {
    return NextResponse.json({ error: "user and domain required" }, { status: 400 });
  }
  if (!canAccessUser(auth.allowedUsernames, user)) {
    console.log(`[WP-Admin] Forbidden: user=${user} not in allowedUsernames=${JSON.stringify(auth.allowedUsernames)}`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const path = `/home/${user}/web/${domain}/public_html`;
    const wpCliPath = `/home/${user}/.wp-cli/wp`;

    // Check if wp-config.php exists
    const check = await execAsUser(user, `test -f ${path}/wp-config.php && echo "yes" || echo "no"`);
    console.log(`[WP-Admin] wp-config check: stdout="${check.stdout.trim()}" code=${check.code}`);
    if (!check.stdout.includes("yes")) {
      return NextResponse.json({ installed: false });
    }

    // Check WP-CLI exists
    const cliCheck = await execAsUser(user, `test -f ${wpCliPath} && echo "yes" || echo "no"`);
    if (!cliCheck.stdout.includes("yes")) {
      // Install WP-CLI
      await execAsRoot(`/usr/local/hestia/bin/v-add-user-wp-cli ${user}`);
    }

    // Get admin users (role=administrator)
    const result = await execAsUser(
      user,
      `php ${wpCliPath} user list --role=administrator --fields=ID,user_login,user_email --format=json --path=${path} 2>/dev/null`
    );

    let admins: { ID: string; user_login: string; user_email: string }[] = [];
    try {
      // Filter out sudo password prompt lines and parse JSON
      const jsonLine = result.stdout.split("\n").find((l) => l.trim().startsWith("[{") || l.trim().startsWith("[]"));
      if (jsonLine) admins = JSON.parse(jsonLine.trim());
    } catch {}

    console.log(`[WP-Admin] Result: installed=true admins=${admins.length}`);
    return NextResponse.json({ installed: true, admins });
  } catch (error: any) {
    console.error(`[WP-Admin] Error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — change WP admin username or password
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, domain, wpUserId, newUsername, newPassword } = body;

    if (!user || !domain || !wpUserId) {
      return NextResponse.json({ error: "user, domain, wpUserId required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const path = `/home/${user}/web/${domain}/public_html`;
    const wpCliPath = `/home/${user}/.wp-cli/wp`;

    // Change password
    if (newPassword) {
      const escaped = newPassword.replace(/'/g, "'\\''");
      const res = await execAsUser(
        user,
        `php ${wpCliPath} user update ${wpUserId} --user_pass='${escaped}' --path=${path} 2>&1`
      );
      if (res.code !== 0 && !res.stdout.includes("Success")) {
        throw new Error(res.stdout.substring(0, 200) || "Failed to change password");
      }
    }

    // Change username (via direct DB query — WP-CLI doesn't support username change)
    if (newUsername) {
      const escaped = newUsername.replace(/'/g, "'\\''");
      // Get DB credentials from wp-config.php
      const dbInfo = await execAsUser(
        user,
        `grep -E "DB_(NAME|USER|PASSWORD|HOST)" ${path}/wp-config.php | head -4`
      );
      const dbName = dbInfo.stdout.match(/DB_NAME.*?'([^']+)'/)?.[1];
      const dbUser = dbInfo.stdout.match(/DB_USER.*?'([^']+)'/)?.[1];
      const dbPass = dbInfo.stdout.match(/DB_PASSWORD.*?'([^']+)'/)?.[1];
      const dbHost = dbInfo.stdout.match(/DB_HOST.*?'([^']+)'/)?.[1] || "localhost";

      if (!dbName || !dbUser || !dbPass) {
        throw new Error("Could not read database credentials from wp-config.php");
      }

      // Get table prefix
      const prefixRes = await execAsUser(
        user,
        `grep "table_prefix" ${path}/wp-config.php | head -1`
      );
      const prefix = prefixRes.stdout.match(/table_prefix\s*=\s*'([^']+)'/)?.[1] || "wp_";

      const dbPassEscaped = dbPass.replace(/'/g, "'\\''");
      const res = await execAsRoot(
        `mariadb -u '${dbUser}' -p'${dbPassEscaped}' -h '${dbHost}' '${dbName}' -e "UPDATE ${prefix}users SET user_login='${escaped}', user_nicename='${escaped}' WHERE ID=${wpUserId};"`
      );
      if (res.code !== 0) {
        throw new Error(res.stdout.substring(0, 200) || res.stderr.substring(0, 200) || "Failed to change username");
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
