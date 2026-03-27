import { NextRequest, NextResponse } from "next/server";
import { installWordPress } from "@/lib/wordpress-installer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user, domain, admin_user, admin_password, admin_email, plugins } = body;

    if (!user || !domain || !admin_user || !admin_password || !admin_email) {
      return NextResponse.json(
        { error: "Missing required fields: user, domain, admin_user, admin_password, admin_email" },
        { status: 400 }
      );
    }

    const jobId = crypto.randomUUID();

    // Fire and forget — don't await
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
