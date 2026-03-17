import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Configuración para Netlify
  output: 'standalone',
  
  // Especificar el directorio raíz del proyecto para evitar warnings de múltiples lockfiles
  outputFileTracingRoot: path.join(__dirname),
  
  // Optimizaciones de imagen
  images: {
    domains: [
      's3.amazonaws.com',
      'cloudfront.net',
      'lh3.googleusercontent.com', // Google OAuth
      'graph.facebook.com', // Facebook OAuth
      'dgalywyr863hv.cloudfront.net', // Si usas CloudFront
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
  },

  // Configuración de variables de entorno
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
      bodySizeLimit: '4mb',
    },
  },
};

export default nextConfig;
