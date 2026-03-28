import { withSSH } from "@/lib/ssh-client";

// ─── Shared metrics collection (SSH + parsing) ─────────────

export interface CollectedMetrics {
  cpu: number;
  ram: { total: number; used: number; free: number; percent: number };
  disk: { total: string; used: string; avail: string; percent: number };
  network: { bytesIn: number; bytesOut: number };
  topProcesses: Array<{
    user: string;
    pid: string;
    cpu: number;
    mem: number;
    command: string;
  }>;
  loadAvg: { one: number; five: number; fifteen: number };
  uptimeSeconds: number;
  timestamp: number;
  // Raw values for DB storage
  _raw: {
    diskPercent: number;
    netIn: number;
    netOut: number;
    ramPercent: number;
    ramUsed: number;
    ramTotal: number;
  };
}

const SSH_SCRIPT = [
  "cat /proc/stat | head -1",
  "free -m | awk '/Mem:/ {printf \"%d %d %d\", $2, $3, $4}'",
  "df / | awk 'NR==2 {printf \"%s %s %s %s\", $2, $3, $4, $5}'",
  "cat /proc/net/dev | awk '/:/ && !/lo:/ {gsub(/:/, \"\"); printf \"%s %s %s\\n\", $1, $2, $10}'",
  "ps aux --sort=-%cpu | awk 'NR>1 && NR<=11 {printf \"%s|%s|%s|%s|\", $1, $2, $3, $4; for(i=11;i<=NF;i++) printf \"%s \", $i; print \"\"}'",
  "cat /proc/loadavg | awk '{printf \"%s %s %s\", $1, $2, $3}'",
  "cat /proc/uptime | awk '{printf \"%d\", $1}'",
].join(" && echo '---SEPARATOR---' && ");

function formatBytes(bytes: number): string {
  if (bytes >= 1099511627776) return `${(bytes / 1099511627776).toFixed(1)} TB`;
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export async function collectMetrics(): Promise<CollectedMetrics> {
  const stdout = await withSSH(async (ssh) => {
    const result = await ssh.execCommand(SSH_SCRIPT);
    return result.stdout;
  });

  const sections = stdout.split("---SEPARATOR---").map((s) => s.trim());

  // CPU
  let cpu = 0;
  const cpuLine = sections[0];
  if (cpuLine) {
    const parts = cpuLine.replace(/^cpu\s+/, "").split(/\s+/).map(Number);
    if (parts.length >= 4) {
      const idle = parts[3];
      const total = parts.reduce((a, b) => a + b, 0);
      cpu = total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
    }
  }

  // RAM
  const ramParts = sections[1]?.split(/\s+/).map(Number) || [0, 0, 0];
  const ramTotal = ramParts[0] || 0;
  const ramUsed = ramParts[1] || 0;
  const ramFree = ramParts[2] || 0;
  const ramPercent = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0;

  // Disk
  const diskParts = sections[2]?.split(/\s+/) || [];
  const diskTotalKb = parseInt(diskParts[0] || "0", 10);
  const diskUsedKb = parseInt(diskParts[1] || "0", 10);
  const diskAvailKb = parseInt(diskParts[2] || "0", 10);
  const diskPercentStr = diskParts[3] || "0%";
  const diskPercent = parseInt(diskPercentStr, 10) || 0;

  // Network
  const netLines = sections[3]?.split("\n").filter(Boolean) || [];
  let bytesIn = 0;
  let bytesOut = 0;
  for (const line of netLines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 3) {
      bytesIn += parseInt(parts[1], 10) || 0;
      bytesOut += parseInt(parts[2], 10) || 0;
    }
  }

  // Top Processes
  const processLines = sections[4]?.split("\n").filter(Boolean) || [];
  const topProcesses = processLines.slice(0, 10).map((line) => {
    const parts = line.split("|");
    return {
      user: parts[0] || "",
      pid: parts[1] || "",
      cpu: parseFloat(parts[2]) || 0,
      mem: parseFloat(parts[3]) || 0,
      command: (parts[4] || "").trim().slice(0, 80),
    };
  });

  // Load Average
  const loadParts = sections[5]?.split(/\s+/) || [];
  const loadAvg = {
    one: parseFloat(loadParts[0]) || 0,
    five: parseFloat(loadParts[1]) || 0,
    fifteen: parseFloat(loadParts[2]) || 0,
  };

  // Uptime
  const uptimeSeconds = parseInt(sections[6] || "0", 10);

  return {
    cpu,
    ram: { total: ramTotal, used: ramUsed, free: ramFree, percent: ramPercent },
    disk: {
      total: formatBytes(diskTotalKb * 1024),
      used: formatBytes(diskUsedKb * 1024),
      avail: formatBytes(diskAvailKb * 1024),
      percent: diskPercent,
    },
    network: { bytesIn, bytesOut },
    topProcesses,
    loadAvg,
    uptimeSeconds,
    timestamp: Date.now(),
    _raw: {
      diskPercent,
      netIn: bytesIn,
      netOut: bytesOut,
      ramPercent,
      ramUsed,
      ramTotal,
    },
  };
}

// ─── Background collector (singleton) ──────────────────────

const COLLECT_INTERVAL = 30_000; // 30 seconds
const CLEANUP_EVERY = 120; // every 120th tick = ~1 hour
const RETENTION_DAYS = 7;

let started = false;
let tickCount = 0;

export function startCollector() {
  if (started) return;
  started = true;
  console.log("[MetricsCollector] Starting background collector (every 30s)");

  // Delay first collection by 5s to let server fully start
  setTimeout(() => {
    tick();
    setInterval(tick, COLLECT_INTERVAL);
  }, 5000);
}

async function tick() {
  tickCount++;
  try {
    const metrics = await collectMetrics();

    // Dynamic import to avoid issues during build
    const { prisma } = await import("@/lib/prisma");

    await prisma.metricSnapshot.create({
      data: {
        cpu: metrics.cpu,
        ramPercent: metrics._raw.ramPercent,
        ramUsed: metrics._raw.ramUsed,
        ramTotal: metrics._raw.ramTotal,
        diskPercent: metrics._raw.diskPercent,
        netIn: BigInt(metrics._raw.netIn),
        netOut: BigInt(metrics._raw.netOut),
        recordedAt: new Date(),
      },
    });

    // Cleanup old records every ~hour
    if (tickCount % CLEANUP_EVERY === 0) {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400_000);
      const deleted = await prisma.metricSnapshot.deleteMany({
        where: { recordedAt: { lt: cutoff } },
      });
      if (deleted.count > 0) {
        console.log(`[MetricsCollector] Cleaned up ${deleted.count} old records`);
      }
    }
  } catch (err: any) {
    console.error(`[MetricsCollector] Error: ${err.message}`);
  }
}
