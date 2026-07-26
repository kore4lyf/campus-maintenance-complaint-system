type Listener = (state: { data: SessionData | null }) => void;

type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: "reporter" | "dicht_admin" | "dicht_technician" | null;
};

type SessionData = { user: SessionUser } | null;

const listeners = new Set<Listener>();
let currentSession: SessionData = null;

jest.mock("better-auth/react", () => ({
  createAuthClient: () => ({
    useSession: () => ({
      get data() {
        return currentSession;
      },
      subscribe(listener: Listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    }),
  }),
}));

import { render, screen } from "@testing-library/react";
import { RoleProvider } from "@/lib/auth/role-context";
import { MobileBottomNav } from "./MobileBottomNav";

function setSession(session: SessionData) {
  currentSession = session;
  for (const l of listeners) l({ data: session });
}

beforeEach(() => {
  currentSession = null;
  listeners.clear();
});

function user(role: "reporter" | "dicht_admin" | "dicht_technician"): SessionData {
  return {
    user: {
      id: "user_1",
      email: `${role}@example.com`,
      name: "Test",
      role,
    },
  };
}

function renderWithSession(session: SessionData) {
  setSession(session);
  return render(
    <RoleProvider>
      <MobileBottomNav />
    </RoleProvider>
  );
}

describe("MobileBottomNav", () => {
  test("renders nothing when role is null", () => {
    const { container } = renderWithSession(null);
    expect(container.firstChild).toBeNull();
  });

  test("renders a mobile navigation landmark when a role is present", () => {
    renderWithSession(user("reporter"));
    expect(
      screen.getByRole("navigation", { name: /mobile navigation/i })
    ).toBeInTheDocument();
  });

  test("shows Submit, List, Mine tabs for reporter", () => {
    renderWithSession(user("reporter"));
    expect(screen.getByRole("link", { name: /^submit$/i })).toHaveAttribute("href", "/complaints/new");
    expect(screen.getByRole("link", { name: /^list$/i })).toHaveAttribute("href", "/complaints");
    expect(screen.getByRole("link", { name: /^mine$/i })).toHaveAttribute("href", "/complaints/mine");
  });

  test("shows Queue and Reports tabs for dicht_admin", () => {
    renderWithSession(user("dicht_admin"));
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/admin/queue");
    expect(screen.getByRole("link", { name: /^reports$/i })).toHaveAttribute("href", "/admin/reports");
  });

  test("shows only Queue tab for dicht_technician", () => {
    renderWithSession(user("dicht_technician"));
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/technician/queue");
    expect(screen.queryByRole("link", { name: /^reports$/i })).not.toBeInTheDocument();
  });
});
