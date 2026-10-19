import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

initOpenNextCloudflareForDev()

const csp = [
  "default-src 'self'",
  "connect-src 'self' https://*.base.org https://mainnet.base.org https://sepolia.base.org https://*.walletconnect.com https://*.walletconnect.org https://explorer-api.walletconnect.com https://*.web3modal.com wss://*.walletconnect.com wss://*.walletconnect.org",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-src 'self' https://*.walletconnect.com https://*.walletconnect.org https://verify.walletconnect.com https://verify.walletconnect.org",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy', value: csp },
]

const noIndex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]

const allowedOrigin = process.env.ALLOWED_API_ORIGIN || 'https://cryptopool.pages.dev'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The Cloudflare Worker uses @prisma/adapter-neon; the Node `pg` driver is
  // only needed for local Postgres dev. Keep it out of the traced server bundle.
  outputFileTracingExcludes: {
    '*': [
      'node_modules/pg/**/*',
      'node_modules/pg-*/**/*',
      'node_modules/@prisma/adapter-pg/**/*',
    ],
  },
  headers: async () => [
    { source: '/:path*', headers: securityHeaders },
    { source: '/admin/:path*', headers: noIndex },
    { source: '/admin', headers: noIndex },
    { source: '/api/:path*', headers: [
      ...noIndex,
      { key: 'Access-Control-Allow-Origin', value: allowedOrigin },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Admin-Wallet,X-Admin-Message,X-Admin-Signature,X-Admin-Token' },
      { key: 'Vary', value: 'Origin' },
    ]},
  ],
}

export default nextConfig
