import { SignJWT, jwtVerify } from "jose";
import { compare, hash } from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export interface JwtPayload {
  sub: number;
  username: string;
  role: string;
}

// --- JWT ---

export async function createJWT(payload: JwtPayload): Promise<string> {
  return new SignJWT({
    username: payload.username,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.sub))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecret());
}

export async function verifyJWT(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      sub: Number(payload.sub),
      username: payload.username as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}

// --- Passwords ---

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(password, hashedPassword);
}

// --- Sessions ---

export async function createSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// --- Current user ---

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const user = await prisma.dashboardAccount.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      suspended: true,
      domainPattern: true,
      systemUsers: { select: { hestiaUsername: true } },
    },
  });

  if (!user || user.suspended) return null;

  return user;
}

export async function getLinkedUsernames(
  accountId: number
): Promise<string[]> {
  const links = await prisma.accountSystemUser.findMany({
    where: { accountId },
    select: { hestiaUsername: true },
  });
  return links.map((l) => l.hestiaUsername);
}
