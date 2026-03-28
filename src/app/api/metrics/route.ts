import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { collectMetrics } from "@/lib/metrics-collector";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const metrics = await collectMetrics();
    // Strip _raw from response
    const { _raw, ...rest } = metrics;
    return NextResponse.json(rest);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to collect metrics" },
      { status: 500 }
    );
  }
}
