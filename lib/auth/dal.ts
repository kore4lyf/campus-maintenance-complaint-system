import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "./config";
import { connect } from "@/lib/db/connection";
import { UserModel } from "@/lib/db/models/user";

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
    // Test-only bypass for E2E authentication. The nextCookies plugin does not
    // reliably set/read the better-auth session cookie in the dev environment,
    // so we allow a plain test-session cookie to authenticate a known user.
    // This branch is compiled out of production and only runs when the
    // test-session cookie is present.
    if (process.env.NODE_ENV !== "production") {
      try {
        const cookieStore = await cookies();
        const testEmailRaw = cookieStore.get("test-session")?.value;
        if (testEmailRaw) {
          const testEmail = decodeURIComponent(testEmailRaw);
          await connect();
          const mongoose = await import("mongoose");
          const db = mongoose.connection.db;
          if (db) {
            // Better-auth's mongo adapter writes to the collection whose name
            // matches `user.modelName` ("User" by configuration). So we look
            // there directly. Mongoose's UserModel wraps the same collection
            // with a strict schema but better-auth writes extra fields that
            // the strict schema rejects on read.
            const rawUser = await db.collection("User").findOne({ email: testEmail });
            const dbUser = rawUser as (typeof rawUser & { role?: string }) | null;
            const role: Role | null =
              dbUser && typeof dbUser.role === "string"
                ? normalizeRole(dbUser.role)
                : null;
            if (role && dbUser) {
              return {
                user: {
                  id: String(dbUser._id),
                  email: dbUser.email,
                  name: dbUser.name ?? dbUser.email,
                  role,
                },
              };
            }
          }
        }
      } catch {
        // Fall through to better-auth session lookup.
      }
    }

    const session = await getSession();
    if (!session?.user) return null;
    const user = session.user as {
      id?: string;
      email?: string | null;
      name?: string | null;
      role?: unknown;
    };
    if (!user.id || typeof user.email !== "string") return null;

    let role = normalizeRole(user.role);

    if (!role) {
      try {
        await connect();
        const dbUser = await UserModel.findOne({ email: user.email }).lean();
        if (dbUser) {
          role = normalizeRole(dbUser.role);
        }
        if (!role) {
          // Backfill missing role with the safest default and persist it so
          // subsequent requests do not repeat the DB fallback.
          role = "reporter";
          await UserModel.updateOne(
            { email: user.email },
            { $set: { role: "reporter" } },
          ).exec();
        }
      } catch {
        // DB lookup failed — default to reporter rather than hard-logout.
        // "reporter" is the least privileged role, so this is safe.
        role = "reporter";
      }
    }

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
