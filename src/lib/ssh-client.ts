import { NodeSSH } from "node-ssh";

const SSH_HOST = process.env.SSH_HOST || "localhost";
const SSH_PORT = parseInt(process.env.SSH_PORT || "22", 10);
const SSH_USER = process.env.SSH_USER || "root";
const SSH_KEY_PATH = process.env.SSH_KEY_PATH || "";
const SSH_PASSWORD = process.env.SSH_PASSWORD || "";

export async function withSSH<T>(fn: (ssh: NodeSSH) => Promise<T>): Promise<T> {
  const ssh = new NodeSSH();
  try {
    const config: any = {
      host: SSH_HOST,
      port: SSH_PORT,
      username: SSH_USER,
    };

    if (SSH_KEY_PATH) {
      config.privateKeyPath = SSH_KEY_PATH;
    } else if (SSH_PASSWORD) {
      config.password = SSH_PASSWORD;
    }

    await ssh.connect(config);
    return await fn(ssh);
  } finally {
    ssh.dispose();
  }
}

// Upload buffer to /tmp via SFTP, return the temp path
export async function uploadToTemp(buffer: Buffer, filename: string): Promise<string> {
  const tmpPath = `/tmp/upload_${Date.now()}_${Math.random().toString(36).slice(2)}_${filename}`;

  await withSSH(async (ssh) => {
    const sftp = await ssh.requestSFTP();
    await new Promise<void>((resolve, reject) => {
      const stream = sftp.createWriteStream(tmpPath);
      stream.on("close", resolve);
      stream.on("error", reject);
      stream.end(buffer);
    });
    // Make readable by other users so HestiaCP can copy it
    await ssh.execCommand(`chmod 644 "${tmpPath}"`);
  });

  return tmpPath;
}

const SSH_SUDO_PASSWORD = process.env.SSH_SUDO_PASSWORD || "";

// Execute a command as a specific system user via sudo
export async function execAsUser(user: string, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return withSSH(async (ssh) => {
    const escaped = command.replace(/'/g, "'\\''");
    const sudoCmd = `echo '${SSH_SUDO_PASSWORD.replace(/'/g, "'\\''")}' | sudo -S -u ${user} bash -c '${escaped}' 2>&1`;
    const result = await ssh.execCommand(sudoCmd);
    return { stdout: result.stdout, stderr: result.stderr, code: result.code ?? 0 };
  });
}

// Execute a command as root via sudo
export async function execAsRoot(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return withSSH(async (ssh) => {
    const escaped = command.replace(/'/g, "'\\''");
    const sudoCmd = `echo '${SSH_SUDO_PASSWORD.replace(/'/g, "'\\''")}' | sudo -S bash -c '${escaped}' 2>&1`;
    const result = await ssh.execCommand(sudoCmd);
    return { stdout: result.stdout, stderr: result.stderr, code: result.code ?? 0 };
  });
}

// Clean up temp file
export async function cleanupTemp(tmpPath: string): Promise<void> {
  await withSSH(async (ssh) => {
    await ssh.execCommand(`rm -f "${tmpPath}"`);
  });
}
