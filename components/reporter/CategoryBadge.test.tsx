import { render, screen } from "@testing-library/react";
import { CategoryBadge } from "./CategoryBadge";

describe("CategoryBadge", () => {
  test("renders the category name", () => {
    render(<CategoryBadge name="Plumbing Issues" systemType="Plumbing" />);
    expect(screen.getByText("Plumbing Issues")).toBeInTheDocument();
  });

  test("falls back to muted styling for unknown systemType", () => {
    render(<CategoryBadge name="Other Maintenance" systemType="Other" />);
    expect(screen.getByText("Other Maintenance")).toBeInTheDocument();
  });
});
