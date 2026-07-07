import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["roughjs"],
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent node-specific modules from being bundled for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
