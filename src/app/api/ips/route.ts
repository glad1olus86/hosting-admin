import { NextResponse } from "next/server";
import { listSystemIps } from "@/lib/hestia-api";

export async function GET() {
  try {
    const data = await listSystemIps();
    // data is { "116.202.219.165": { OWNER, STATUS, NAME, ... }, ... }
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
