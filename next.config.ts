import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera output standalone — necessário para imagem Docker enxuta
  output: "standalone",
};

export default nextConfig;
