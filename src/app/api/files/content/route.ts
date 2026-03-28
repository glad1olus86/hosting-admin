import { NextRequest, NextResponse } from "next/server";
import { readFile } from "@/lib/hestia-api";
import { requireAuth, isNextResponse, canAccessUser } from "@/lib/auth-guard";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user");
    const path = searchParams.get("path");

    if (!user || !path) {
      return NextResponse.json({ error: "user and path required" }, { status: 400 });
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const content = await readFile(user, path);
    return NextResponse.json({ content: typeof content === "string" ? content : JSON.stringify(content) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
