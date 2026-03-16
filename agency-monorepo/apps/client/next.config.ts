import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@repo': path.resolve(__dirname, '../../packages'),
    };
    return config;
  },
images: {
    unoptimized: true, // отключает обработку через /_next/image
    // remotePatterns можно оставить или удалить – они не нужны при unoptimized
  },
};

export default nextConfig;