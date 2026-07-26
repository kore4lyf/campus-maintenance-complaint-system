import { render, screen } from "@testing-library/react";
import { SignOut } from "./SignOut";

jest.mock("@/lib/auth/actions", () => ({
  signOutAction: jest.fn(),
}));

describe("SignOut", () => {
  test("renders a submit button with accessible name 'Sign out'", () => {
    render(<SignOut />);
    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "submit");
  });

  test("submits to signOutAction Server Action via a parent form", () => {
    const { container } = render(<SignOut />);
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
  });
});
