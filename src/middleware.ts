import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Allow access to auth pages without token
    if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    // Protect dashboard routes
    if (path.startsWith('/dashboard') || path.startsWith('/questions') || 
        path.startsWith('/ai-studio') || path.startsWith('/revision') || 
        path.startsWith('/analytics') || path.startsWith('/settings')) {
      if (!token) {
        const url = new URL('/signin', req.url)
        url.searchParams.set('callbackUrl', path)
        return NextResponse.redirect(url)
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        // Allow auth pages
        if (path.startsWith('/signin') || path.startsWith('/signup') || path.startsWith('/api/auth')) {
          return true
        }
        // Require auth for protected routes
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/questions/:path*',
    '/ai-studio/:path*',
    '/revision/:path*',
    '/analytics/:path*',
    '/settings/:path*',
  ],
}