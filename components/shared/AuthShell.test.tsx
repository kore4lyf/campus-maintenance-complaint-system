import { render, screen } from "@testing-library/react";
import { AuthShell } from "./AuthShell";

/*
 * Scope tests for AuthShell. Asserts the visible contract:
 *
 *   1. The brand column carries the brand wordmark.
 *   2. The kicker label appears in the document.
 *   3. The form column renders the page <h1> + a slot for children.
 *   4. Secondary action slot renders when provided.
 *
 * Anti-pattern guardrails this test does NOT cover (per AGENTS.md
 * Test Sizing): date-fns / lucide-react internals, layout primitives,
 * the underlying form island tests (those live in SignIn/SignUpForm
 * tests when added).
 */

describe("AuthShell", () => {
  test("renders the brand wordmark and the form kicker + h1", () => {
    render(
      <AuthShell
        kicker="Welcome back"
        title="Sign in"
        brandPanel={{
          footerNote: "Free for LASU.",
        }}
      >
        <p data-testid="form-slot">Form island</p>
      </AuthShell>,
    );

    expect(screen.getAllByRole("img", { name: /LASU CMS/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Welcome back").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByTestId("form-slot")).toBeInTheDocument();
  });

  test("renders the secondary action slot when provided", () => {
    render(
      <AuthShell
        kicker="Welcome back"
        title="Sign in"
        secondaryAction={<a href="/sign-up">Create one →</a>}
        brandPanel={{
          footerNote: "Note.",
        }}
      >
        <p>Form</p>
      </AuthShell>,
    );

    expect(
      screen.getByRole("link", { name: /Create one/i }),
    ).toBeInTheDocument();
  });

  test("renders the reassurance note when provided", () => {
    render(
      <AuthShell
        kicker="Welcome back"
        title="Sign in"
        reassurance={<span>Encrypted sessions.</span>}
        brandPanel={{
          footerNote: "Note.",
        }}
      >
        <p>Form</p>
      </AuthShell>,
    );

    expect(screen.getByText(/Encrypted sessions\./i)).toBeInTheDocument();
  });
});
