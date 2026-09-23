import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie autonome : image Docker minimale pour le déploiement Coolify.
  output: "standalone",
};

export default nextConfig;
