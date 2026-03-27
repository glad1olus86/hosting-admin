import { NextRequest, NextResponse } from "next/server";
import { listAllDnsDomains, deleteDnsDomain } from "@/lib/hestia-api";

export async function GET() {
  try {
    const domains = await listAllDnsDomains();
    return NextResponse.json(domains);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const domain = searchParams.get("domain");
    if (!user || !domain) {
      return NextResponse.json(
        { error: "Both user and domain are required" },
        { status: 400 }
      );
    }
    await deleteDnsDomain(user, domain);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
