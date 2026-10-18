import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; connect-src 'self' https://*.base.org https://*.base-mainnet.com https://*.sepolia.base.org https://*.basescan.org; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; frame-ancestors 'self';" },
]

const nextConfig: NextConfig = {
  headers: async () => [
    { source: '/:path*', headers: securityHeaders },
    { source: '/api/:path*', headers: [
      { key: 'Access-Control-Allow-Origin', value: 'https://cryptopool.pages.dev' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
    ]},
  ],
}

export default nextConfig
