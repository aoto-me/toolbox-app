import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default function proxy(request: NextRequest) {
  const sessionToken =
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('__Secure-authjs.session-token');

  const isLoginPage = request.nextUrl.pathname === '/login';

  if (isLoginPage && sessionToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!isLoginPage && !sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|api/compat|_next/static|_next/image|favicon.ico|img/|icons/|manifest.webmanifest|robots.txt|opengraph-image.jpg).*)',
  ],
};
