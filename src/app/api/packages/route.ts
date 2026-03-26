import { NextResponse } from "next/server";
import { listPackages } from "@/lib/hestia-api";

export async function GET() {
  try {
    const packages = await listPackages();
    return NextResponse.json(packages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
