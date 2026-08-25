/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'canvas': false,
      'fflate': false,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/uploads/products/:file',
        destination: '/api/product-images?file=:file',
      },
    ];
  },
};

module.exports = nextConfig;
