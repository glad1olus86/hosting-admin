import { NextResponse } from "next/server";
import { listServices } from "@/lib/hestia-api";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { execAsRoot } from "@/lib/ssh-client";

export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const services = await listServices();
    return NextResponse.json(services);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

const ALLOWED_SERVICES = [
  "nginx", "apache2", "httpd",
  "mysql", "mariadb", "mysqld",
  "postgresql", "redis-server", "redis",
  "php-fpm", "php7.4-fpm", "php8.0-fpm", "php8.1-fpm", "php8.2-fpm", "php8.3-fpm",
  "exim4", "dovecot", "clamav-daemon", "spamassassin",
  "named", "bind9",
  "vsftpd", "proftpd",
  "fail2ban", "ssh", "sshd",
  "cron",
];

const ALLOWED_ACTIONS = ["restart", "start", "stop"];

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { name, action } = await request.json();

    if (!name || !action) {
      return NextResponse.json(
        { error: "name and action are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${ALLOWED_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!ALLOWED_SERVICES.includes(name)) {
      return NextResponse.json(
        { error: "Service not in allowed list" },
        { status: 403 }
      );
    }

    const result = await execAsRoot(`systemctl ${action} ${name}`);

    if (result.code !== 0 && result.stderr) {
      return NextResponse.json(
        { error: result.stderr.trim() || "Command failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, action, service: name });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to manage service" },
      { status: 500 }
    );
  }
}
