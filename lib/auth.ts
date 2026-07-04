import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const COOKIE_NAME = "crm_session";
const EXPIRY = "1d";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getSessionFromRequest(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || !["super_admin", "admin"].includes(session.role)) return null;
  return session;
}

// Gate for actions that touch other privileged accounts (admin/super_admin)
// or app-wide config — a regular "admin" is not enough for these, only
// "super_admin" is (see PRIVILEGED_ROLES / isPrivilegedRole below).
export async function requireSuperAdmin(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session || session.role !== "super_admin") return null;
  return session;
}

// Roles a plain "admin" is not allowed to create, edit, delete, or otherwise
// act on — only "super_admin" can manage accounts at this tier.
export const PRIVILEGED_ROLES = ["admin", "super_admin"];
export function isPrivilegedRole(role: string): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
