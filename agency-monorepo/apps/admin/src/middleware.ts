import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Получаем токен из cookies (которые мы установили при логине)
  const token = request.cookies.get('access_token')?.value;

  const isAuthenticated = !!token;
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // Если пользователь не авторизован и пытается зайти не на страницу логина — редирект на логин
  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Если пользователь авторизован и пытается зайти на страницу логина — редирект на дашборд
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};