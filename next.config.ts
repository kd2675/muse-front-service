import type { NextConfig } from "next";

const imageBaseUrl = new URL(
  process.env.NEXT_PUBLIC_IMAGE_BASE_URL ?? "http://localhost:8081",
);

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["localhost", "127.0.0.1", "61.80.148.197"],
  images: {
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1"].includes(
      imageBaseUrl.hostname,
    ),
    remotePatterns: [
      {
        protocol: imageBaseUrl.protocol.slice(0, -1) as "http" | "https",
        hostname: imageBaseUrl.hostname,
        port: imageBaseUrl.port,
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
