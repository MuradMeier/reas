import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@repo/api-client',
    '@repo/hooks',
    '@repo/ui',
    '@repo/types'
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;