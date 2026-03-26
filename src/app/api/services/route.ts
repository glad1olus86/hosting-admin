import { NextResponse } from "next/server";
import { listServices } from "@/lib/hestia-api";

export async function GET() {
  try {
    const services = await listServices();
    return NextResponse.json(services);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
