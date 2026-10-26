import { NextResponse, type NextRequest } from "next/server";

// Bulgarian is the main language and lives at the root (/category/x), English lives under /en (/en/category/x).
// Every page is rendered by app/[locale]/..., so "/category/x" is rewritten internally to "/bg/category/x".
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // "/bg/..." would duplicate the root pages: send it to the canonical address.
  if (pathname === "/bg" || pathname.startsWith("/bg/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/bg${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|pdf|woff2?)$).*)"],
};
