import { render, screen } from "@testing-library/react";
import AdminLayout from "./layout";

jest.mock("@/components/shared/TopNav", () => ({
  TopNav: () => <header data-testid="topnav" />,
}));
jest.mock("@/components/shared/MobileBottomNav", () => ({
  MobileBottomNav: () => <nav data-testid="mobile-bottom-nav" />,
}));

describe("AdminLayout", () => {
  test("renders TopNav above main and MobileBottomNav below", () => {
    render(
      <AdminLayout>
        <p data-testid="page-content">page content</p>
      </AdminLayout>
    );
    expect(screen.getByTestId("topnav")).toBeInTheDocument();
    expect(screen.getByTestId("page-content")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-bottom-nav")).toBeInTheDocument();

    const topnavY = screen.getByTestId("topnav").getBoundingClientRect().top;
    const contentY = screen.getByTestId("page-content").getBoundingClientRect().top;
    const bottomNavY = screen.getByTestId("mobile-bottom-nav").getBoundingClientRect().top;
    expect(topnavY).toBeLessThanOrEqual(contentY);
    expect(contentY).toBeLessThanOrEqual(bottomNavY);
  });

  test("main landmark exists with id main-content", () => {
    render(
      <AdminLayout>
        <span>x</span>
      </AdminLayout>
    );
    const main = screen.getByRole("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute("id", "main-content");
  });

  test("renders whatever children are passed through", () => {
    render(
      <AdminLayout>
        <span data-testid="child-1">one</span>
        <span data-testid="child-2">two</span>
      </AdminLayout>
    );
    expect(screen.getByTestId("child-1")).toHaveTextContent("one");
    expect(screen.getByTestId("child-2")).toHaveTextContent("two");
  });
});
