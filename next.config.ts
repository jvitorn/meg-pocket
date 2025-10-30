import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.SUPABASE_PROJECT_ID + '.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      // Ou usando a URL completa
      {
        protocol: 'https',
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname,
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
