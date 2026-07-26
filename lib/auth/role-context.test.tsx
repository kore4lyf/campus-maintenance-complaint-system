type Listener = (state: { data: SessionData | null }) => void;

type SessionData = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
  } | null;
} | null;

const listeners = new Set<Listener>();
let current: SessionData = null;

jest.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => {
      return {
        data: current,
        subscribe(listener: Listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      };
    },
  }),
}));

function setSession(next: SessionData) {
  current = next;
  for (const l of listeners) l({ data: next });
}

import { act, render, screen } from "@testing-library/react";
import { RoleProvider, useCurrentUser, useCurrentRole } from "./role-context";

function ReadCurrent({ testId }: { testId: string }) {
  const user = useCurrentUser();
  const role = useCurrentRole();
  return (
    <span data-testid={testId}>
      {user
        ? `${user.id}|${user.email}|${user.name}|${user.role}|${role ?? "null"}`
        : "null"}
    </span>
  );
}

beforeEach(() => {
  current = null;
  listeners.clear();
});

describe("RoleProvider with BetterAuth session", () => {
  test("renders children inside the provider", () => {
    render(
      <RoleProvider>
        <span data-testid="child">child content</span>
      </RoleProvider>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("child content");
  });

  test("useCurrentUser returns null when no BetterAuth session", () => {
    render(
      <RoleProvider>
        <ReadCurrent testId="r" />
      </RoleProvider>
    );
    expect(screen.getByTestId("r")).toHaveTextContent("null");
  });

  test("useCurrentUser returns the codified user (id, email, name, role) when session present", () => {
    setSession({
      user: {
        id: "user_1",
        email: "reporter@example.com",
        name: "Reporter One",
        role: "reporter",
      },
    });
    render(
      <RoleProvider>
        <ReadCurrent testId="r" />
      </RoleProvider>
    );
    expect(screen.getByTestId("r")).toHaveTextContent(
      "user_1|reporter@example.com|Reporter One|reporter|reporter"
    );
  });

  test("useCurrentRole returns null when session has no role", () => {
    setSession({
      user: {
        id: "user_no_role",
        email: "norole@example.com",
        name: "No Role",
        role: null,
      },
    });
    render(
      <RoleProvider>
        <ReadCurrent testId="r" />
      </RoleProvider>
    );
    expect(screen.getByTestId("r")).toHaveTextContent("null");
  });

  test("reactive update when session changes from null to reporter", () => {
    render(
      <RoleProvider>
        <ReadCurrent testId="r" />
      </RoleProvider>
    );
    expect(screen.getByTestId("r")).toHaveTextContent("null");
    act(() => {
      setSession({
        user: {
          id: "user_2",
          email: "a@example.com",
          name: "Admin",
          role: "dicht_admin",
        },
      });
    });
    expect(screen.getByTestId("r")).toHaveTextContent(
      "user_2|a@example.com|Admin|dicht_admin|dicht_admin"
    );
  });

  test("does NOT render any MockRoleSwitcher (AC-8)", () => {
    render(
      <RoleProvider>
        <span>app</span>
      </RoleProvider>
    );
    expect(screen.queryByRole("region", { name: /mock role switcher/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/dev only: mock role/i)).not.toBeInTheDocument();
  });
});
