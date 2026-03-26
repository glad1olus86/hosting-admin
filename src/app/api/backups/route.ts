import { NextRequest, NextResponse } from "next/server";
import {
  listAllBackups,
  createBackup,
  restoreBackup,
  deleteBackup,
} from "@/lib/hestia-api";

export async function GET() {
  try {
    const backups = await listAllBackups();
    return NextResponse.json(backups);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user } = body;
    if (!user) {
      return NextResponse.json(
        { error: "Missing required field: user" },
        { status: 400 }
      );
    }
    const result = await createBackup(user);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, backup } = body;
    if (!user || !backup) {
      return NextResponse.json(
        { error: "Both user and backup are required" },
        { status: 400 }
      );
    }
    const result = await restoreBackup(user, backup);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const backup = searchParams.get("backup");
    if (!user || !backup) {
      return NextResponse.json(
        { error: "Both user and backup are required" },
        { status: 400 }
      );
    }
    const result = await deleteBackup(user, backup);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
