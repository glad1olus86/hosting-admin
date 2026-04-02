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
import { execAsRoot } from "@/lib/ssh-client";
import { logAction } from "@/lib/audit";

const HIDDEN_DOMAINS = ["host.lamapixel.com", "system.lamapixel.com"];

function validateDomainAgainstPattern(domain: string, pattern: string): boolean {
  const parts = pattern.split("%edit%");
  if (parts.length !== 2) return false;
  const [prefix, suffix] = parts;
  if (!domain.startsWith(prefix) || !domain.endsWith(suffix)) return false;
  const middle = domain.slice(prefix.length, domain.length - suffix.length);
  return middle.length > 0 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(middle);
}

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const domains = await listAllDomains();
    const visible = domains.filter((d: any) => !HIDDEN_DOMAINS.includes(d.domain));
    const filtered = filterByUser(visible, auth.allowedUsernames);

    // Fix 0 MB disk usage for domains where HestiaCP hasn't calculated yet
    const zeroDisk = filtered.filter((d: any) => d.U_DISK === "0" || d.U_DISK === 0);
    if (zeroDisk.length > 0) {
      try {
        const paths = zeroDisk.map((d: any) => `/home/${d.user}/web/${d.domain}/`).join(" ");
        const duResult = await execAsRoot(`du -sm ${paths} 2>/dev/null`);
        const sizeMap: Record<string, string> = {};
        for (const line of duResult.stdout.split("\n")) {
          const match = line.match(/(\d+)\s+\/home\/\w+\/web\/([^/]+)\//);
          if (match) sizeMap[match[2]] = match[1];
        }
        for (const d of filtered) {
          if ((d.U_DISK === "0" || d.U_DISK === 0) && sizeMap[d.domain]) {
            d.U_DISK = sizeMap[d.domain];
          }
        }
      } catch {
        // Non-critical, keep HestiaCP values
      }
    }

    return NextResponse.json(filtered);
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
    // Enforce domain pattern for non-admin users
    if (auth.user.domainPattern && auth.user.role !== "admin") {
      if (!validateDomainAgainstPattern(domain, auth.user.domainPattern)) {
        const display = auth.user.domainPattern.replace("%edit%", "*");
        return NextResponse.json(
          { error: `Domain does not match allowed pattern: ${display}` },
          { status: 403 }
        );
      }
    }
    if (mail === false) {
      await addWebDomainOnly(user, domain, ip || undefined);
    } else {
      // Default: create web + mail + DNS (v-add-domain)
      await addDomain(user, domain, ip || undefined);
    }
    logAction(request, auth.user, "domain.create", domain);
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
      logAction(request, auth.user, "domain.ssl.revoke", domain);
    } else {
      await addLetsEncrypt(user, domain);
      logAction(request, auth.user, "domain.ssl.add", domain);
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
    logAction(request, auth.user, "domain.delete", domain);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
