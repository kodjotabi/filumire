import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Investor demo only: a self-contained server folder that runs with a bundled
// node.exe and no install step. Tracing stays inside the frozen copy.
const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: resolve(here, "../.."),
};

export default nextConfig;
