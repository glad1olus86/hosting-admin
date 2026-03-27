import { NextRequest, NextResponse } from "next/server";
import { readFileBuffer } from "@/lib/hestia-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const path = searchParams.get("path");

    if (!user || !path) {
      return NextResponse.json({ error: "user and path required" }, { status: 400 });
    }

    const buffer = await readFileBuffer(user, path);
    const filename = path.split("/").pop() || "download";

    return new NextResponse(buffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
