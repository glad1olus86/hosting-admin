import { NextRequest, NextResponse } from "next/server";
import {
  listMailAccounts,
  addMailAccount,
  deleteMailAccount,
} from "@/lib/hestia-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const domain = searchParams.get("domain");
    if (!user || !domain) {
      return NextResponse.json(
        { error: "User and domain are required" },
        { status: 400 }
      );
    }
    const accounts = await listMailAccounts(user, domain);
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, account, password } = body;
    if (!user || !domain || !account || !password) {
      return NextResponse.json(
        { error: "User, domain, account, and password are required" },
        { status: 400 }
      );
    }
    await addMailAccount(user, domain, account, password);
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
    const account = searchParams.get("account");
    if (!user || !domain || !account) {
      return NextResponse.json(
        { error: "User, domain, and account are required" },
        { status: 400 }
      );
    }
    await deleteMailAccount(user, domain, account);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
