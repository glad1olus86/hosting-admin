import { NextRequest, NextResponse } from "next/server";
import {
  listUsers,
  addUser,
  deleteUser,
  suspendUser,
  unsuspendUser,
} from "@/lib/hestia-api";
import { requireAuth, requireAdmin, isNextResponse } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const users = await listUsers();
    // Non-admin: only show their linked users
    if (auth.allowedUsernames !== null) {
      return NextResponse.json(
        users.filter((u: any) => auth.allowedUsernames!.includes(u.username))
      );
    }
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { username, password, email, package_name } = body;
    const result = await addUser(username, password, email, package_name);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    if (!username)
      return NextResponse.json({ error: "Username required" }, { status: 400 });
    const result = await deleteUser(username);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { username, action } = body;
    if (action === "suspend") {
      await suspendUser(username);
    } else if (action === "unsuspend") {
      await unsuspendUser(username);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
