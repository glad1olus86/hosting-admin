import { NextRequest, NextResponse } from "next/server";
import { uploadToTemp, cleanupTemp } from "@/lib/ssh-client";
import { copyFile } from "@/lib/hestia-api";

export async function POST(request: NextRequest) {
  let tmpPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const user = formData.get("user") as string | null;
    const path = formData.get("path") as string | null;

    if (!file || !user || !path) {
      return NextResponse.json(
        { error: "file, user, and path are required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const remotePath = `${path}/${file.name}`;

    // 1. Upload to /tmp via SFTP
    tmpPath = await uploadToTemp(buffer, file.name);

    // 2. Copy from /tmp to target via HestiaCP API (runs as target user)
    await copyFile(user, tmpPath, remotePath);

    // 3. Cleanup temp file
    cleanupTemp(tmpPath).catch(() => {}); // fire and forget

    return NextResponse.json({ success: true, path: remotePath });
  } catch (error: any) {
    console.error("[Upload] Error:", error.message);
    // Cleanup on error
    if (tmpPath) cleanupTemp(tmpPath).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
