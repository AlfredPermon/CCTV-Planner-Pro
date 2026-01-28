import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: "./src/shims/empty-canvas.js",
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: "./src/shims/empty-canvas.js",
    },
  },
};

export default nextConfig;
