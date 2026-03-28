import { NextRequest, NextResponse } from "next/server";
import { uploadToTemp, cleanupTemp } from "@/lib/ssh-client";
import { copyFile } from "@/lib/hestia-api";
import { requireAuth, isNextResponse, canAccessUser } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

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
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const remotePath = `${path}/${file.name}`;

    tmpPath = await uploadToTemp(buffer, file.name);
    await copyFile(user, tmpPath, remotePath);
    cleanupTemp(tmpPath).catch(() => {});

    return NextResponse.json({ success: true, path: remotePath });
  } catch (error: any) {
    console.error("[Upload] Error:", error.message);
    if (tmpPath) cleanupTemp(tmpPath).catch(() => {});
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
