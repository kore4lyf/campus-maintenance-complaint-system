import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  PageShell,
  HeroBand,
  HeroBody,
  PageShellCtaBand,
} from "./PageShell";

/*
 * PageShell — scope tests for the page-level rhythm contract introduced in
 * spec 0013 (in-app UI lift).
 *
 * These tests cover the component's own ACs and the two new CSS utility
 * classes (.section-raised, .cta-band-brand) by static presence-checks on
 * the rendered output (Tailwind class names are observable on the DOM).
 * They do NOT retest Card / Button / TopNav / MobileBottomNav, which are
 * covered by their own suites.
 */

describe("PageShell", () => {
  it("renders children inside a hero-shell wrapper by default", () => {
    render(
      <PageShell>
        <p>page body</p>
      </PageShell>,
    );
    // displayVariant="hero" wraps in a bg-surface container; AC-1.
    const surfaceRoot = document.querySelector(".bg-surface");
    expect(surfaceRoot).toBeInTheDocument();
    expect(screen.getByText("page body")).toBeInTheDocument();
  });

  it("renders nothing extra in the 'none' variant", () => {
    render(
      <PageShell displayVariant="none">
        <span data-testid="payload" />
      </PageShell>,
    );
    // 'none' renders {children} untransformed: still mounts the payload
    // and does not introduce an extra bg-surface wrapper above it.
    expect(screen.getByTestId("payload")).toBeInTheDocument();
  });

  it("renders the 'flat' variant with a max-w-7xl container", () => {
    render(
      <PageShell displayVariant="flat">
        <p>flat body</p>
      </PageShell>,
    );
    const maxWWrapper = document.querySelector(".max-w-7xl");
    expect(maxWWrapper).toBeInTheDocument();
    expect(screen.getByText("flat body")).toBeInTheDocument();
  });
});

describe("HeroBand", () => {
  it("renders the section-raised utility band with kicker, title, and subtitle", () => {
    render(
      <HeroBand
        kicker="DICT Console"
        title="Queue"
        subtitle="Manage and assign incoming complaints."
      />,
    );

    // AC-2: .section-raised utility class is present on the HeroBand.
    const section = document.querySelector(".section-raised");
    expect(section).toBeInTheDocument();

    // h1 is rendered (and contains the title text).
    const heading = screen.getByRole("heading", { level: 1, name: "Queue" });
    expect(heading).toBeInTheDocument();

    // Gold kicker renders uppercase tracking-wider.
    expect(screen.getByText("DICT Console")).toHaveClass("text-accent-strong");

    // Subtitle paragraph renders.
    expect(
      screen.getByText("Manage and assign incoming complaints."),
    ).toBeInTheDocument();
  });

  it("renders the actions slot on the right when provided", () => {
    render(
      <HeroBand
        title="My complaints"
        actions={<button>New complaint</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "New complaint" })).toBeInTheDocument();
  });
});

describe("HeroBody", () => {
  it("renders the body container with max-w-7xl horizontal gutters", () => {
    render(
      <HeroBody>
        <p>body content</p>
      </HeroBody>,
    );
    const wrapper = document.querySelector(".max-w-7xl");
    expect(wrapper).toBeInTheDocument();
    expect(screen.getByText("body content")).toBeInTheDocument();
  });
});

describe("PageShellCtaBand", () => {
  it("renders the cta-band-brand utility band with a navy closer + action", () => {
    render(
      <PageShellCtaBand
        title="Spot a new issue on campus?"
        body="Report a fault in under a minute."
        action={<button>Report a fault</button>}
      />,
    );

    // AC-2: .cta-band-brand utility class is present on the closer band.
    const section = document.querySelector(".cta-band-brand");
    expect(section).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Spot a new issue on campus?",
    );
    expect(
      screen.getByText("Report a fault in under a minute."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Report a fault" }),
    ).toBeInTheDocument();
  });
});
