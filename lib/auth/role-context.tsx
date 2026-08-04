"use client";

import { createContext, useContext } from "react";
import { createAuthClient } from "better-auth/react";

export type Role = "reporter" | "dicht_admin" | "dicht_technician";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export type CurrentUserOrNull = CurrentUser | null;

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export const authClient = createAuthClient({
  baseURL:
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_BETTER_AUTH_URL
      ? process.env.NEXT_PUBLIC_BETTER_AUTH_URL
      : undefined,
});

const UserContext = createContext<CurrentUserOrNull>(null);
const SessionStatusContext = createContext<SessionStatus>("loading");
const RefetchSessionContext = createContext<(() => Promise<void>) | null>(null);

function resolveRole(value: unknown): Role | null {
  if (
    value === "reporter" ||
    value === "dicht_admin" ||
    value === "dicht_technician"
  ) {
    return value;
  }
  return null;
}

export function RoleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const sessionUser = (session?.user ?? null) as {
    id?: string;
    email?: string;
    name?: string;
    role?: unknown;
  } | null;

  const user: CurrentUserOrNull =
    sessionUser && (sessionUser.id || sessionUser.email)
      ? {
          id: sessionUser.id ?? "",
          email: sessionUser.email ?? "",
          name: sessionUser.name || sessionUser.email || "",
          role: resolveRole(sessionUser.role) ?? "reporter",
        }
      : null;

  const status: SessionStatus = isPending
    ? "loading"
    : user
      ? "authenticated"
      : "unauthenticated";

  return (
    <SessionStatusContext.Provider value={status}>
      <RefetchSessionContext.Provider value={refetch}>
        <UserContext.Provider value={user}>{children}</UserContext.Provider>
      </RefetchSessionContext.Provider>
    </SessionStatusContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserOrNull {
  return useContext(UserContext);
}

export function useCurrentRole(): Role | null {
  const user = useContext(UserContext);
  return user ? user.role : null;
}

export function useSessionStatus(): SessionStatus {
  return useContext(SessionStatusContext);
}

export function useRefetchSession(): () => Promise<void> {
  const refetch = useContext(RefetchSessionContext);
  if (!refetch) {
    throw new Error("useRefetchSession must be used within a RoleProvider");
  }
  return refetch;
}
