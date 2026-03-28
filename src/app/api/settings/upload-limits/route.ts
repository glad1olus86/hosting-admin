import { NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/auth-guard";
import { execAsRoot } from "@/lib/ssh-client";

// GET — read current upload limits from nginx and PHP
export async function GET() {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const result = await execAsRoot(
      [
        // Nginx client_max_body_size
        `grep -r 'client_max_body_size' /etc/nginx/nginx.conf 2>/dev/null | head -1 | awk '{print $2}' | tr -d ';'`,
        "echo '---SEP---'",
        // PHP upload_max_filesize (find first php.ini)
        `php -i 2>/dev/null | grep 'upload_max_filesize' | head -1 | awk '{print $NF}'`,
        "echo '---SEP---'",
        // PHP post_max_size
        `php -i 2>/dev/null | grep 'post_max_size' | head -1 | awk '{print $NF}'`,
        "echo '---SEP---'",
        // PHP memory_limit
        `php -i 2>/dev/null | grep 'memory_limit' | head -1 | awk '{print $NF}'`,
      ].join(" && ")
    );

    const parts = result.stdout.split("---SEP---").map((s) => s.trim());

    return NextResponse.json({
      nginxClientMaxBodySize: parts[0] || "unknown",
      phpUploadMaxFilesize: parts[1] || "unknown",
      phpPostMaxSize: parts[2] || "unknown",
      phpMemoryLimit: parts[3] || "unknown",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to read upload limits" },
      { status: 500 }
    );
  }
}

// POST — update upload limits
export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (isNextResponse(auth)) return auth;

  try {
    const { nginxClientMaxBodySize, phpUploadMaxFilesize, phpPostMaxSize, phpMemoryLimit } =
      await request.json();

    const commands: string[] = [];

    // Update nginx
    if (nginxClientMaxBodySize) {
      commands.push(
        `sed -i 's/client_max_body_size.*/client_max_body_size ${nginxClientMaxBodySize};/' /etc/nginx/nginx.conf`
      );
    }

    // Find all active PHP ini files and update them
    if (phpUploadMaxFilesize) {
      commands.push(
        `find /etc/php -name 'php.ini' -exec sed -i 's/^upload_max_filesize.*/upload_max_filesize = ${phpUploadMaxFilesize}/' {} \\;`
      );
    }
    if (phpPostMaxSize) {
      commands.push(
        `find /etc/php -name 'php.ini' -exec sed -i 's/^post_max_size.*/post_max_size = ${phpPostMaxSize}/' {} \\;`
      );
    }
    if (phpMemoryLimit) {
      commands.push(
        `find /etc/php -name 'php.ini' -exec sed -i 's/^memory_limit.*/memory_limit = ${phpMemoryLimit}/' {} \\;`
      );
    }

    if (commands.length === 0) {
      return NextResponse.json({ error: "No values provided" }, { status: 400 });
    }

    // Restart services
    commands.push("systemctl restart nginx 2>/dev/null || true");
    commands.push(
      "systemctl restart 'php*-fpm' 2>/dev/null || true"
    );

    const result = await execAsRoot(commands.join(" && "));

    if (result.code !== 0 && result.stderr && !result.stderr.includes("warning")) {
      return NextResponse.json(
        { error: result.stderr.trim() },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update upload limits" },
      { status: 500 }
    );
  }
}
