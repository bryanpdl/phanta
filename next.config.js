/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.dexscreener.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig; 