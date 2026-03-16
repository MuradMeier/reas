/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // отключает обработку через /_next/image
    // remotePatterns можно оставить или удалить – они не нужны при unoptimized
  },
};

module.exports = nextConfig;