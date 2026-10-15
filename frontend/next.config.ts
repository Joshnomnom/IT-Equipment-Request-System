import type { NextConfig } from "next";

const apiTarget = process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  // Proxy /api/* to the NestJS backend. The browser only sees one origin,
  // so the httpOnly auth cookie works without CORS and can be SameSite=Strict.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiTarget}/api/:path*` }];
  },
};

export default nextConfig;
