import { render, screen } from "@testing-library/react";
import { AdminQueueEmpty } from "./AdminQueueEmpty";

describe("AdminQueueEmpty", () => {
  test("shows the empty queue heading", () => {
    render(<AdminQueueEmpty />);
    expect(screen.getByRole("heading", { name: /queue is empty/i })).toBeInTheDocument();
  });

  test("shows explanatory copy", () => {
    render(<AdminQueueEmpty />);
    expect(
      screen.getByText(/no complaints are waiting/i)
    ).toBeInTheDocument();
  });

  test("includes a View reports link by default", () => {
    render(<AdminQueueEmpty />);
    const link = screen.getByRole("link", { name: /view reports/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin/reports");
  });
});
