import { NextResponse } from "next/server";
import { getCurrentUser, getLinkedUsernames } from "./auth";

interface AuthResult {
  user: { id: number; username: string; email: string; role: string };
  allowedUsernames: string[] | null; // null = admin (no filtering)
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function requireAuth(): Promise<AuthResult | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role === "admin") {
    return { user, allowedUsernames: null };
  }

  const usernames = await getLinkedUsernames(user.id);
  return { user, allowedUsernames: usernames };
}

export async function requireAdmin(): Promise<
  { user: { id: number; username: string; email: string; role: string } } | NextResponse
> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return { user };
}

// Check if a HestiaCP username is accessible by the current user
export function canAccessUser(
  allowedUsernames: string[] | null,
  hestiaUser: string
): boolean {
  if (allowedUsernames === null) return true; // admin
  return allowedUsernames.includes(hestiaUser);
}

// Filter a list of items by user field
export function filterByUser<T extends { user: string }>(
  items: T[],
  allowedUsernames: string[] | null
): T[] {
  if (allowedUsernames === null) return items;
  return items.filter((item) => allowedUsernames.includes(item.user));
}
