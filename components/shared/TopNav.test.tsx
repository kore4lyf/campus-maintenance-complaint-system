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
import { TopNav } from "./TopNav";

jest.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: jest.fn(),
    resolvedTheme: "light",
  }),
}));

function setSession(session: SessionData) {
  currentSession = session;
  for (const l of listeners) l({ data: session });
}

beforeEach(() => {
  currentSession = null;
  listeners.clear();
});

function user(
  role: "reporter" | "dicht_admin" | "dicht_technician" | null,
  name: string = "Test User",
): SessionData {
  return {
    user: {
      id: "user_1",
      email: `${role ?? "anon"}@example.com`,
      name,
      role,
    },
  };
}

function renderWithSession(session: SessionData) {
  setSession(session);
  return render(
    <RoleProvider>
      <TopNav />
    </RoleProvider>
  );
}

describe("TopNav", () => {
  test("renders the LASU CMS brand link as the first interactive element", () => {
    renderWithSession(null);
    const brand = screen.getByRole("link", { name: /lasu cms/i });
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute("href", "/");
  });

  test("renders a banner with the primary navigation landmark", () => {
    renderWithSession(null);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
  });

  test("does not show SignOut when not authenticated", () => {
    renderWithSession(null);
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  test("shows SignOut when authenticated", () => {
    renderWithSession(user("reporter"));
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  test("hides primary nav links when role is null", () => {
    renderWithSession(null);
    expect(screen.queryByRole("link", { name: /^submit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /queue/i })).not.toBeInTheDocument();
  });

  test("shows Submit and My Complaints links for reporter", () => {
    renderWithSession(user("reporter"));
    expect(screen.getByRole("link", { name: /^submit$/i })).toHaveAttribute("href", "/complaints/new");
    expect(screen.getByRole("link", { name: /my complaints/i })).toHaveAttribute("href", "/complaints/mine");
  });

  test("shows Queue and Reports links for dicht_admin", () => {
    renderWithSession(user("dicht_admin"));
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/admin/queue");
    expect(screen.getByRole("link", { name: /^reports$/i })).toHaveAttribute("href", "/admin/reports");
    expect(screen.queryByRole("link", { name: /^submit$/i })).not.toBeInTheDocument();
  });

  test("shows only Queue link for dicht_technician", () => {
    renderWithSession(user("dicht_technician"));
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/technician/queue");
    expect(screen.queryByRole("link", { name: /^reports$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^submit$/i })).not.toBeInTheDocument();
  });
});
