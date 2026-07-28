import { render, screen } from "@testing-library/react";
import GlobalError from "./global-error";

const reset = jest.fn();

describe("app/global-error.tsx boundary", () => {
  test("renders an alert heading the user sees", () => {
    render(<GlobalError error={new Error("Boom")} reset={reset} />);
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
  });

  test("renders the raw error message when error.message is set", () => {
    render(<GlobalError error={new Error("Disk on fire")} reset={reset} />);
    expect(screen.getByText(/disk on fire/i)).toBeInTheDocument();
  });

  test("falls back to generic text when error has no message", () => {
    const emptyError = { message: "" } as unknown as Error;
    render(<GlobalError error={emptyError} reset={reset} />);
    expect(
      screen.getByText(/we hit an unexpected error rendering this page/i)
    ).toBeInTheDocument();
  });

  test("Try again button is present and calls reset on click", () => {
    render(<GlobalError error={new Error("Boom")} reset={reset} />);
    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeInTheDocument();
    button.click();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  test("renders the heading inside the visible error region", () => {
    const { container } = render(
      <GlobalError error={new Error("Boom")} reset={reset} />
    );
    expect(container.querySelector("h1")).not.toBeNull();
  });
});
