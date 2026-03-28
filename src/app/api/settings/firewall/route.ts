import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { hestiaCommand, hestiaActionCommand } from "@/lib/hestia-api";

// GET — list firewall rules
export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const data = await hestiaCommand("v-list-firewall", "json");

    // HestiaCP returns object keyed by rule ID
    const rules = Object.entries(data || {}).map(([id, rule]: [string, any]) => ({
      id,
      action: rule.ACTION || "",
      protocol: rule.PROTOCOL || "",
      port: rule.PORT || "",
      ip: rule.IP || "",
      comment: rule.COMMENT || "",
      suspended: rule.SUSPENDED || "no",
    }));

    return NextResponse.json(rules);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to list firewall rules" },
      { status: 500 }
    );
  }
}

// POST — add firewall rule
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { action, protocol, port, ip, comment } = await request.json();

    if (!action || !protocol || !port) {
      return NextResponse.json(
        { error: "action, protocol, and port are required" },
        { status: 400 }
      );
    }

    if (!["ACCEPT", "DROP"].includes(action)) {
      return NextResponse.json(
        { error: "action must be ACCEPT or DROP" },
        { status: 400 }
      );
    }

    if (!["TCP", "UDP", "ICMP"].includes(protocol)) {
      return NextResponse.json(
        { error: "protocol must be TCP, UDP, or ICMP" },
        { status: 400 }
      );
    }

    await hestiaActionCommand(
      "v-add-firewall-rule",
      action,
      ip || "0.0.0.0/0",
      port,
      protocol,
      comment || ""
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to add firewall rule" },
      { status: 500 }
    );
  }
}

// DELETE — delete firewall rule
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Rule ID is required" },
        { status: 400 }
      );
    }

    await hestiaActionCommand("v-delete-firewall-rule", id);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete firewall rule" },
      { status: 500 }
    );
  }
}
