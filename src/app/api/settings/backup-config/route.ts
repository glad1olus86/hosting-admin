import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { hestiaCommand } from "@/lib/hestia-api";

// GET — read backup configuration from HestiaCP
export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const data = await hestiaCommand("v-list-sys-config", "json");

    const config = data?.config || data || {};

    return NextResponse.json({
      backupDir: config.BACKUP || "/backup",
      backups: config.BACKUPS || "3",
      backupMode: config.BACKUP_MODE || "gzip",
      backupSystem: config.BACKUP_SYSTEM || "",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to read backup config" },
      { status: 500 }
    );
  }
}

// POST — update backup configuration
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "key and value are required" },
        { status: 400 }
      );
    }

    const allowedKeys = ["BACKUPS", "BACKUP_MODE"];
    if (!allowedKeys.includes(key)) {
      return NextResponse.json(
        { error: `Key not allowed. Allowed: ${allowedKeys.join(", ")}` },
        { status: 400 }
      );
    }

    await hestiaCommand("v-change-sys-config-value", key, value);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update backup config" },
      { status: 500 }
    );
  }
}
