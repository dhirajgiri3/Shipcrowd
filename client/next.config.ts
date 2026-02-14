import type { NextConfig } from "next";

const resolveApiOrigin = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return '';

  try {
    return new URL(apiUrl).origin;
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid NEXT_PUBLIC_API_URL: "${apiUrl}". Expected a full URL.`);
    }
    return '';
  }
};

const apiOrigin = resolveApiOrigin();

const nextConfig: NextConfig = {
  // Production optimizations
  reactStrictMode: true,
  output: "standalone",

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
         protocol: 'https',
         hostname: 'chatgpt.com', 
      }
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          // SECURITY: Content Security Policy to mitigate XSS
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com", // Next.js requires inline scripts
              "script-src-elem 'self' 'unsafe-inline' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
              `connect-src 'self' ${process.env.NODE_ENV === 'development' ? 'http://localhost:5005 ws://localhost:5005' : ''} ${apiOrigin} https://api.razorpay.com https://lumberjack.razorpay.com`,
              "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
              "media-src 'self' https://res.cloudinary.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; ')
          },
        ],
      },
    ];
  },
};

export default nextConfig;
