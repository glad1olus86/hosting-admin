import { execAsUser, execAsRoot } from "./ssh-client";
import { addDatabase } from "./hestia-api";

export interface WpJobStatus {
  step: number;
  totalSteps: number;
  message: string;
  status: "pending" | "installing" | "done" | "error";
  result?: {
    admin_url: string;
    admin_user: string;
    admin_password: string;
  };
  error?: string;
}

export interface WpInstallParams {
  user: string;
  domain: string;
  admin_user: string;
  admin_password: string;
  admin_email: string;
  plugins: string[];
}

// In-memory job store
const wpJobs = new Map<string, WpJobStatus>();

export function getJobStatus(jobId: string): WpJobStatus | null {
  return wpJobs.get(jobId) || null;
}

function updateJob(jobId: string, update: Partial<WpJobStatus>) {
  const current = wpJobs.get(jobId);
  if (current) {
    Object.assign(current, update);
  }
}

function generateDbCredentials(user: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const dbName = `wp_${suffix}`;
  const dbUser = `wp_${suffix}`;
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let dbPass = "";
  for (let i = 0; i < 16; i++) dbPass += chars[Math.floor(Math.random() * chars.length)];
  return { dbName, dbUser, dbPass };
}

export async function installWordPress(jobId: string, params: WpInstallParams) {
  const { user, domain, admin_user, admin_password, admin_email, plugins } = params;
  const path = `/home/${user}/web/${domain}/public_html`;
  const wpCliPath = `/home/${user}/.wp-cli/wp`;

  const totalSteps = 7 + (plugins.length > 0 ? 1 : 0);

  wpJobs.set(jobId, {
    step: 0,
    totalSteps,
    message: "Starting installation...",
    status: "installing",
  });

  // Auto-cleanup after 10 minutes
  setTimeout(() => wpJobs.delete(jobId), 10 * 60 * 1000);

  try {
    // Step 1: Install WP-CLI
    updateJob(jobId, { step: 1, message: "Installing WP-CLI..." });
    const wpCliCheck = await execAsUser(user, `test -f ${wpCliPath} && echo "exists"`);
    if (!wpCliCheck.stdout.includes("exists")) {
      await execAsRoot(`/usr/local/hestia/bin/v-add-user-wp-cli ${user}`);
    }

    // Step 2: Create database
    updateJob(jobId, { step: 2, message: "Creating database..." });
    const { dbName, dbUser, dbPass } = generateDbCredentials(user);
    await addDatabase(user, dbName, dbUser, dbPass, "mysql");
    const fullDbName = `${user}_${dbName}`;
    const fullDbUser = `${user}_${dbUser}`;

    // Step 3: Clean public_html and download WordPress
    updateJob(jobId, { step: 3, message: "Downloading WordPress..." });
    // Remove default index files but keep directory
    await execAsUser(user, `rm -rf ${path}/index.html ${path}/index.php 2>/dev/null; true`);
    const dlResult = await execAsUser(user, `php ${wpCliPath} core download --path=${path} --locale=en_US --force`);
    if (dlResult.code !== 0 && !dlResult.stdout.includes("Success") && !dlResult.stdout.includes("already present")) {
      throw new Error(`WordPress download failed: ${dlResult.stdout.substring(0, 200)}`);
    }

    // Step 4: Configure wp-config.php
    updateJob(jobId, { step: 4, message: "Configuring WordPress..." });
    const configResult = await execAsUser(
      user,
      `php ${wpCliPath} config create --dbname=${fullDbName} --dbuser=${fullDbUser} --dbpass='${dbPass}' --dbhost=localhost --path=${path} --force`
    );
    if (configResult.code !== 0 && !configResult.stdout.includes("Success")) {
      throw new Error(`Config create failed: ${configResult.stdout.substring(0, 200)}`);
    }

    // Step 5: Install WordPress
    updateJob(jobId, { step: 5, message: "Installing WordPress core..." });
    const siteUrl = `https://${domain}`;
    const installResult = await execAsUser(
      user,
      `php ${wpCliPath} core install --url='${siteUrl}' --title='${domain}' --admin_user='${admin_user}' --admin_password='${admin_password}' --admin_email='${admin_email}' --skip-email --path=${path}`
    );
    if (installResult.code !== 0 && !installResult.stdout.includes("Success")) {
      throw new Error(`WordPress install failed: ${installResult.stdout.substring(0, 200)}`);
    }

    // Step 6: Set permissions
    updateJob(jobId, { step: 6, message: "Setting permissions..." });
    await execAsRoot(`chown -R ${user}:${user} ${path}`);

    // Step 7: Rebuild web domain (creates PHP-FPM pool)
    updateJob(jobId, { step: 7, message: "Rebuilding web domain config..." });
    await execAsRoot(`/usr/local/hestia/bin/v-rebuild-web-domain ${user} ${domain}`);

    // Step 8: Install plugins
    if (plugins.length > 0) {
      updateJob(jobId, { step: 8, message: `Installing plugins: ${plugins.join(", ")}...` });
      for (const plugin of plugins) {
        await execAsUser(user, `php ${wpCliPath} plugin install ${plugin} --activate --path=${path}`);
      }
    }

    // Done
    updateJob(jobId, {
      step: totalSteps,
      message: "WordPress installed successfully!",
      status: "done",
      result: {
        admin_url: `${siteUrl}/wp-admin/`,
        admin_user,
        admin_password,
      },
    });
  } catch (err: any) {
    updateJob(jobId, {
      message: err.message || "Installation failed",
      status: "error",
      error: err.message,
    });
  }
}
