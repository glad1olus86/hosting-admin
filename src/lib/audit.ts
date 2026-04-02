import { prisma } from "@/lib/prisma";

// ── IP extraction ──────────────────────────────────────────
export function getClientIp(request: Request): string | null {
  const headers = request.headers;
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return null;
}

// ── User-Agent parsing ─────────────────────────────────────
interface ParsedUA {
  browser: string | null;
  os: string | null;
  device: string | null;
}

export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) return { browser: null, os: null, device: null };

  // Browser
  let browser: string | null = null;
  if (/Edg\/(\d+)/.test(ua)) browser = `Edge ${RegExp.$1}`;
  else if (/OPR\/(\d+)/.test(ua)) browser = `Opera ${RegExp.$1}`;
  else if (/Chrome\/(\d+)/.test(ua)) browser = `Chrome ${RegExp.$1}`;
  else if (/Firefox\/(\d+)/.test(ua)) browser = `Firefox ${RegExp.$1}`;
  else if (/Version\/(\d+).*Safari/.test(ua)) browser = `Safari ${RegExp.$1}`;

  // OS
  let os: string | null = null;
  if (/Windows NT 10/.test(ua)) os = "Windows 10/11";
  else if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X (\d+[._]\d+)/.test(ua)) os = `macOS ${RegExp.$1.replace("_", ".")}`;
  else if (/Android (\d+)/.test(ua)) os = `Android ${RegExp.$1}`;
  else if (/iPhone OS (\d+)/.test(ua)) os = `iOS ${RegExp.$1}`;
  else if (/iPad/.test(ua)) os = "iPadOS";
  else if (/Linux/.test(ua)) os = "Linux";

  // Device type
  let device: string | null = "Desktop";
  if (/iPad/.test(ua)) device = "Tablet";
  else if (/Mobile|iPhone|Android.*Mobile/.test(ua)) device = "Mobile";

  return { browser, os, device };
}

// ── Geolocation via ip-api.com ─────────────────────────────
interface GeoResult {
  country: string | null;
  city: string | null;
  isp: string | null;
}

async function getGeoLocation(ip: string | null): Promise<GeoResult> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: null, city: null, isp: null };
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,city,isp`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { country: null, city: null, isp: null };
    const data = await res.json();
    return {
      country: data.country || null,
      city: data.city || null,
      isp: data.isp || null,
    };
  } catch {
    return { country: null, city: null, isp: null };
  }
}

// ── Log action (fire-and-forget) ───────────────────────────
export function logAction(
  request: Request,
  user: { id: number; username: string },
  action: string,
  target?: string | null,
  details?: Record<string, unknown> | null
) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");

  prisma.auditLog
    .create({
      data: {
        accountId: user.id,
        username: user.username,
        action,
        target: target || null,
        details: details ? JSON.stringify(details) : null,
        ipAddress: ip,
        userAgent: ua ? ua.substring(0, 512) : null,
      },
    })
    .catch(() => {});
}

// ── Log login (fire-and-forget with geo lookup) ────────────
export function logLogin(
  request: Request,
  user: { id: number; username: string }
) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");
  const parsed = parseUserAgent(ua);

  getGeoLocation(ip)
    .then((geo) =>
      prisma.loginLog.create({
        data: {
          accountId: user.id,
          username: user.username,
          ipAddress: ip,
          userAgent: ua ? ua.substring(0, 512) : null,
          browser: parsed.browser,
          os: parsed.os,
          device: parsed.device,
          country: geo.country,
          city: geo.city,
          isp: geo.isp,
        },
      })
    )
    .catch(() => {});
}

// ── Cleanup old logs ───────────────────────────────────────
let lastCleanup = 0;

export async function cleanupOldLogs(retentionDays = 180) {
  const now = Date.now();
  // Only run once per day
  if (now - lastCleanup < 24 * 60 * 60 * 1000) return;
  lastCleanup = now;

  const cutoff = new Date(now - retentionDays * 24 * 60 * 60 * 1000);
  try {
    await Promise.all([
      prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.loginLog.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    ]);
  } catch {
    // Non-critical
  }
}
