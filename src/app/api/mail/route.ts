import { NextRequest, NextResponse } from "next/server";
import {
  listAllMailDomains,
  addMailDomain,
  deleteMailDomain,
} from "@/lib/hestia-api";

export async function GET() {
  try {
    const domains = await listAllMailDomains();
    return NextResponse.json(domains);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain } = body;
    if (!user || !domain) {
      return NextResponse.json(
        { error: "User and domain are required" },
        { status: 400 }
      );
    }
    await addMailDomain(user, domain);
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
    if (!user || !domain) {
      return NextResponse.json(
        { error: "User and domain are required" },
        { status: 400 }
      );
    }
    await deleteMailDomain(user, domain);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
