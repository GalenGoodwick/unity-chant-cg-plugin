import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          // Allow embedding in Common Ground iframe
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' https://app.cg https://*.cg" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [{ hostname: '**' }],
  },
};

export default nextConfig;
