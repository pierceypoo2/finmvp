import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Dev: use in-memory webpack cache to avoid filesystem pack rename races *and*
   * occasional stale/missing chunk refs (e.g. Cannot find module './611.js') after interrupted builds.
   * Production uses webpack defaults.
   */
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
