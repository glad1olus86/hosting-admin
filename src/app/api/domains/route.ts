import { NextRequest, NextResponse } from "next/server";
import {
  listAllDomains,
  addDomain,
  deleteDomain,
  addLetsEncrypt,
} from "@/lib/hestia-api";

export async function GET() {
  try {
    const domains = await listAllDomains();
    return NextResponse.json(domains);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, ssl } = body;
    await addDomain(user, domain);
    if (ssl) {
      await addLetsEncrypt(user, domain);
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const domain = searchParams.get("domain");
    if (!user || !domain)
      return NextResponse.json(
        { error: "User and domain required" },
        { status: 400 }
      );
    await deleteDomain(user, domain);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
