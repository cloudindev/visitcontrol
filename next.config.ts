import type { NextConfig } from "next";

const basePath = "/residencialsanesteban";

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
