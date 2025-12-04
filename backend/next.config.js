/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  // Enable API routes
  api: {
    bodyParser: true,
    bodyParserLimit: '10mb',
    responseLimit: false,
  },

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Redirects for SEO
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: false,
      },
      {
        source: '/dashboard',
        destination: '/app/dashboard',
        permanent: false,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.FRONTEND_URL || 'http://localhost:3000',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
        ],
      },
    ];
  },

  // Webpack configuration for custom loaders
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack configuration here if needed
    return config;
  },

  // Image optimization
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'digital-utopia.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Performance optimizations
  swcMinify: true,
  poweredByHeader: false,
  
  // Compression
  compress: true,
  async compress() {
    return [
      'gzip',
      'brotli',
    ];
  },

  // Enable experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@headlessui/react', '@heroicons/react'],
  },
};

module.exports = nextConfig;