import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get('auth');

  // Protect /dashboard and /
  if (request.nextUrl.pathname === '/' || request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!authCookie || !authCookie.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
