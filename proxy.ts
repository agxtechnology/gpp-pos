import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!signedIn) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = {
  // protect everything except the API login routes, Next.js internals and public images/manifest
  matcher: [
    "/((?!api/login|api/logout|_next/static|_next/image|favicon.ico|manifest.webmanifest|logo.png|logo-mark.png|icon-192.png|icon-512.png|apple-icon.png).*)",
  ],
};
