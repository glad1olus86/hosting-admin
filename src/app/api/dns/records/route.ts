import { NextRequest, NextResponse } from "next/server";
import {
  listDnsRecords,
  addDnsRecord,
  deleteDnsRecord,
  editDnsRecord,
} from "@/lib/hestia-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const domain = searchParams.get("domain");
    if (!user || !domain) {
      return NextResponse.json({ error: "User and domain are required" }, { status: 400 });
    }
    const records = await listDnsRecords(user, domain);
    return NextResponse.json(records);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, record, type, value, priority, ttl } = body;
    if (!user || !domain || !record || !type || !value) {
      return NextResponse.json({ error: "User, domain, record, type, and value are required" }, { status: 400 });
    }
    await addDnsRecord(user, domain, record, type, value, priority, ttl);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Edit a DNS record (delete old + add new)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, id, record, type, value, priority, ttl } = body;
    if (!user || !domain || !id || !record || !type || !value) {
      return NextResponse.json({ error: "User, domain, id, record, type, and value are required" }, { status: 400 });
    }
    await editDnsRecord(user, domain, id, record, type, value, priority, ttl);
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
    const id = searchParams.get("id");
    if (!user || !domain || !id) {
      return NextResponse.json({ error: "User, domain, and id are required" }, { status: 400 });
    }
    await deleteDnsRecord(user, domain, id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
