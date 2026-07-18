import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root: a stray package-lock.json in the home directory
  // otherwise makes Turbopack infer the wrong root and 404 every route.
  turbopack: { root: __dirname },
};

export default nextConfig;
