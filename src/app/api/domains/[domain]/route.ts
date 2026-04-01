import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isNextResponse, canAccessUser } from "@/lib/auth-guard";
import { execAsRoot } from "@/lib/ssh-client";
import {
  listDomains,
  changeBackendTemplate,
  changeWebTemplate,
  changeProxyTemplate,
  addDomainAlias,
  deleteDomainAlias,
  addDomainRedirect,
  deleteDomainRedirect,
  suspendDomain,
  unsuspendDomain,
  addHttpAuth,
  deleteHttpAuth,
  listHttpAuth,
  addLetsEncrypt,
} from "@/lib/hestia-api";

const HIDDEN_DOMAINS = ["host.lamapixel.com", "system.lamapixel.com"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { domain } = await params;

  if (HIDDEN_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "This domain is protected" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const user = searchParams.get("user");

  if (!user) {
    return NextResponse.json({ error: "User parameter required" }, { status: 400 });
  }
  if (!canAccessUser(auth.allowedUsernames, user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const domains = await listDomains(user);
    const domainData = domains.find((d: any) => d.domain === domain);

    if (!domainData) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    // Fetch HTTP auth users
    let httpAuthUsers: any[] = [];
    try {
      httpAuthUsers = await listHttpAuth(user, domain);
    } catch {
      // Non-critical
    }

    // If HestiaCP reports 0 disk (not yet calculated), get real size via du
    if (domainData.U_DISK === "0" || domainData.U_DISK === 0) {
      try {
        const duResult = await execAsRoot(
          `du -sm /home/${user}/web/${domain}/ 2>/dev/null | awk '{print $1}'`
        );
        const size = duResult.stdout.match(/(\d+)/);
        if (size) domainData.U_DISK = size[1];
      } catch {
        // Non-critical, keep HestiaCP value
      }
    }

    return NextResponse.json({ ...domainData, httpAuthUsers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch domain details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  const { domain } = await params;

  if (HIDDEN_DOMAINS.includes(domain)) {
    return NextResponse.json({ error: "This domain is protected" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { user, action, ...actionParams } = body;

    if (!user || !action) {
      return NextResponse.json(
        { error: "User and action required" },
        { status: 400 }
      );
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    switch (action) {
      case "change-backend":
        await changeBackendTemplate(user, domain, actionParams.template);
        break;
      case "change-web-tpl":
        await changeWebTemplate(user, domain, actionParams.template);
        break;
      case "change-proxy-tpl":
        await changeProxyTemplate(user, domain, actionParams.template);
        break;
      case "suspend":
        await suspendDomain(user, domain);
        break;
      case "unsuspend":
        await unsuspendDomain(user, domain);
        break;
      case "add-alias":
        await addDomainAlias(user, domain, actionParams.alias);
        break;
      case "delete-alias":
        await deleteDomainAlias(user, domain, actionParams.alias);
        break;
      case "add-redirect":
        await addDomainRedirect(user, domain, actionParams.url, actionParams.code);
        break;
      case "delete-redirect":
        await deleteDomainRedirect(user, domain, actionParams.redirectId);
        break;
      case "add-httpauth":
        await addHttpAuth(user, domain, actionParams.authUser, actionParams.password);
        break;
      case "delete-httpauth":
        await deleteHttpAuth(user, domain, actionParams.authUser);
        break;
      case "request-ssl":
        await addLetsEncrypt(user, domain);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Action failed" },
      { status: 500 }
    );
  }
}
