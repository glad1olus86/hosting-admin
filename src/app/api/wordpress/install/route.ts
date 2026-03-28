import { NextRequest, NextResponse } from "next/server";
import { installWordPress } from "@/lib/wordpress-installer";
import { requireAuth, isNextResponse, canAccessUser } from "@/lib/auth-guard";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const { user, domain, admin_user, admin_password, admin_email, plugins } = body;

    if (!user || !domain || !admin_user || !admin_password || !admin_email) {
      return NextResponse.json(
        { error: "Missing required fields: user, domain, admin_user, admin_password, admin_email" },
        { status: 400 }
      );
    }
    if (!canAccessUser(auth.allowedUsernames, user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobId = crypto.randomUUID();

    installWordPress(jobId, {
      user,
      domain,
      admin_user,
      admin_password,
      admin_email,
      plugins: plugins || [],
    });

    return NextResponse.json({ jobId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
