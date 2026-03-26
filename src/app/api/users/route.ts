import { NextRequest, NextResponse } from "next/server";
import {
  listUsers,
  addUser,
  deleteUser,
  suspendUser,
  unsuspendUser,
} from "@/lib/hestia-api";

export async function GET() {
  try {
    const users = await listUsers();
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    if (!username)
      return NextResponse.json(
        { error: "Username required" },
        { status: 400 }
      );
    const result = await deleteUser(username);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
