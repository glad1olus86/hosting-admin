import { NextRequest, NextResponse } from "next/server";
import {
  listAllMailDomains,
  addMailDomain,
  deleteMailDomain,
  toggleMailDkim,
  toggleMailAntivirus,
  toggleMailAntispam,
  setMailCatchall,
  removeMailCatchall,
  addLetsEncryptMail,
} from "@/lib/hestia-api";
import { requireAuth, isNextResponse, filterByUser, canAccessUser } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const domains = await listAllMailDomains();
    return NextResponse.json(filterByUser(domains, auth.allowedUsernames));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, domain } = body;
    if (!user || !domain) {
      return NextResponse.json({ error: "User and domain are required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await addMailDomain(user, domain);
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
    const { user, domain, action, value } = body;
    if (!user || !domain || !action) {
      return NextResponse.json({ error: "User, domain, and action are required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (action) {
      case "dkim":
        await toggleMailDkim(user, domain, !!value);
        break;
      case "antivirus":
        await toggleMailAntivirus(user, domain, !!value);
        break;
      case "antispam":
        await toggleMailAntispam(user, domain, !!value);
        break;
      case "catchall":
        if (value) {
          await setMailCatchall(user, domain, value);
        } else {
          await removeMailCatchall(user, domain);
        }
        break;
      case "ssl":
        await addLetsEncryptMail(user, domain);
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
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const domain = searchParams.get("domain");
    if (!user || !domain) {
      return NextResponse.json({ error: "User and domain are required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteMailDomain(user, domain);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
