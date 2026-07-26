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
      screen.getByText(/nothing in the queue right now/i)
    ).toBeInTheDocument();
  });

  test("renders an icon-only visual (aria hidden decoration, no interactive elements)", () => {
    render(<AdminQueueEmpty />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
