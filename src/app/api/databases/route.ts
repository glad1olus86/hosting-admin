import { NextRequest, NextResponse } from "next/server";
import {
  listAllDatabases,
  addDatabase,
  deleteDatabase,
} from "@/lib/hestia-api";

export async function GET() {
  try {
    const databases = await listAllDatabases();
    return NextResponse.json(databases);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, db_name, db_user, db_password, type } = body;
    if (!user || !db_name || !db_user || !db_password) {
      return NextResponse.json(
        { error: "Missing required fields: user, db_name, db_user, db_password" },
        { status: 400 }
      );
    }
    const result = await addDatabase(user, db_name, db_user, db_password, type || "mysql");
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const result = await deleteDatabase(user, db_name);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
