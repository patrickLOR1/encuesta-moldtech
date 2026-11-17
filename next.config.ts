import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MOLDTECH_QA === "true" ? ".next-qa" : ".next",
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
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
