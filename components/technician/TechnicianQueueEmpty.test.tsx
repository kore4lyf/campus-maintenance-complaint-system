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
      screen.getByText(/don.{0,3}t have any assigned complaints/i)
    ).toBeInTheDocument();
  });

  test("does not include a CTA when there are no assignments to act on", () => {
    render(<TechnicianQueueEmpty />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
