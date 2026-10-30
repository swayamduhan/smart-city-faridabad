import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge would sit on top of the demo and the phone nav.
  devIndicators: false,
  // cacheComponents stays off: every civic page reads per-user or live data, and its hidden
  // <Activity> routes would keep the WebGL and physics loops mounted.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
