/** @type {import('next').NextConfig} */

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://js.stripe.com",
  "img-src 'self' data: blob: https://*.supabase.co https://q.stripe.com https://*.stripe.com https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.openstreetmap.org",
  "connect-src 'self' https://api.stripe.com https://*.supabase.co wss://*.supabase.co https://cloudflareinsights.com",
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
    deviceSizes: [640, 750, 828, 1080, 1280, 1920],
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
  // Old Wix URLs that Google still shows in search results.
  async redirects() {
    return [
      { source: "/direct-booking", destination: "/", permanent: true },
      { source: "/photo-gallery", destination: "/gallery", permanent: true },
    ];
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

// Bindings + Workers runtime helpers during `next dev` (OpenNext / Cloudflare).
try {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
} catch {
  // Package missing in some CI/local slices — ignore.
}
