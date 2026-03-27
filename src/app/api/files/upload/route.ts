import { NextRequest, NextResponse } from "next/server";
import { uploadBuffer } from "@/lib/ssh-client";

export async function POST(request: NextRequest) {
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

    await uploadBuffer(buffer, remotePath, user);

    return NextResponse.json({ success: true, path: remotePath });
  } catch (error: any) {
    console.error("[Upload] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
