import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const PERIODS: Record<string, { seconds: number; groupBy: number }> = {
  "5m": { seconds: 300, groupBy: 0 },           // raw data (~10 points) — for live seed
  "1h": { seconds: 3600, groupBy: 0 },          // raw data (~120 points)
  "6h": { seconds: 21600, groupBy: 180 },       // 3-min groups (~120)
  "24h": { seconds: 86400, groupBy: 600 },      // 10-min groups (~144)
  "7d": { seconds: 604800, groupBy: 3600 },     // 1-hour groups (~168)
};

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "1h";

  const config = PERIODS[period];
  if (!config) {
    return NextResponse.json(
      { error: `Invalid period. Use: ${Object.keys(PERIODS).join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const since = new Date(Date.now() - config.seconds * 1000);

    if (config.groupBy === 0) {
      // Raw data — no aggregation needed
      const rows = await prisma.metricSnapshot.findMany({
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
        select: {
          cpu: true,
          ramPercent: true,
          diskPercent: true,
          netIn: true,
          netOut: true,
          recordedAt: true,
        },
      });

      const points = computeNetRates(
        rows.map((r) => ({
          time: r.recordedAt.toISOString(),
          cpu: Math.round(r.cpu * 10) / 10,
          ram: Math.round(r.ramPercent * 10) / 10,
          diskPercent: Math.round(r.diskPercent * 10) / 10,
          netIn: Number(r.netIn),
          netOut: Number(r.netOut),
        }))
      );

      return NextResponse.json({ points, period, totalPoints: points.length });
    }

    // Aggregated data via raw SQL
    const groupBySec = config.groupBy;
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT
        FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(recorded_at) / ?) * ?) as bucket,
        AVG(cpu) as cpu,
        AVG(ram_percent) as ram,
        AVG(disk_percent) as disk_percent,
        MIN(net_in) as net_in_min,
        MAX(net_in) as net_in_max,
        MIN(net_out) as net_out_min,
        MAX(net_out) as net_out_max,
        COUNT(*) as cnt
      FROM metric_snapshots
      WHERE recorded_at >= ?
      GROUP BY bucket
      ORDER BY bucket ASC`,
      groupBySec,
      groupBySec,
      since
    );

    const points = rows.map((r, i) => {
      const bucket = r.bucket instanceof Date ? r.bucket.toISOString() : String(r.bucket);
      // Net rate: delta within bucket / time span
      const netInDelta = Number(r.net_in_max) - Number(r.net_in_min);
      const netOutDelta = Number(r.net_out_max) - Number(r.net_out_min);
      const rateDivisor = groupBySec;

      return {
        time: bucket,
        cpu: Math.round(Number(r.cpu) * 10) / 10,
        ram: Math.round(Number(r.ram) * 10) / 10,
        diskPercent: Math.round(Number(r.disk_percent) * 10) / 10,
        netInRate: Math.round(netInDelta / rateDivisor / 1024), // KB/s
        netOutRate: Math.round(netOutDelta / rateDivisor / 1024),
      };
    });

    return NextResponse.json({ points, period, totalPoints: points.length });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch metrics history" },
      { status: 500 }
    );
  }
}

// Compute net rates from raw sequential data (delta between consecutive points)
function computeNetRates(
  rows: Array<{
    time: string;
    cpu: number;
    ram: number;
    diskPercent: number;
    netIn: number;
    netOut: number;
  }>
) {
  return rows.map((r, i) => {
    let netInRate = 0;
    let netOutRate = 0;
    if (i > 0) {
      const prev = rows[i - 1];
      const timeDelta =
        (new Date(r.time).getTime() - new Date(prev.time).getTime()) / 1000;
      if (timeDelta > 0) {
        netInRate = Math.round((r.netIn - prev.netIn) / timeDelta / 1024);
        netOutRate = Math.round((r.netOut - prev.netOut) / timeDelta / 1024);
      }
    }
    return {
      time: r.time,
      cpu: r.cpu,
      ram: r.ram,
      diskPercent: r.diskPercent,
      netInRate: Math.max(0, netInRate),
      netOutRate: Math.max(0, netOutRate),
    };
  });
}
