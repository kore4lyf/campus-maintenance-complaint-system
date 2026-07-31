import { render, screen } from "@testing-library/react";
import { SlaCountdown } from "./SlaCountdown";

describe("SlaCountdown", () => {
  test("shows future tone for a deadline ahead of now", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    render(<SlaCountdown label="Resolve by" deadline={future} />);
    expect(screen.getByText(/Resolve by:/)).toBeInTheDocument();
    expect(screen.getByText(/in \d/).textContent).toBeTruthy();
  });

  test("shows past tone for a deadline behind now", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
    render(<SlaCountdown label="Acknowledge by" deadline={past} />);
    expect(screen.getByText(/Acknowledge by:/)).toBeInTheDocument();
    expect(screen.getByText(/overdue/).textContent).toBeTruthy();
  });

  test("emphasize prop renders danger tone for overdue deadline", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 4);
    render(<SlaCountdown label="Acknowledge" deadline={past} emphasize />);
    expect(screen.getByText(/overdue/)).toBeInTheDocument();
  });

  test("renders unknown fallback for an invalid date string", () => {
    render(<SlaCountdown label="Acknowledge by" deadline={"not-a-date"} />);
    expect(screen.getByText(/unknown/)).toBeInTheDocument();
  });
});
