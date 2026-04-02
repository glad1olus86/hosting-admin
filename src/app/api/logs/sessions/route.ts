import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    const where: any = {};

    if (accountId) {
      where.accountId = parseInt(accountId, 10);
    }
    if (search) {
      where.OR = [
        { ipAddress: { contains: search } },
        { country: { contains: search } },
        { city: { contains: search } },
        { browser: { contains: search } },
        { username: { contains: search } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
    }

    const [items, total] = await Promise.all([
      prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          accountId: true,
          username: true,
          ipAddress: true,
          browser: true,
          os: true,
          device: true,
          country: true,
          city: true,
          isp: true,
          createdAt: true,
        },
      }),
      prisma.loginLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch session logs" },
      { status: 500 }
    );
  }
}
