import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
          : 'krxuafiolrihvoajvmnc.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  /* habilita Cache Components (Next 16) */
  cacheComponents: true,

  /* já estava no seu config — mantém o React Compiler ativo */
  reactCompiler: true,
};

export default nextConfig;
