import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Protect all API routes
  if (pathname.startsWith('/api')) {
    const authCookie = request.cookies.get('auth')
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    const isFrontendUser = !!authCookie?.value
    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isFrontendUser && !isCronJob) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized Access' },
        { status: 401 }
      )
    }
  }

  // Protect the dashboard and root page
  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    const authCookie = request.cookies.get('auth')
    if (!authCookie?.value) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

// Configure the paths where this proxy should run
export const config = {
  matcher: [
    '/',
    '/api/:path*',
    '/dashboard/:path*'
  ],
}
