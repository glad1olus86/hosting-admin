import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/hestia-api";
import { requireAuth, isNextResponse } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const stats = await getSystemStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
