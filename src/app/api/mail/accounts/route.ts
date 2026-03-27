import { NextRequest, NextResponse } from "next/server";
import {
  listMailAccounts,
  addMailAccount,
  deleteMailAccount,
  changeMailAccountPassword,
  changeMailAccountQuota,
  suspendMailAccount,
  unsuspendMailAccount,
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

// Change account settings (password, quota, suspend/unsuspend)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, account, action, value } = body;
    if (!user || !domain || !account || !action) {
      return NextResponse.json(
        { error: "User, domain, account, and action are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "password":
        if (!value) return NextResponse.json({ error: "Password is required" }, { status: 400 });
        await changeMailAccountPassword(user, domain, account, value);
        break;
      case "quota":
        await changeMailAccountQuota(user, domain, account, value || "unlimited");
        break;
      case "suspend":
        await suspendMailAccount(user, domain, account);
        break;
      case "unsuspend":
        await unsuspendMailAccount(user, domain, account);
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
