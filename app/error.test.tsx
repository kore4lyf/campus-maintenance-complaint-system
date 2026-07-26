import { render, screen } from "@testing-library/react";
import { ApiError, toUserMessage } from "@/lib/utils/errors";
import ErrorBoundary from "./error";

const reset = jest.fn();

describe("app/error.tsx boundary", () => {
  beforeEach(() => {
    reset.mockClear();
  });

  test("renders an alert heading", () => {
    render(
      <ErrorBoundary
        error={new Error("An unexpected thing happened")}
        reset={reset}
      />
    );
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
  });

  test("renders the user safe message from toUserMessage(error), not the raw message", () => {
    render(
      <ErrorBoundary
        error={new Error("An unexpected thing happened")}
        reset={reset}
      />
    );
    expect(
      screen.getByText(/try again later/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/An unexpected thing happened/i)
    ).not.toBeInTheDocument();
  });

  test("renders raw ApiError messages as-is (user safe by construction)", () => {
    render(
      <ErrorBoundary
        error={new ApiError("NOT_FOUND", "Complaint not found", 404)}
        reset={reset}
      />
    );
    expect(screen.getByText(/complaint not found/i)).toBeInTheDocument();
  });

  test("Try again button is present and calls reset on click", () => {
    render(
      <ErrorBoundary
        error={new Error("An unexpected thing happened")}
        reset={reset}
      />
    );
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("toUserMessage helper as exercised through the boundary", () => {
  test("renders fetch failure with the friendly network message", () => {
    render(
      <ErrorBoundary
        error={new Error("fetch failed at url")}
        reset={reset}
      />
    );
    expect(
      screen.getByText(/a network error occurred/i)
    ).toBeInTheDocument();
  });

  test("renders timeout failure with the friendly timeout message", () => {
    render(
      <ErrorBoundary
        error={new Error("Request timeout exceeded")}
        reset={reset}
      />
    );
    expect(
      screen.getByText(/request took too long/i)
    ).toBeInTheDocument();
  });
});
