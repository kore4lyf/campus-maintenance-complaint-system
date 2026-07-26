import { render, screen } from "@testing-library/react";
import { RoleProvider } from "@/lib/auth/role-context";
import { MobileBottomNav } from "./MobileBottomNav";

function renderWithRole(role: "reporter" | "dicht_admin" | "dicht_technician" | null) {
  return render(
    <RoleProvider initial={role}>
      <MobileBottomNav />
    </RoleProvider>
  );
}

describe("MobileBottomNav", () => {
  test("renders nothing when role is null", () => {
    const { container } = renderWithRole(null);
    expect(container.firstChild).toBeNull();
  });

  test("renders a mobile navigation landmark when a role is present", () => {
    renderWithRole("reporter");
    expect(
      screen.getByRole("navigation", { name: /mobile navigation/i })
    ).toBeInTheDocument();
  });

  test("shows Submit, List, Mine tabs for reporter", () => {
    renderWithRole("reporter");
    expect(screen.getByRole("link", { name: /^submit$/i })).toHaveAttribute("href", "/complaints/new");
    expect(screen.getByRole("link", { name: /^list$/i })).toHaveAttribute("href", "/complaints");
    expect(screen.getByRole("link", { name: /^mine$/i })).toHaveAttribute("href", "/complaints/mine");
  });

  test("shows Queue and Reports tabs for dicht_admin", () => {
    renderWithRole("dicht_admin");
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/admin/queue");
    expect(screen.getByRole("link", { name: /^reports$/i })).toHaveAttribute("href", "/admin/reports");
  });

  test("shows only Queue tab for dicht_technician", () => {
    renderWithRole("dicht_technician");
    expect(screen.getByRole("link", { name: /^queue$/i })).toHaveAttribute("href", "/technician/queue");
    expect(screen.queryByRole("link", { name: /^reports$/i })).not.toBeInTheDocument();
  });
});
