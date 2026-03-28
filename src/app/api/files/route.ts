import { NextRequest, NextResponse } from "next/server";
import { listDirectory, createDirectory, deleteFile, deleteDirectory, listUsers } from "@/lib/hestia-api";
import { requireAuth, isNextResponse, canAccessUser } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const path = searchParams.get("path") || "/home";

    if (!user) {
      // Return list of users for selection (filtered by access)
      const users = await listUsers();
      const filtered =
        auth.allowedUsernames === null
          ? users
          : users.filter((u: any) => auth.allowedUsernames!.includes(u.username));
      return NextResponse.json({ type: "users", data: filtered });
    }

    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const files = await listDirectory(user, path);
    return NextResponse.json({ type: "files", path, user, data: files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, path, action } = body;

    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "mkdir") {
      await createDirectory(user, path);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
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
    const path = searchParams.get("path");
    const type = searchParams.get("type");

    if (!user || !path) {
      return NextResponse.json({ error: "user and path required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (type === "dir") {
      await deleteDirectory(user, path);
    } else {
      await deleteFile(user, path);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
