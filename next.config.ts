import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard/district",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/dashboard/district",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
