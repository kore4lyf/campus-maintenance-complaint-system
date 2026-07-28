import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/utils/errors";
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

  test("renders the role intro and the raw error message in a pre tag", () => {
    render(
      <ErrorBoundary
        error={new Error("An unexpected thing happened")}
        reset={reset}
      />
    );
    expect(
      screen.getByText(/we hit an unexpected error rendering this page/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/An unexpected thing happened/i)
    ).toBeInTheDocument();
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

describe("error message rendering as exercised through the boundary", () => {
  test("renders fetch failure message in the pre element", () => {
    render(
      <ErrorBoundary
        error={new Error("fetch failed at url")}
        reset={reset}
      />
    );
    expect(
      screen.getByText("fetch failed at url")
    ).toBeInTheDocument();
  });

  test("renders timeout failure message in the pre element", () => {
    render(
      <ErrorBoundary
        error={new Error("Request timeout exceeded")}
        reset={reset}
      />
    );
    expect(
      screen.getByText("Request timeout exceeded")
    ).toBeInTheDocument();
  });
});
