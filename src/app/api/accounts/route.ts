import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";

// GET — list all dashboard accounts (admin only)
export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const accounts = await prisma.dashboardAccount.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      systemUsers: { select: { hestiaUsername: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    accounts.map((a) => ({
      ...a,
      linkedUsers: a.systemUsers.map((su) => su.hestiaUsername),
      systemUsers: undefined,
    }))
  );
}

// POST — create account + link users (admin only)
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { username, email, password, role, linkedUsers } =
      await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email and password are required" },
        { status: 400 }
      );
    }

    if (role && !["admin", "user"].includes(role)) {
      return NextResponse.json(
        { error: "Role must be admin or user" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const account = await prisma.dashboardAccount.create({
      data: {
        username,
        email,
        passwordHash,
        role: role || "user",
        systemUsers:
          linkedUsers && linkedUsers.length > 0
            ? {
                create: linkedUsers.map((u: string) => ({
                  hestiaUsername: u,
                })),
              }
            : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        systemUsers: { select: { hestiaUsername: true } },
      },
    });

    return NextResponse.json({
      ...account,
      linkedUsers: account.systemUsers.map((su) => su.hestiaUsername),
      systemUsers: undefined,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Username or email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH — update account (change role, reset password, update links)
export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { id, action, ...data } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: "id and action are required" },
        { status: 400 }
      );
    }

    switch (action) {
      case "change_role": {
        if (!["admin", "user"].includes(data.role)) {
          return NextResponse.json(
            { error: "Invalid role" },
            { status: 400 }
          );
        }
        await prisma.dashboardAccount.update({
          where: { id },
          data: { role: data.role },
        });
        break;
      }

      case "reset_password": {
        if (!data.password) {
          return NextResponse.json(
            { error: "Password required" },
            { status: 400 }
          );
        }
        const hash = await hashPassword(data.password);
        await prisma.dashboardAccount.update({
          where: { id },
          data: { passwordHash: hash },
        });
        break;
      }

      case "change_email": {
        if (!data.email) {
          return NextResponse.json(
            { error: "Email required" },
            { status: 400 }
          );
        }
        await prisma.dashboardAccount.update({
          where: { id },
          data: { email: data.email },
        });
        break;
      }

      case "update_links": {
        // Delete all existing links and create new ones
        await prisma.accountSystemUser.deleteMany({ where: { accountId: id } });
        if (data.linkedUsers && data.linkedUsers.length > 0) {
          await prisma.accountSystemUser.createMany({
            data: data.linkedUsers.map((u: string) => ({
              accountId: id,
              hestiaUsername: u,
            })),
          });
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — delete account (admin only)
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.dashboardAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
