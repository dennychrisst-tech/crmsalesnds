import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "crm_session";

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get(COOKIE)?.value;

  let valid = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      await jwtVerify(token, secret);
      valid = true;
    } catch {}
  }

  if (!valid && path !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (valid && path === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // manifest.webmanifest and sw.js must stay publicly reachable regardless of
  // auth state — Chrome fetches both to decide installability, and a redirect
  // to /login instead of real JSON/JS content makes the browser mark the site
  // as not installable (surfaced as: install banner/prompt never appears).
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/|manifest\\.webmanifest|sw\\.js|.*\\.(?:png|svg|ico)$).*)"],
};
