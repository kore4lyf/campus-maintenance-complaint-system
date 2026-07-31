import { Send, Inbox, Wrench, CheckCircle2 } from "lucide-react";
import { H2, H3, Supporting } from "@/components/ui/type";

const LOOP_STEPS = [
  {
    n: "01",
    icon: Send,
    title: "Submit",
    body: "Pick a category, choose a location, describe what you saw. Attach a photo if you have one. Filed in under a minute.",
    detail: "Anonymous mode available for sensitive issues.",
  },
  {
    n: "02",
    icon: Inbox,
    title: "Triage",
    body: "AI reads your free-text description and suggests a severity. DICT confirms and assigns the technician in under four hours.",
    detail: "Rule-based fallback keeps submissions flowing offline.",
  },
  {
    n: "03",
    icon: Wrench,
    title: "Resolve",
    body: "The technician arrives, performs the fix, and uploads a photo of the result. DICT approves and closes the loop.",
    detail: "SLA breaches escalate up the hierarchy automatically.",
  },
  {
    n: "04",
    icon: CheckCircle2,
    title: "Receipt",
    body: "You see the proof of fix in your dashboard. The complaint closes. The maintenance loop is open and auditable.",
    detail: "Every fix carries a photo or it never closes.",
  },
] as const;

export function MaintenanceLoopSection() {
  return (
    <section
      aria-label="How the maintenance loop works"
      className="border-y border-border bg-surface-raised"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <header className="flex max-w-3xl flex-col items-start gap-4">
          <p className="inline-flex items-center gap-2 self-start text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
            
            The maintenance loop
          </p>
          <H2 className="text-balance">
            One loop, four beats, every fault closed out loud.
          </H2>
          <Supporting className="max-w-2xl text-base">
            From the moment you press <span className="font-semibold text-foreground-strong">Submit</span>{" "}
            to the moment the ack-timer transitions to{" "}
            <span className="font-semibold text-foreground-strong">Resolved</span>,
            the same loop carries the complaint. Every step is auditable.
            Every step has an SLA.
          </Supporting>
        </header>

        <ol
          role="list"
          className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4"
        >
          {LOOP_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.n}
                className="group/step relative flex flex-col gap-5 bg-surface p-7 transition-colors duration-fast hover:bg-surface-raised lg:p-8"
              >
                <p
                  aria-hidden="true"
                  className="numeric absolute right-6 top-6 text-3xl font-semibold tabular-nums tracking-[-0.04em] text-muted/40 transition-colors duration-fast group-hover/step:text-muted"
                >
                  {step.n}
                </p>
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm transition-transform duration-fast group-hover/step:-translate-y-0.5"
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <H3 className="text-xl tracking-[-0.01em]">{step.title}</H3>
                <Supporting className="text-[13px] leading-[1.6] text-muted-strong">
                  {step.body}
                </Supporting>
                <p className="mt-auto text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  {step.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
