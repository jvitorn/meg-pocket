import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const isReactCompilerEnabled = process.env.NEXT_REACT_COMPILER !== "false";

const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  output: "standalone",
  images: {
    unoptimized: true,
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          : "krxuafiolrihvoajvmnc.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  cacheComponents: false,
  reactCompiler: isReactCompilerEnabled,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/manual",
        destination: "/manual/essencial",
        permanent: false,
      },
    ];
  },
};

const withMDX = createMDX();
const configWithMDX = withMDX(nextConfig);

// Next 16/Turbopack rejects query conditions generated for Fumadocs meta
// files. The JSON meta files still load through Next's native JSON handling.
if (configWithMDX.turbopack?.rules) {
  delete configWithMDX.turbopack.rules["*.json"];
  delete configWithMDX.turbopack.rules["*.yaml"];
}

export default configWithMDX;
