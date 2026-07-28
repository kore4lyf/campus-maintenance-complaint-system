import { render, screen } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/auth/actions", () => ({
  signOutAction: jest.fn(),
}));

import { SignOut } from "./SignOut";

describe("SignOut", () => {
  test("renders a button with accessible name 'Sign out'", () => {
    render(<SignOut />);
    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toBeInTheDocument();
  });
});
