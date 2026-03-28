import { NextResponse } from "next/server";
import { listSystemIps } from "@/lib/hestia-api";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const data = await listSystemIps();
    const ips = Object.entries(data).map(([ip, info]: [string, any]) => ({
      ip,
      name: info.NAME || "",
      status: info.STATUS || "",
      domains: parseInt(info.U_WEB_DOMAINS) || 0,
    }));
    return NextResponse.json(ips);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
