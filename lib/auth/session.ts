import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { AuthSession } from "@/lib/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "carwash_super_secret_jwt_key_development_only_change_in_production_32chars"
);

const SESSION_COOKIE_NAME = "cw_session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(session: AuthSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "ADMIN" | "BRANCH_STAFF",
      branchId: (payload.branchId as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(session: AuthSession): Promise<string> {
  const token = await createSessionToken(session);
  const cookieStore = cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAuth(reqHeaders?: Headers): Promise<AuthSession> {
  // Support both cookie-based and Authorization header (for APIs/tests)
  if (reqHeaders) {
    const authHeader = reqHeaders.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const session = await verifySessionToken(token);
      if (session) return session;
    }
  }

  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireAdmin(reqHeaders?: Headers): Promise<AuthSession> {
  const session = await requireAuth(reqHeaders);
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN_NOT_ADMIN");
  }
  return session;
}

export async function requireBranchAccess(branchId: string, reqHeaders?: Headers): Promise<AuthSession> {
  const session = await requireAuth(reqHeaders);
  if (session.role === "ADMIN") {
    return session;
  }
  if (session.role === "BRANCH_STAFF" && session.branchId === branchId) {
    return session;
  }
  throw new Error("FORBIDDEN_BRANCH_ISOLATION");
}