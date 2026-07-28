import { render, screen } from "@testing-library/react";
import { ReporterDashboardEmpty } from "./ReporterDashboardEmpty";

describe("ReporterDashboardEmpty", () => {
  test("shows the empty dashboard heading", () => {
    render(<ReporterDashboardEmpty />);
    expect(
      screen.getByRole("heading", { name: /no complaints yet/i })
    ).toBeInTheDocument();
  });

  test("shows explanatory copy", () => {
    render(<ReporterDashboardEmpty />);
    expect(
      screen.getByText(/submit your first maintenance complaint/i)
    ).toBeInTheDocument();
  });

  test("exposes a primary CTA link to /complaints/new", () => {
    render(<ReporterDashboardEmpty />);
    const cta = screen.getByRole("link", { name: /submit a complaint/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/complaints/new");
  });
});
