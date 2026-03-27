import { NextRequest, NextResponse } from "next/server";
import {
  listAllFtpAccounts,
  addFtpAccount,
  deleteFtpAccount,
  changeFtpPassword,
} from "@/lib/hestia-api";

export async function GET() {
  try {
    const accounts = await listAllFtpAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, ftp_user, password } = body;
    if (!user || !domain || !ftp_user || !password) {
      return NextResponse.json(
        { error: "Missing required fields: user, domain, ftp_user, password" },
        { status: 400 }
      );
    }
    await addFtpAccount(user, domain, ftp_user, password);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, ftp_user, password } = body;
    if (!user || !domain || !ftp_user || !password) {
      return NextResponse.json(
        { error: "Missing required fields: user, domain, ftp_user, password" },
        { status: 400 }
      );
    }
    await changeFtpPassword(user, domain, ftp_user, password);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const domain = searchParams.get("domain");
    const ftp_user = searchParams.get("ftp_user");
    if (!user || !domain || !ftp_user) {
      return NextResponse.json(
        { error: "user, domain, and ftp_user are required" },
        { status: 400 }
      );
    }
    await deleteFtpAccount(user, domain, ftp_user);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
