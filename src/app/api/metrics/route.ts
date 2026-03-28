import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { withSSH } from "@/lib/ssh-client";

const SSH_SUDO_PASSWORD = process.env.SSH_SUDO_PASSWORD || "";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const metrics = await withSSH(async (ssh) => {
      const sudoPrefix = `echo '${SSH_SUDO_PASSWORD.replace(/'/g, "'\\''")}' | sudo -S`;

      // All commands in one SSH call for performance
      const script = [
        // 1. CPU usage
        `${sudoPrefix} cat /proc/stat 2>/dev/null | head -1`,
        // 2. RAM
        `free -m | awk '/Mem:/ {printf "%d %d %d", $2, $3, $4}'`,
        // 3. Disk
        `df / | awk 'NR==2 {printf "%s %s %s %s", $2, $3, $4, $5}'`,
        // 4. Network
        `cat /proc/net/dev | awk '/:/ && !/lo:/ {gsub(/:/, ""); printf "%s %s %s\\n", $1, $2, $10}'`,
        // 5. Top processes
        `ps aux --sort=-%cpu | awk 'NR>1 && NR<=11 {printf "%s|%s|%s|%s|", $1, $2, $3, $4; for(i=11;i<=NF;i++) printf "%s ", $i; print ""}'`,
        // 6. Load average
        `cat /proc/loadavg | awk '{printf "%s %s %s", $1, $2, $3}'`,
        // 7. Uptime in seconds
        `cat /proc/uptime | awk '{printf "%d", $1}'`,
      ].join(" && echo '---SEPARATOR---' && ");

      const result = await ssh.execCommand(script);
      return result.stdout;
    });

    const sections = metrics.split("---SEPARATOR---").map((s) => s.trim());

    // Parse CPU from /proc/stat (calculate from idle vs total)
    let cpu = 0;
    const cpuLine = sections[0];
    if (cpuLine) {
      const parts = cpuLine.replace(/^cpu\s+/, "").split(/\s+/).map(Number);
      if (parts.length >= 4) {
        const idle = parts[3];
        const total = parts.reduce((a, b) => a + b, 0);
        // This gives instant reading - for delta we'd need two samples
        // Use load average as a simpler metric instead
        cpu = total > 0 ? Math.round(((total - idle) / total) * 100) : 0;
      }
    }

    // Parse RAM
    const ramParts = sections[1]?.split(/\s+/).map(Number) || [0, 0, 0];
    const ram = {
      total: ramParts[0] || 0,
      used: ramParts[1] || 0,
      free: ramParts[2] || 0,
      percent:
        ramParts[0] > 0
          ? Math.round((ramParts[1] / ramParts[0]) * 100)
          : 0,
    };

    // Parse Disk (values in 1K blocks)
    const diskParts = sections[2]?.split(/\s+/) || [];
    const diskTotalKb = parseInt(diskParts[0] || "0", 10);
    const diskUsedKb = parseInt(diskParts[1] || "0", 10);
    const diskAvailKb = parseInt(diskParts[2] || "0", 10);
    const diskPercentStr = diskParts[3] || "0%";
    const disk = {
      total: formatBytes(diskTotalKb * 1024),
      used: formatBytes(diskUsedKb * 1024),
      avail: formatBytes(diskAvailKb * 1024),
      percent: parseInt(diskPercentStr, 10) || 0,
    };

    // Parse Network
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

    // Parse Top Processes
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

    // Parse Load Average
    const loadParts = sections[5]?.split(/\s+/) || [];
    const loadAvg = {
      one: parseFloat(loadParts[0]) || 0,
      five: parseFloat(loadParts[1]) || 0,
      fifteen: parseFloat(loadParts[2]) || 0,
    };

    // Parse Uptime
    const uptimeSeconds = parseInt(sections[6] || "0", 10);

    return NextResponse.json({
      cpu,
      ram,
      disk,
      network: { bytesIn, bytesOut },
      topProcesses,
      loadAvg,
      uptimeSeconds,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to collect metrics" },
      { status: 500 }
    );
  }
}

function formatBytes(bytes: number): string {
  if (bytes >= 1099511627776) return `${(bytes / 1099511627776).toFixed(1)} TB`;
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
