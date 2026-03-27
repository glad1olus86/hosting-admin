import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["node-ssh", "ssh2"],
};

export default nextConfig;
