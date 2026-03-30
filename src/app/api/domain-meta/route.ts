import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";

// GET — return all domain metadata
export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const metas = await prisma.domainMeta.findMany();
    // Return as a map: { "example.com": { expirationDate, comment } }
    const map: Record<string, { expirationDate: string | null; comment: string | null }> = {};
    for (const m of metas) {
      map[m.domain] = {
        expirationDate: m.expirationDate ? m.expirationDate.toISOString().split("T")[0] : null,
        comment: m.comment,
      };
    }
    return NextResponse.json(map);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — upsert expirationDate / comment for a domain
export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  // Only admins can edit domain meta
  if (auth.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { domain, expirationDate, comment } = body;

    if (!domain) {
      return NextResponse.json({ error: "Domain is required" }, { status: 400 });
    }

    const data: { expirationDate?: Date | null; comment?: string | null } = {};
    if (expirationDate !== undefined) {
      data.expirationDate = expirationDate ? new Date(expirationDate) : null;
    }
    if (comment !== undefined) {
      data.comment = comment || null;
    }

    await prisma.domainMeta.upsert({
      where: { domain },
      create: { domain, ...data },
      update: data,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
