import { NextResponse } from "next/server";
import { listServices } from "@/lib/hestia-api";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const services = await listServices();
    return NextResponse.json(services);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
