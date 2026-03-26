import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/hestia-api";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const path = searchParams.get("path");

    if (!user || !path) {
      return NextResponse.json({ error: "user and path required" }, { status: 400 });
    }

    const content = await readFile(user, path);
    return NextResponse.json({ content: typeof content === "string" ? content : JSON.stringify(content) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
