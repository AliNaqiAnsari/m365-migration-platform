import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@m365-migration/types"],
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
