import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

// Protege tudo (exceto /login): sem cookie de sessão → /login; logado em /login → /.
export function proxy(request: NextRequest) {
  const isLoggedIn = request.cookies.has(SESSION_COOKIE);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!isLoggedIn && !isLoginPage) return NextResponse.redirect(new URL("/login", request.url));
  if (isLoggedIn && isLoginPage) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
