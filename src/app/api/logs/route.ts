import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { cleanupOldLogs } from "@/lib/audit";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  // Trigger cleanup in background
  cleanupOldLogs();

  try {
    // Get all unique users from both tables with counts
    const [actionStats, loginStats] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ["accountId", "username"],
        _count: { id: true },
        _max: { createdAt: true },
      }),
      prisma.loginLog.groupBy({
        by: ["accountId", "username"],
        _count: { id: true },
        _max: { createdAt: true },
      }),
    ]);

    // Merge into a single map
    const usersMap = new Map<
      number,
      {
        accountId: number;
        username: string;
        actionCount: number;
        lastAction: string | null;
        loginCount: number;
        lastLogin: string | null;
      }
    >();

    for (const a of actionStats) {
      usersMap.set(a.accountId, {
        accountId: a.accountId,
        username: a.username,
        actionCount: a._count.id,
        lastAction: a._max.createdAt?.toISOString() || null,
        loginCount: 0,
        lastLogin: null,
      });
    }

    for (const l of loginStats) {
      const existing = usersMap.get(l.accountId);
      if (existing) {
        existing.loginCount = l._count.id;
        existing.lastLogin = l._max.createdAt?.toISOString() || null;
      } else {
        usersMap.set(l.accountId, {
          accountId: l.accountId,
          username: l.username,
          actionCount: 0,
          lastAction: null,
          loginCount: l._count.id,
          lastLogin: l._max.createdAt?.toISOString() || null,
        });
      }
    }

    const users = Array.from(usersMap.values()).sort(
      (a, b) => b.actionCount + b.loginCount - (a.actionCount + a.loginCount)
    );

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
