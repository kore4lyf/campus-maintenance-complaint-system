import { render, screen } from "@testing-library/react";
import { SignOut } from "./SignOut";

describe("SignOut", () => {
  test("renders a button with accessible name 'Sign out'", () => {
    render(<SignOut />);
    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("type", "button");
  });
});
