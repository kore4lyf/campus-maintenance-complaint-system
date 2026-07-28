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
});
