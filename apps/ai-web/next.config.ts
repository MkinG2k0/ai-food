import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone только в Docker (см. Dockerfile). Локально на Windows pnpm+symlink EPERM.
  ...(process.env.DOCKER === '1' ? { output: 'standalone' as const } : {}),
};

export default nextConfig;
