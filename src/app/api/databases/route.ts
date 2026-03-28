import { NextRequest, NextResponse } from "next/server";
import {
  listAllDatabases,
  addDatabase,
  deleteDatabase,
  changeDatabasePassword,
  suspendDatabase,
  unsuspendDatabase,
} from "@/lib/hestia-api";
import { requireAuth, isNextResponse, filterByUser, canAccessUser } from "@/lib/auth-guard";

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
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
