import { NextRequest, NextResponse } from "next/server";
import {
  listAllFtpAccounts,
  addFtpAccount,
  deleteFtpAccount,
  changeFtpPassword,
} from "@/lib/hestia-api";
import { requireAuth, isNextResponse, filterByUser, canAccessUser } from "@/lib/auth-guard";
import { logAction } from "@/lib/audit";

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const accounts = await listAllFtpAccounts();
    return NextResponse.json(filterByUser(accounts, auth.allowedUsernames));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, domain, ftp_user, password } = body;
    if (!user || !domain || !ftp_user || !password) {
      return NextResponse.json({ error: "Missing required fields: user, domain, ftp_user, password" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await addFtpAccount(user, domain, ftp_user, password);
    logAction(request, auth.user, "ftp.create", ftp_user);
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
    const { user, domain, ftp_user, password } = body;
    if (!user || !domain || !ftp_user || !password) {
      return NextResponse.json({ error: "Missing required fields: user, domain, ftp_user, password" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await changeFtpPassword(user, domain, ftp_user, password);
    logAction(request, auth.user, "ftp.change_password", ftp_user);
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
    const domain = searchParams.get("domain");
    const ftp_user = searchParams.get("ftp_user");
    if (!user || !domain || !ftp_user) {
      return NextResponse.json({ error: "user, domain, and ftp_user are required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteFtpAccount(user, domain, ftp_user);
    logAction(request, auth.user, "ftp.delete", ftp_user);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
