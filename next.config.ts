import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "210mb",
    },
  },
  serverExternalPackages: ["unpdf", "mammoth"],
};

export default nextConfig;
