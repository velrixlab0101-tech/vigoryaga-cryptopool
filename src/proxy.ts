import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_HEADERS, normalizeWallet, getAdminWallet } from '@/lib/admin-wallet'

export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  
  response.headers.set('X-Request-ID', crypto.randomUUID())
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')

  const { pathname } = request.nextUrl
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdminPath) {
    // Optimistic check at the network boundary: reject any request that
    // *claims* an admin identity which is not the configured admin wallet.
    // Requests with no admin headers are passed through (the page renders the
    // "Not authorized" state client-side); actual mutations are authorized
    // server-side in the route handlers via verifyAdminAuth().
    const claimed = normalizeWallet(request.headers.get(ADMIN_HEADERS.wallet))
    const adminWallet = normalizeWallet(getAdminWallet())

    if (claimed !== '' && (adminWallet === '' || claimed !== adminWallet)) {
      return new NextResponse('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }

    response.headers.set('X-Admin-Auth', 'required')
  }
  
  return response
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
