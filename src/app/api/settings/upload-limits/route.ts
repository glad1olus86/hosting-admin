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
        `grep -r 'client_max_body_size' /etc/nginx/nginx.conf 2>/dev/null | head -1`,
        "echo '---SEP---'",
        `php -i 2>/dev/null | grep 'upload_max_filesize' | head -1`,
        "echo '---SEP---'",
        `php -i 2>/dev/null | grep 'post_max_size' | head -1`,
        "echo '---SEP---'",
        `php -i 2>/dev/null | grep 'memory_limit' | head -1`,
      ].join(" && ")
    );

    // Strip [sudo] password prompt from output
    const clean = result.stdout.replace(/\[sudo\] password for \w+:\s*/g, "");
    const parts = clean.split("---SEP---").map((s) => s.trim());

    // Extract value with unit (e.g. "2048M", "128M") from each part
    const extractValue = (raw: string): string => {
      const match = raw.match(/(\d+[MmGgKk]?)\s*;?\s*$/);
      if (match) return match[1];
      // PHP format: "key => local => master" — take last value
      const phpMatch = raw.match(/=>\s*(\d+[MmGgKk]?)\s*$/);
      if (phpMatch) return phpMatch[1];
      return raw || "unknown";
    };

    return NextResponse.json({
      nginxClientMaxBodySize: extractValue(parts[0] || ""),
      phpUploadMaxFilesize: extractValue(parts[1] || ""),
      phpPostMaxSize: extractValue(parts[2] || ""),
      phpMemoryLimit: extractValue(parts[3] || ""),
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

    // Validate input format (e.g. "512M", "2048M", "1G")
    const validFormat = /^\d+[MmGg]?$/;
    for (const val of [nginxClientMaxBodySize, phpUploadMaxFilesize, phpPostMaxSize, phpMemoryLimit]) {
      if (val && !validFormat.test(val)) {
        return NextResponse.json({ error: `Invalid value format: ${val}` }, { status: 400 });
      }
    }

    const configCommands: string[] = [];

    // Update nginx
    if (nginxClientMaxBodySize) {
      configCommands.push(
        `sed -i 's/client_max_body_size.*/client_max_body_size ${nginxClientMaxBodySize};/' /etc/nginx/nginx.conf`
      );
    }

    // Find all active PHP ini files and update them
    if (phpUploadMaxFilesize) {
      configCommands.push(
        `find /etc/php -name 'php.ini' -exec sed -i 's/^upload_max_filesize.*/upload_max_filesize = ${phpUploadMaxFilesize}/' {} \\;`
      );
    }
    if (phpPostMaxSize) {
      configCommands.push(
        `find /etc/php -name 'php.ini' -exec sed -i 's/^post_max_size.*/post_max_size = ${phpPostMaxSize}/' {} \\;`
      );
    }
    if (phpMemoryLimit) {
      configCommands.push(
        `find /etc/php -name 'php.ini' -exec sed -i 's/^memory_limit.*/memory_limit = ${phpMemoryLimit}/' {} \\;`
      );
    }

    if (configCommands.length === 0) {
      return NextResponse.json({ error: "No values provided" }, { status: 400 });
    }

    // Step 1: Apply config changes synchronously
    const result = await execAsRoot(configCommands.join(" && "));

    if (result.code !== 0 && result.stderr && !result.stderr.includes("warning")) {
      return NextResponse.json(
        { error: result.stderr.trim() },
        { status: 500 }
      );
    }

    // Step 2: Restart services in background (nohup + &) so nginx restart
    // doesn't kill the proxy connection that serves this response
    execAsRoot(
      `nohup bash -c 'sleep 1 && systemctl restart php*-fpm 2>/dev/null; systemctl reload nginx 2>/dev/null' &>/dev/null &`
    ).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update upload limits" },
      { status: 500 }
    );
  }
}
