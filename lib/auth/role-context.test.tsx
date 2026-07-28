import React from "react";

type Listener = (state: { data: SessionData | null }) => void;

type SessionData = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
  } | null;
} | null;

let setSessionState: ((next: SessionData) => void) | null = null;

jest.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => {
      const [data, setData] = React.useState<SessionData>(null);
      setSessionState = setData;
      return { data };
    },
  }),
}));

function setSession(next: SessionData) {
  if (setSessionState) setSessionState(next);
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
  setSessionState = null;
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
    render(
      <RoleProvider>
        <ReadCurrent testId="r" />
      </RoleProvider>
    );
    act(() => {
      setSession({
        user: {
          id: "user_1",
          email: "reporter@example.com",
          name: "Reporter One",
          role: "reporter",
        },
      });
    });
    expect(screen.getByTestId("r")).toHaveTextContent(
      "user_1|reporter@example.com|Reporter One|reporter|reporter"
    );
  });

  test("useCurrentRole defaults to reporter when session has no role", () => {
    render(
      <RoleProvider>
        <ReadCurrent testId="r" />
      </RoleProvider>
    );
    act(() => {
      setSession({
        user: {
          id: "user_no_role",
          email: "norole@example.com",
          name: "No Role",
          role: null,
        },
      });
    });
    expect(screen.getByTestId("r")).toHaveTextContent(
      "user_no_role|norole@example.com|No Role|reporter|reporter"
    );
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
