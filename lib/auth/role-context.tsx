"use client";

import { createContext, useContext, useState, useCallback } from "react";

type Role = "reporter" | "dicht_admin" | "dicht_technician";

const RoleContext = createContext<Role | null>(null);

export function RoleProvider({
  initial,
  children,
}: {
  initial?: Role | null;
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<Role | null>(initial ?? null);

  const switchRole = useCallback((r: Role | null) => {
    setRole(r);
  }, []);

  return (
    <RoleContext.Provider value={role}>
      {children}
      {process.env.NEXT_PUBLIC_ALLOW_MOCK_ROLE === "1" && (
        <MockRoleSwitcher current={role} onSwitch={switchRole} />
      )}
    </RoleContext.Provider>
  );
}

export function useCurrentRole(): Role | null {
  return useContext(RoleContext);
}

function MockRoleSwitcher({
  current,
  onSwitch,
}: {
  current: Role | null;
  onSwitch: (r: Role | null) => void;
}) {
  return (
    <div
      className="fixed bottom-4 right-4 z-50 rounded-lg border border-border bg-surface-raised p-3 shadow-lg"
      role="region"
      aria-label="Mock role switcher"
    >
      <p className="mb-2 text-xs font-medium text-muted-strong">
        Dev only: mock role
      </p>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSwitch(null)}
          className={`rounded-md px-3 py-1 text-left text-xs font-medium transition-colors ${
            current === null
              ? "bg-brand text-white"
              : "bg-surface text-muted-strong hover:bg-surface-raised"
          }`}
        >
          No role (signed out)
        </button>
        <button
          type="button"
          onClick={() => onSwitch("reporter")}
          className={`rounded-md px-3 py-1 text-left text-xs font-medium transition-colors ${
            current === "reporter"
              ? "bg-brand text-white"
              : "bg-surface text-muted-strong hover:bg-surface-raised"
          }`}
        >
          Reporter
        </button>
        <button
          type="button"
          onClick={() => onSwitch("dicht_admin")}
          className={`rounded-md px-3 py-1 text-left text-xs font-medium transition-colors ${
            current === "dicht_admin"
              ? "bg-brand text-white"
              : "bg-surface text-muted-strong hover:bg-surface-raised"
          }`}
        >
          DICT Admin
        </button>
        <button
          type="button"
          onClick={() => onSwitch("dicht_technician")}
          className={`rounded-md px-3 py-1 text-left text-xs font-medium transition-colors ${
            current === "dicht_technician"
              ? "bg-brand text-white"
              : "bg-surface text-muted-strong hover:bg-surface-raised"
          }`}
        >
          DICT Technician
        </button>
      </div>
    </div>
  );
}
