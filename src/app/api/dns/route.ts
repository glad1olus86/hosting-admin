import { NextResponse } from "next/server";
import { listAllDnsDomains } from "@/lib/hestia-api";

export async function GET() {
  try {
    const domains = await listAllDnsDomains();
    return NextResponse.json(domains);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
