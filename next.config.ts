import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En Next.js 16, reactCompiler ya es estable y va en la raíz
  reactCompiler: true,
  // Mantenemos el bypass estricto para TypeScript
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;