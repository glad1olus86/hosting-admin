import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createJWT, createSession } from "@/lib/auth";
import { logLogin } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.dashboardAccount.findUnique({
      where: { username },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (user.suspended) {
      return NextResponse.json(
        { error: "Account is suspended" },
        { status: 403 }
      );
    }

    const token = await createJWT({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    await createSession(token);

    logLogin(request, { id: user.id, username: user.username });

    return NextResponse.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
