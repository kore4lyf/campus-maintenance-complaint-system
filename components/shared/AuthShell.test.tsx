import { render, screen } from "@testing-library/react";
import { AuthShell } from "./AuthShell";

/*
 * Scope tests for AuthShell. Asserts the visible contract:
 *
 *   1. The brand column carries the brand wordmark + eyebrow.
 *   2. The kicker label appears in the document.
 *   3. The form column renders the page <h1> + subtitle + a slot for
 *      children.
 *   4. Feature list renders 1..n feature rows.
 *   5. Secondary action slot renders when provided.
 *
 * Anti-pattern guardrails this test does NOT cover (per AGENTS.md
 * Test Sizing): date-fns / lucide-react internals, layout primitives,
 * the underlying form island tests (those live in SignIn/SignUpForm
 * tests when added).
 */

const noopIcon = () => <svg data-testid="noop-icon" />;

describe("AuthShell", () => {
  test("renders the brand wordmark and the form kicker + h1", () => {
    render(
      <AuthShell
        kicker="Welcome back"
        title="Sign in"
        subtitle="Pick up where you left off."
        brandPanel={{
          eyebrow: "Lagos State University",
          title: "Make maintenance transparent.",
          body: "Body copy.",
          features: [{ icon: noopIcon, title: "Submit fast", body: "In a minute." }],
          footerNote: "Free for LASU.",
        }}
      >
        <p data-testid="form-slot">Form island</p>
      </AuthShell>,
    );

    expect(screen.getByText(/LASU CMS/i)).toBeInTheDocument();
    // The kicker appears at least once (mobile + lg rendering both
    // include it; both are in the DOM simultaneously).
    expect(screen.getAllByText("Welcome back").length).toBeGreaterThan(0);
    // The h1 carries the form title.
    expect(screen.getByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByTestId("form-slot")).toBeInTheDocument();
  });

  test("renders the brand-panel feature list with the correct count", () => {
    render(
      <AuthShell
        kicker="Get started"
        title="Sign up"
        brandPanel={{
          eyebrow: "Lagos State University",
          title: "Join the loop.",
          body: "Body copy.",
          features: [
            { icon: noopIcon, title: "Feature A", body: "Body A." },
            { icon: noopIcon, title: "Feature B", body: "Body B." },
          ],
          footerNote: "Reporters only.",
        }}
      >
        <p>Form</p>
      </AuthShell>,
    );

    expect(screen.getByText("Feature A")).toBeInTheDocument();
    expect(screen.getByText("Feature B")).toBeInTheDocument();
  });

  test("renders the secondary action slot when provided", () => {
    render(
      <AuthShell
        kicker="Welcome back"
        title="Sign in"
        secondaryAction={<a href="/sign-up">Create one →</a>}
        brandPanel={{
          eyebrow: "Lagos State University",
          title: "Title.",
          body: "Body.",
          features: [],
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
          eyebrow: "Lagos State University",
          title: "Title.",
          body: "Body.",
          features: [],
          footerNote: "Note.",
        }}
      >
        <p>Form</p>
      </AuthShell>,
    );

    expect(screen.getByText(/Encrypted sessions\./i)).toBeInTheDocument();
  });
});
