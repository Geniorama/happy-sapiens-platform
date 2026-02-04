import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuración para Netlify
  output: 'standalone',
  
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
    },
  },
};

export default nextConfig;
