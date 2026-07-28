import { render, screen } from "@testing-library/react";
import { TechnicianQueueEmpty } from "./TechnicianQueueEmpty";

describe("TechnicianQueueEmpty", () => {
  test("shows the empty queue heading", () => {
    render(<TechnicianQueueEmpty />);
    expect(
      screen.getByRole("heading", { name: /no assigned complaints/i })
    ).toBeInTheDocument();
  });

  test("shows explanatory copy", () => {
    render(<TechnicianQueueEmpty />);
    expect(
      screen.getByText(/don't have any assigned complaints yet/i)
    ).toBeInTheDocument();
  });

  test("includes a Refresh queue link by default", () => {
    render(<TechnicianQueueEmpty />);
    const link = screen.getByRole("link", { name: /refresh queue/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/technician/queue");
  });
});
