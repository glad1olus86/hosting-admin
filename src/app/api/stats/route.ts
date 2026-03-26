import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/hestia-api";

export async function GET() {
  try {
    const stats = await getSystemStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
