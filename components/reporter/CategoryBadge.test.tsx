import { render, screen } from "@testing-library/react";
import { CategoryBadge } from "./CategoryBadge";

describe("CategoryBadge", () => {
  test("renders the category name and system type", () => {
    render(<CategoryBadge name="Plumbing Issues" systemType="Plumbing" />);
    expect(screen.getByText("Plumbing Issues")).toBeInTheDocument();
    expect(screen.getByLabelText(/Plumbing Issues \(Plumbing\)/)).toBeInTheDocument();
  });

  test("falls back to muted styling for unknown systemType", () => {
    render(<CategoryBadge name="Other Maintenance" systemType="Other" />);
    expect(screen.getByText("Other Maintenance")).toBeInTheDocument();
  });
});
