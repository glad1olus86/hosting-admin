import { NextResponse } from "next/server";
import { listPackages } from "@/lib/hestia-api";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const packages = await listPackages();
    return NextResponse.json(packages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
