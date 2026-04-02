import { NextRequest, NextResponse } from "next/server";
import {
  listAllDatabases,
  addDatabase,
  deleteDatabase,
  changeDatabasePassword,
  suspendDatabase,
  unsuspendDatabase,
  listAllDomains,
} from "@/lib/hestia-api";
import { requireAuth, isNextResponse, filterByUser, canAccessUser } from "@/lib/auth-guard";
import { execAsRoot } from "@/lib/ssh-client";
import { logAction } from "@/lib/audit";

// Update wp-config.php DB_PASSWORD in all domains of a user where this DB is used
async function updateWpConfigs(user: string, dbName: string, newPassword: string) {
  try {
    // Find all wp-config.php files for this user that reference this database
    const escaped = newPassword.replace(/'/g, "'\\''");
    const fullDbName = dbName.includes("_") ? dbName : `${user}_${dbName}`;
    // Search all domains for wp-config.php that uses this DB
    const findResult = await execAsRoot(
      `grep -rl "define.*DB_NAME.*${fullDbName}" /home/${user}/web/*/public_html/wp-config.php 2>/dev/null || true`
    );
    const files = findResult.stdout.trim().split("\n").filter(Boolean);
    for (const file of files) {
      await execAsRoot(
        `sed -i "s/define(\\s*'DB_PASSWORD'\\s*,\\s*'[^']*'/define('DB_PASSWORD', '${escaped}'/" ${file}`
      );
    }
  } catch {
    // Non-critical — don't fail the password change
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const databases = await listAllDatabases();
    return NextResponse.json(filterByUser(databases, auth.allowedUsernames));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, db_name, db_user, db_password, type } = body;
    if (!user || !db_name || !db_user || !db_password) {
      return NextResponse.json(
        { error: "Missing required fields: user, db_name, db_user, db_password" },
        { status: 400 }
      );
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await addDatabase(user, db_name, db_user, db_password, type || "mysql");
    logAction(request, auth.user, "database.create", db_name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, db_name, action, password } = body;
    if (!user || !db_name || !action) {
      return NextResponse.json(
        { error: "Missing required fields: user, db_name, action" },
        { status: 400 }
      );
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (action) {
      case "change_password":
        if (!password) {
          return NextResponse.json({ error: "Password is required" }, { status: 400 });
        }
        await changeDatabasePassword(user, db_name, password);
        // Auto-update wp-config.php if WordPress uses this DB
        await updateWpConfigs(user, db_name, password);
        break;
      case "suspend":
        await suspendDatabase(user, db_name);
        break;
      case "unsuspend":
        await unsuspendDatabase(user, db_name);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    logAction(request, auth.user, `database.${action}`, db_name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const db_name = searchParams.get("db_name");
    if (!user || !db_name) {
      return NextResponse.json(
        { error: "Both user and db_name are required" },
        { status: 400 }
      );
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteDatabase(user, db_name);
    logAction(request, auth.user, "database.delete", db_name);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
