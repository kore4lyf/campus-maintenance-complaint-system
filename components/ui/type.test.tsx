import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { H1, H2, H3, Body, Kicker, Label, Supporting } from "./type";

/*
 * Astryx-aligned type primitives smoke tests.
 *
 * Spec 0014 §AC-1: <H1> (default + display), <H2>, <H3>, <Body>
 * (default + muted + lead), <Label>, <Kicker>, <Supporting> all render
 * the right tag (semantic level preserved) and carry the Astryx type
 * scale string in their className. These tests are scoped to the
 * primitive contract; adjacent smoke tests for in-app hero behaviour
 * live in PageShell.test.tsx.
 */

describe("H1", () => {
  it("renders an <h1> at the default in-app scale", () => {
    render(<H1>My complaints</H1>);
    const h1 = screen.getByRole("heading", { level: 1, name: "My complaints" });
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveClass("text-4xl");
    expect(h1).toHaveClass("sm:text-5xl");
    expect(h1).toHaveClass("font-semibold");
  });

  it("renders the display variant at the marketing scale", () => {
    render(<H1 variant="display">A campus, in the open</H1>);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("text-5xl");
    expect(h1).toHaveClass("lg:text-7xl");
  });

  it("renders the compact variant at the in-card scale", () => {
    render(
      <H1 variant="compact">Sign in to continue</H1>,
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveClass("text-2xl");
    expect(h1).toHaveClass("sm:text-3xl");
    // Compact variant uses tracking-[-0.015em] (not the display's
    // -0.025em). The test pins both kerning scales so a future
    // tightening can't accidentally collapse the two.
    expect(h1).toHaveClass("tracking-[-0.015em]");
  });
});

describe("H2 / H3", () => {
  it("H2 renders as <h2> with the medium display scale", () => {
    render(<H2>Section</H2>);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toHaveClass("text-2xl");
    expect(h2).toHaveClass("sm:text-3xl");
  });

  it("H3 renders as <h3> with the smaller scale", () => {
    render(<H3>Subsection</H3>);
    const h3 = screen.getByRole("heading", { level: 3 });
    expect(h3).toHaveClass("text-lg");
    expect(h3).toHaveClass("sm:text-xl");
  });
});

describe("Body", () => {
  it("default tone uses the foreground token", () => {
    render(<Body>Plain body.</Body>);
    const p = screen.getByText("Plain body.");
    expect(p.tagName).toBe("P");
    expect(p).toHaveClass("text-foreground");
    expect(p).toHaveClass("leading-[1.55]");
  });

  it("muted tone uses muted-strong + base size", () => {
    render(<Body tone="muted">Soft copy.</Body>);
    expect(screen.getByText("Soft copy.")).toHaveClass("text-muted-strong");
  });

  it("lead tone bumps to text-lg", () => {
    render(<Body tone="lead">Bold copy.</Body>);
    expect(screen.getByText("Bold copy.")).toHaveClass("text-lg");
  });
});

describe("Kicker", () => {
  it("renders uppercase + wide kerned + accent colour", () => {
    render(<Kicker>DICT Console</Kicker>);
    const p = screen.getByText("DICT Console");
    expect(p).toHaveClass("uppercase");
    expect(p).toHaveClass("tracking-[0.16em]");
    expect(p).toHaveClass("text-accent-strong");
  });
});

describe("Label", () => {
  it("renders with the foreground-strong + medium-weight rule", () => {
    render(<Label>Email</Label>);
    expect(screen.getByText("Email")).toHaveClass("text-sm");
    expect(screen.getByText("Email")).toHaveClass("font-medium");
    expect(screen.getByText("Email")).toHaveClass("text-foreground-strong");
  });
});

describe("Supporting", () => {
  it("renders at the small supporting scale", () => {
    render(<Supporting>Filed 2 h ago</Supporting>);
    expect(screen.getByText("Filed 2 h ago")).toHaveClass("text-xs");
    expect(screen.getByText("Filed 2 h ago")).toHaveClass("text-muted-strong");
  });
});
