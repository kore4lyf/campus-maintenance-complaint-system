import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./config";

export type Role = "reporter" | "dicht_admin" | "dicht_technician";

export interface ServerSessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ServerSession {
  user: ServerSessionUser;
}

function normalizeRole(value: unknown): Role | null {
  if (value === "reporter" || value === "dicht_admin" || value === "dicht_technician") {
    return value;
  }
  return null;
}

async function loadSession(): Promise<ServerSession | null> {
  try {
    const session = await getSession();
    if (!session?.user) return null;
    const user = session.user as {
      id?: string;
      email?: string | null;
      name?: string | null;
      role?: unknown;
    };
    if (!user.id || typeof user.email !== "string") return null;
    const role = normalizeRole(user.role);
    if (!role) return null;
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? user.email,
        role,
      },
    };
  } catch {
    return null;
  }
}

export const getServerSession = cache(loadSession);

export async function requireSession(redirectPath?: string): Promise<ServerSession> {
  const session = await getServerSession();
  if (!session) {
    const target = redirectPath ?? "/sign-in";
    redirect(target);
  }
  return session;
}

export async function requireRole(
  ...allowed: ReadonlyArray<Role>
): Promise<ServerSession> {
  const session = await requireSession();
  if (!allowed.includes(session.user.role)) {
    redirect("/");
  }
  return session;
}

export function authorizeRole(
  session: ServerSession | null,
  ...allowed: ReadonlyArray<Role>
): boolean {
  if (!session) return false;
  return allowed.includes(session.user.role);
}
