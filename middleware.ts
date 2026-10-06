import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Runs on the Edge runtime — this is exactly why session verification
// (lib/session.ts) uses `jose` instead of Node's bcrypt/crypto: it has
// to work here as well as in Server Actions.
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (session) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except: the public landing page ("/"), /login and /join
  // (the two unauthenticated entry points), /admin (its own separate
  // PIN gate), robots/sitemap, Next internals, and static assets.
  matcher: [
    "/((?!$|login|join|admin|robots.txt|sitemap.xml|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
