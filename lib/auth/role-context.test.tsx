import { act, render, screen } from "@testing-library/react";
import { RoleProvider, useCurrentRole } from "./role-context";

describe("RoleProvider", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ALLOW_MOCK_ROLE;
  });

  function ReadRole({ testId }: { testId: string }) {
    const role = useCurrentRole();
    return <span data-testid={testId}>{role ?? "null"}</span>;
  }

  test("renders children inside the provider", () => {
    render(
      <RoleProvider>
        <span data-testid="child">child content</span>
      </RoleProvider>
    );
    expect(screen.getByTestId("child")).toHaveTextContent("child content");
  });

  test("useCurrentRole returns null by default when no initial value provided", () => {
    render(
      <RoleProvider>
        <ReadRole testId="r" />
      </RoleProvider>
    );
    expect(screen.getByTestId("r")).toHaveTextContent("null");
  });

  test("useCurrentRole returns provided initial value", () => {
    render(
      <RoleProvider initial="reporter">
        <ReadRole testId="r" />
      </RoleProvider>
    );
    expect(screen.getByTestId("r")).toHaveTextContent("reporter");
  });

  test("does not render MockRoleSwitcher when NEXT_PUBLIC_ALLOW_MOCK_ROLE is unset", () => {
    render(<RoleProvider><span>app</span></RoleProvider>);
    expect(screen.queryByRole("region", { name: /mock role switcher/i })).not.toBeInTheDocument();
  });

  test("renders MockRoleSwitcher when NEXT_PUBLIC_ALLOW_MOCK_ROLE equals '1'", () => {
    process.env.NEXT_PUBLIC_ALLOW_MOCK_ROLE = "1";
    render(<RoleProvider><span>app</span></RoleProvider>);
    expect(screen.getByRole("region", { name: /mock role switcher/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /no role \(signed out\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reporter$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dict admin/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dict technician/i })).toBeInTheDocument();
  });

  test("MockRoleSwitcher buttons update the role context value", () => {
    process.env.NEXT_PUBLIC_ALLOW_MOCK_ROLE = "1";
    render(
      <RoleProvider>
        <ReadRole testId="r" />
      </RoleProvider>
    );

    expect(screen.getByTestId("r")).toHaveTextContent("null");

    act(() => {
      screen.getByRole("button", { name: /^reporter$/i }).click();
    });
    expect(screen.getByTestId("r")).toHaveTextContent("reporter");

    act(() => {
      screen.getByRole("button", { name: /dict admin/i }).click();
    });
    expect(screen.getByTestId("r")).toHaveTextContent("dicht_admin");

    act(() => {
      screen.getByRole("button", { name: /dict technician/i }).click();
    });
    expect(screen.getByTestId("r")).toHaveTextContent("dicht_technician");

    act(() => {
      screen.getByRole("button", { name: /no role \(signed out\)/i }).click();
    });
    expect(screen.getByTestId("r")).toHaveTextContent("null");
  });
});
