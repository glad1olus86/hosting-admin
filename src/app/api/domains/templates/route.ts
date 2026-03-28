import { NextResponse } from "next/server";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";
import {
  listBackendTemplates,
  listWebTemplates,
  listProxyTemplates,
} from "@/lib/hestia-api";

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const [backend, web, proxy] = await Promise.all([
      listBackendTemplates(),
      listWebTemplates(),
      listProxyTemplates(),
    ]);

    return NextResponse.json({ backend, web, proxy });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
