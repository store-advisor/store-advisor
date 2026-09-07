import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Emits .next/standalone: a self-contained server plus only the node_modules
  // it actually reached for. It is what web/Dockerfile copies into the runtime
  // stage, and the reason that image does not need an npm install of its own.
  output: "standalone",
};

export default nextConfig;
