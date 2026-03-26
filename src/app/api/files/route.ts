import { NextRequest, NextResponse } from "next/server";
import { listDirectory, createDirectory, deleteFile, deleteDirectory, listUsers } from "@/lib/hestia-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const path = searchParams.get("path") || "/home";

    if (!user) {
      // Return list of users for selection
      const users = await listUsers();
      return NextResponse.json({ type: "users", data: users });
    }

    const files = await listDirectory(user, path);
    return NextResponse.json({ type: "files", path, user, data: files });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, path, action } = body;

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
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const path = searchParams.get("path");
    const type = searchParams.get("type"); // "file" or "dir"

    if (!user || !path) {
      return NextResponse.json({ error: "user and path required" }, { status: 400 });
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
