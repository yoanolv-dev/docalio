import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload de documents via Server Action (limite app : 20 Mo + marge).
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
