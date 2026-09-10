import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      canvas: path.resolve(process.cwd(), "src/shims/empty-canvas.js"),
    };

    // Fix Watchpack Error by ignoring root system files on Windows
    if (!isServer) {
      config.watchOptions = {
        ignored: ["**/node_modules/**", "**/.next/**"],
      };
    }


    return config;
  },

  turbopack: {
    resolveAlias: {
      canvas: "./src/shims/empty-canvas.js",
    },
  },
};

export default nextConfig;
