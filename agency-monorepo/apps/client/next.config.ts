import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@repo/api-client',
    '@repo/hooks',
    '@repo/ui',
    '@repo/types'
  ],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@repo': path.resolve(__dirname, '../../packages'),
    };
    return config;
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;