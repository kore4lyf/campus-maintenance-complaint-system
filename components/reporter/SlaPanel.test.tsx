import { render, screen } from "@testing-library/react";
import { SlaPanel } from "./SlaPanel";

/*
 * Scope tests for <SlaPanel>. The substantive side effect of this
 * primitive is the visual contract for the dual-deadline tile:
 *
 *   - Two tiles labelled "Acknowledge" and "Resolve".
 *   - The headline reads "in N h/m/d" when both deadlines are future.
 *   - When `isTerminal` is set, the headline collapses to "Met".
 *   - Hairline progress bars are rendered (one per tile).
 *
 * Anti-pattern guardrails that this test suite does NOT cover (and
 * should not — by AGENTS.md Test Sizing):
 *   - Library internals (date-fns formatting, formatDistanceToNowStrict).
 *   - Adjacent feature contracts (SlaCountdown, ComplaintTimeline).
 *   - Snapshot tests of every layout detail.
 *
 * The existing SlaCountdown tests stay the source of truth for the
 * Badge shape; SlaPanel tests focus only on the new dual-tile
 * composition.
 */

function futureIso(hoursAhead: number): string {
  return new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();
}

describe("SlaPanel", () => {
  test("renders the two deadline labels and a hairline progress meter per tile", () => {
    render(
      <SlaPanel
        acknowledgeLabel="Acknowledge"
        acknowledgeDeadline={futureIso(4)}
        resolveLabel="Resolve"
        resolveDeadline={futureIso(20)}
      />,
    );

    expect(screen.getByText(/Acknowledge/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolve/i)).toBeInTheDocument();

    const meters = screen.getAllByRole("meter");
    // Two deadline tiles → two progress meters.
    expect(meters).toHaveLength(2);
  });

  test("renders the calm Done headline when the complaint is in a terminal state", () => {
    render(
      <SlaPanel
        acknowledgeLabel="Acknowledge"
        acknowledgeDeadline={futureIso(4)}
        resolveLabel="Resolve"
        resolveDeadline={futureIso(20)}
        isTerminal
      />,
    );

    // Both tiles should now read "Done".
    expect(screen.getAllByText((_, element) => element?.textContent === "Done")).toHaveLength(2);
  });

  test("renders in-N-hours-style headline for a far-future deadline", () => {
    render(
      <SlaPanel
        acknowledgeLabel="Acknowledge"
        acknowledgeDeadline={futureIso(72)}
        resolveLabel="Resolve"
        resolveDeadline={futureIso(168)}
      />,
    );

    // "in 3 days" / "in 7 days" — assert the headline prefix rather
    // than the exact number to remain robust against date-fns wording.
    expect(screen.getAllByText((_, element) => /^in /.test(element?.textContent ?? "")).length).toBeGreaterThan(0);
  });

  test("renders the caption slot when provided", () => {
    render(
      <SlaPanel
        acknowledgeLabel="Acknowledge"
        acknowledgeDeadline={futureIso(4)}
        resolveLabel="Resolve"
        resolveDeadline={futureIso(20)}
        caption={<span>Mock caption</span>}
      />,
    );

    expect(screen.getByText("Mock caption")).toBeInTheDocument();
  });
});
