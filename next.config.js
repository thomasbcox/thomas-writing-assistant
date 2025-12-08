/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  transpilePackages: ['@prisma/client', '.prisma'],
  // Exclude Pino and its dependencies from bundling (server-only)
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream', 'pdf-parse'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude test files from Pino dependencies
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      config.module.rules.push({
        test: /node_modules\/thread-stream\/test\//,
        use: 'ignore-loader',
      });
    }
    return config;
  },
  turbopack: {},
};

export default nextConfig;
