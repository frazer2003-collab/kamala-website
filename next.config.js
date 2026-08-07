/** @type {import('next').NextConfig} */

const contentSecurityPolicy = [
  "default-src 'self'",
  // vercel.live = Preview Comments / Live Feedback toolbar on Vercel deployments
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://va.vercel-scripts.com https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://js.stripe.com",
  "img-src 'self' data: blob: https://*.supabase.co https://q.stripe.com https://*.stripe.com https://*.tile.openstreetmap.org https://vercel.live https://vercel.com",
  "font-src 'self' data:",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.openstreetmap.org https://vercel.live",
  "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vercel.live wss://*.pusher.com https://*.pusher.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig = {
  images: {
    // Keep transform keys bounded: fewer widths × one format × long TTL.
    // Uploads use new storage paths, so long TTL does not strand stale hero/gallery URLs.
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 31,
    deviceSizes: [640, 750, 1080, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
