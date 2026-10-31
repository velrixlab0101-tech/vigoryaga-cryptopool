import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_HEADERS, normalizeWallet, getAdminWallet } from '@/lib/admin-wallet'

/**
 * Network-boundary checks. No request is ever logged with a visitor IP or
 * user agent; only an opaque request id is attached for support correlation.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  response.headers.set('X-Request-ID', crypto.randomUUID())

  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
  const isApiPath = pathname.startsWith('/api/')
  const isCreatorPath = pathname === '/creator' || pathname.startsWith('/creator/')

  // Never cache API responses, admin pages, or private creator dashboards.
  if (isApiPath || isAdminPath || isCreatorPath) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  }

  if (isAdminPath) {
    // Optimistic gate: reject any request that *claims* an admin identity which
    // is not the configured admin wallet. Requests with no admin headers pass
    // through and render the "Not authorized" state; actual mutations are
    // authorized server-side in the route handlers via verifyAdminAuth().
    const claimed = normalizeWallet(request.headers.get(ADMIN_HEADERS.wallet))
    const adminWallet = normalizeWallet(getAdminWallet())

    if (claimed !== '' && (adminWallet === '' || claimed !== adminWallet)) {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
  }

  return response
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
