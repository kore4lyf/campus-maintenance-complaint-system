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

function renderWithRole(role: "reporter" | "dicht_admin" | "dicht_technician" | null) {
  return render(
    <RoleProvider initial={role}>
      <TopNav />
    </RoleProvider>
  );
}

describe("TopNav", () => {
  test("renders the LASU CMS brand link as the first interactive element", () => {
    renderWithRole(null);
    const brand = screen.getByRole("link", { name: /lasu cms/i });
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute("href", "/");
  });

  test("renders a banner with the primary navigation landmark", () => {
    renderWithRole(null);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /primary/i })).toBeInTheDocument();
  });

  test("renders the theme toggle and sign out buttons on every role", () => {
    renderWithRole(null);
    expect(screen.getByRole("button", { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  test("hides primary nav links when role is null", () => {
    renderWithRole(null);
    expect(screen.queryByRole("link", { name: /^submit$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /queue/i })).not.toBeInTheDocument();
  });

  test("shows Submit and My Complaints links for reporter", () => {
    renderWithRole("reporter");
    expect(screen.getByRole("link", { name: /^submit$/i })).toHaveAttribute("href", "/complaints/new");
    expect(screen.getByRole("link", { name: /my complaints/i })).toHaveAttribute("href", "/complaints");
  });

  test("shows Queue and Reports links for dicht_admin", () => {
    renderWithRole("dicht_admin");
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/admin/queue");
    expect(screen.getByRole("link", { name: /^reports$/i })).toHaveAttribute("href", "/admin/reports");
    expect(screen.queryByRole("link", { name: /^submit$/i })).not.toBeInTheDocument();
  });

  test("shows only Queue link for dicht_technician", () => {
    renderWithRole("dicht_technician");
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/technician/queue");
    expect(screen.queryByRole("link", { name: /^reports$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^submit$/i })).not.toBeInTheDocument();
  });
});
