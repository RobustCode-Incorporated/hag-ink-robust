import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const isDev = process.env.NODE_ENV !== 'production';
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: https://*.private.blob.vercel-storage.com", // JOHN videos (private Blob, signed URL)
  "font-src 'self' data:",
  "connect-src 'self' https://va.vercel-scripts.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Old Hag & Ink addresses (before the Salon Edition) keep working for saved links and bookmarks.
  async redirects() {
    return [
      { source: '/login/:path*', destination: '/gestion/login', permanent: false },
      { source: '/ceo/:path*', destination: '/gestion', permanent: false },
      { source: '/manager/:path*', destination: '/gestion', permanent: false },
      { source: '/client', destination: '/', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CSP },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      { source: '/video/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
