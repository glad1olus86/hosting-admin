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

export async function uploadFile(
  localPath: string,
  remotePath: string
): Promise<void> {
  await withSSH(async (ssh) => {
    await ssh.putFile(localPath, remotePath);
  });
}

export async function uploadBuffer(
  buffer: Buffer,
  remotePath: string,
  owner?: string
): Promise<void> {
  await withSSH(async (ssh) => {
    // Write buffer to a temp file on the server, then move to target
    const tmpPath = `/tmp/upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Use sftp to write directly
    const sftp = await ssh.requestSFTP();
    await new Promise<void>((resolve, reject) => {
      const stream = sftp.createWriteStream(tmpPath);
      stream.on("close", resolve);
      stream.on("error", reject);
      stream.end(buffer);
    });

    // Move to target and set ownership
    await ssh.execCommand(`mv "${tmpPath}" "${remotePath}"`);
    if (owner) {
      await ssh.execCommand(`chown ${owner}:${owner} "${remotePath}"`);
    }
  });
}
