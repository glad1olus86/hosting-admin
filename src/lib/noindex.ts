import { execAsRoot } from "@/lib/ssh-client";

const MARKER = "# noindex-managed-by-panel";
const DIRECTIVE = 'add_header X-Robots-Tag "noindex, nofollow" always;';

export async function applyNoindex(user: string, domain: string): Promise<void> {
  const publicHtml = `/home/${user}/web/${domain}/public_html`;
  const confBase = `/home/${user}/conf/web/${domain}`;

  // 1. Write robots.txt
  await execAsRoot(
    `printf 'User-agent: *\\nDisallow: /\\n' > ${publicHtml}/robots.txt && chown ${user}:${user} ${publicHtml}/robots.txt`
  );

  // 2. Append X-Robots-Tag to nginx custom configs (skip if already present)
  for (const conf of [`${confBase}/nginx.conf_custom`, `${confBase}/nginx.ssl.conf_custom`]) {
    await execAsRoot(
      `touch ${conf} && grep -qF '${MARKER}' ${conf} || printf '\\n${MARKER}\\n${DIRECTIVE}\\n' >> ${conf}`
    );
  }

  // 3. Reload nginx (async, non-blocking)
  execAsRoot("systemctl reload nginx 2>/dev/null").catch(() => {});
}

export async function removeNoindex(user: string, domain: string): Promise<void> {
  const publicHtml = `/home/${user}/web/${domain}/public_html`;
  const confBase = `/home/${user}/conf/web/${domain}`;

  // 1. Remove robots.txt
  await execAsRoot(`rm -f ${publicHtml}/robots.txt`);

  // 2. Remove marker + directive from nginx custom configs
  for (const conf of [`${confBase}/nginx.conf_custom`, `${confBase}/nginx.ssl.conf_custom`]) {
    await execAsRoot(
      `[ -f ${conf} ] && sed -i '/${MARKER.replace(/\//g, "\\/")}/d;/X-Robots-Tag.*noindex/d' ${conf} || true`
    );
  }

  // 3. Reload nginx (async, non-blocking)
  execAsRoot("systemctl reload nginx 2>/dev/null").catch(() => {});
}
