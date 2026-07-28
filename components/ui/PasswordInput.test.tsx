import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "./Field";

function getInput(container: HTMLElement) {
  return container.querySelector("input") as HTMLInputElement;
}

describe("PasswordInput", () => {
  test("renders as password type by default", () => {
    const { container } = render(<PasswordInput />);
    expect(getInput(container)).toHaveAttribute("type", "password");
  });

  test("toggles to text type when show button is clicked", () => {
    const { container } = render(<PasswordInput />);
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(getInput(container)).toHaveAttribute("type", "text");
  });

  test("toggles back to password type on second click", () => {
    const { container } = render(<PasswordInput />);
    fireEvent.click(screen.getByRole("button", { name: /show password/i }));
    fireEvent.click(screen.getByRole("button", { name: /hide password/i }));
    expect(getInput(container)).toHaveAttribute("type", "password");
  });

  test("toggle button has correct aria-pressed state", () => {
    render(<PasswordInput />);
    const toggle = screen.getByRole("button", { name: /show password/i });

    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: /hide password/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("forwards ref to the input element", () => {
    const ref = { current: null };
    render(<PasswordInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  test("passes input props through", () => {
    const { container } = render(
      <PasswordInput placeholder="Enter password" id="pw" />,
    );
    expect(getInput(container)).toHaveAttribute("id", "pw");
    expect(getInput(container)).toHaveAttribute("placeholder", "Enter password");
  });
});
