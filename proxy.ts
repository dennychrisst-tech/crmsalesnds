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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:png|svg|ico)$).*)"],
};
