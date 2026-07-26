import { render, screen } from "@testing-library/react";

const useThemeMock = jest.fn(() => ({
  theme: "light",
  setTheme: jest.fn(),
  resolvedTheme: "light",
}));

jest.mock("next-themes", () => ({
  useTheme: () => useThemeMock(),
}));

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    useThemeMock.mockReturnValue({
      theme: "light",
      setTheme: jest.fn(),
      resolvedTheme: "light",
    });
  });

  test("renders the toggle button with theme switch accessible name (light state)", () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /switch to dark mode/i })
    ).toBeInTheDocument();
  });

  test("renders the toggle button with theme switch accessible name (dark state)", () => {
    useThemeMock.mockReturnValue({
      theme: "dark",
      setTheme: jest.fn(),
      resolvedTheme: "dark",
    });
    render(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /switch to light mode/i })
    ).toBeInTheDocument();
  });

  test("clicking the button calls setTheme with the opposite theme", () => {
    const setTheme = jest.fn();
    useThemeMock.mockReturnValue({
      theme: "light",
      setTheme,
      resolvedTheme: "light",
    });

    render(<ThemeToggle />);
    screen.getByRole("button", { name: /switch to dark mode/i }).click();
    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});
