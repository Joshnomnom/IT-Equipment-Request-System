import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE = "access_token";

/**
 * Fast first gate: no cookie → straight to /login, without rendering the page.
 * It only checks the cookie exists; the backend still verifies the JWT on
 * every API call, and AuthProvider confirms the session via /auth/me.
 */
export function middleware(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the login page, the API proxy and static assets.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
