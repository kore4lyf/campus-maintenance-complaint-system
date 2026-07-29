import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ComplaintRow } from "./ComplaintRow";

/*
 * ComplaintRow smoke tests.
 *
 * Spec 0014 §AC-3: this component is the new edge-to-edge list row
 * that replaced <ComplaintCard> (reporter) and the inline row in
 * <QueueRow> (admin). These tests pin the visual signature — that
 * the row is NOT a Card (no rounded-* on the chrome), that it
 * carries a 1 px bottom border parent (parent ul provides
 * `divide-border`), and that the navigate vs select rendering
 * shape are both supported.
 *
 * The row's ChipGroup children (StatusPill / SeverityBadge /
 * CategoryBadge / SlaCountdown) are not re-tested here — those
 * have their own suites. We assert the row HTML scaffolding.
 */

const baseComplaint = {
  _id: "c_1",
  status: "Submitted",
  description: "Hostel A bulb in room 204 flickers at night.",
  slaAcknowledgeBy: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  slaResolveBy: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  categoryName: "Lighting",
  locationName: "Hostel A",
  systemType: "Electrical",
  priority: "Medium" as const,
};

describe("ComplaintRow", () => {
  it("renders as <li>, not a Card", () => {
    render(
      <ul>
        <ComplaintRow complaint={baseComplaint} kind="navigate" />
      </ul>,
    );
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBe(1);
    // No rounded-xl/rounded-lg on the row chrome — that's the visual
    // signature the Astryx Principles anti-pattern rule requires.
    expect(items[0]).not.toHaveClass("rounded-xl");
    expect(items[0]).not.toHaveClass("rounded-lg");
  });

  it("renders a Link inside the row when kind=navigate", () => {
    render(
      <ul>
        <ComplaintRow complaint={baseComplaint} kind="navigate" />
      </ul>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/complaints/c_1");
  });

  it("renders a button inside the row when kind=select", () => {
    const onSelect = jest.fn();
    const complaint = {
      ...baseComplaint,
      breachKind: "acknowledge_overdue" as const,
      overdueMs: 15 * 60 * 1000,
      currentAssignee: null,
    };
    render(
      <ul>
        <ComplaintRow
          complaint={complaint}
          kind="select"
          onSelect={onSelect}
        />
      </ul>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    button.click();
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ _id: "c_1" }));
  });

  it("applies .numeric utility to the SLA footer row", () => {
    render(
      <ul>
        <ComplaintRow complaint={baseComplaint} kind="navigate" />
      </ul>,
    );
    // The footer row spans the SLA / last-activity strings; one of its
    // children carries the numeric utility.
    const numericEl = document.querySelector(".numeric");
    expect(numericEl).toBeInTheDocument();
  });

  it("encodes the breach accent on the left edge when admin row goes overdue", () => {
    const complaint = {
      ...baseComplaint,
      breachKind: "resolve_overdue" as const,
      overdueMs: 60 * 60 * 1000,
      currentAssignee: { assignedToTechId: "t_1", assignedToName: "Onyeka" },
    };
    render(
      <ul>
        <ComplaintRow complaint={complaint} kind="select" />
      </ul>,
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveClass("border-l-danger-strong");
  });
});
