import { NextRequest, NextResponse } from "next/server";
import {
  listAllDomains,
  addDomain,
  addWebDomainOnly,
  deleteDomain,
  addLetsEncrypt,
  deleteLetsEncrypt,
} from "@/lib/hestia-api";
import { requireAuth, isNextResponse, filterByUser, canAccessUser } from "@/lib/auth-guard";

const HIDDEN_DOMAINS = ["host.lamapixel.com", "system.lamapixel.com"];

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const domains = await listAllDomains();
    const visible = domains.filter((d: any) => !HIDDEN_DOMAINS.includes(d.domain));
    return NextResponse.json(filterByUser(visible, auth.allowedUsernames));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, domain, ip, mail } = body;
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (mail === false) {
      await addWebDomainOnly(user, domain, ip || undefined);
    } else {
      // Default: create web + mail + DNS (v-add-domain)
      await addDomain(user, domain, ip || undefined);
    }
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
    const { user, domain, action } = body;
    if (!user || !domain) {
      return NextResponse.json({ error: "User and domain required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (HIDDEN_DOMAINS.includes(domain)) {
      return NextResponse.json({ error: "This domain is protected" }, { status: 403 });
    }
    if (action === "revoke-ssl") {
      await deleteLetsEncrypt(user, domain);
    } else {
      await addLetsEncrypt(user, domain);
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
    if (!user || !domain)
      return NextResponse.json({ error: "User and domain required" }, { status: 400 });
    if (HIDDEN_DOMAINS.includes(domain)) {
      return NextResponse.json({ error: "This domain is protected" }, { status: 403 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await deleteDomain(user, domain);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
