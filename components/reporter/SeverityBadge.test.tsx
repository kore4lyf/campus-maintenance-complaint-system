import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  test.each([
    ["Critical", "Critical"],
    ["High", "High"],
    ["Medium", "Medium"],
    ["Low", "Low"],
  ] as const)("renders label %s", (severity, label) => {
    render(<SeverityBadge severity={severity} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  test("adds an aria-label per severity", () => {
    render(<SeverityBadge severity="Critical" />);
    expect(screen.getByLabelText("Severity Critical")).toBeInTheDocument();
  });
});
