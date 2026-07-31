import Link from "next/link";
import { Camera, Clock4, ShieldCheck, Bell, FileText, ArrowUpRight } from "lucide-react";
import { H2, Supporting } from "@/components/ui/type";

const AUDIENCE_FEATURES = [
  {
    icon: Camera,
    title: "Photo attachments",
    body: "A picture tells the technician what words can't. Useful on first-visit diagnosis.",
  },
  {
    icon: Clock4,
    title: "Live SLA timers",
    body: "Acknowledge and resolve deadlines tick on your dashboard in real time.",
  },
  {
    icon: ShieldCheck,
    title: "Optional anonymous",
    body: "Skip the account, file the complaint, get a private tracker URL to bookmark.",
  },
] as const;

const DICT_FEATURES = [
  {
    icon: Bell,
    title: "AI-assisted triage",
    body: "Free text interpreted confidently by gpt-4o-mini. Submission is never blocked.",
  },
  {
    icon: ShieldCheck,
    title: "SLA enforcement",
    body: "Acknowledge + resolve deadlines enforced automatically up the DICT hierarchy.",
  },
  {
    icon: FileText,
    title: "Reports & exports",
    body: "Volume trends, breach counts, PDF and CSV exports for an external audience.",
  },
] as const;

function AudienceColumn({
  eyebrow,
  title,
  subtitle,
  features,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  features: ReadonlyArray<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
  }>;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="inline-flex items-center gap-2 self-start text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
          
          {eyebrow}
        </p>
        <H2 className="text-balance tracking-[-0.018em]">{title}</H2>
        <Supporting className="max-w-prose text-base">
          {subtitle}
        </Supporting>
      </header>

      <ul role="list" className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <li
              key={`${feature.title}-${idx}`}
              className="flex items-start gap-4 p-5 transition-colors duration-fast first:rounded-t-xl last:rounded-b-xl hover:bg-surface-raised"
            >
              <span
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                aria-hidden="true"
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold tracking-[-0.005em] text-foreground-strong">
                  {feature.title}
                </p>
                <p className="mt-1 text-sm leading-[1.55] text-muted-strong">
                  {feature.body}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <Link
        href={ctaHref}
        className="group/aud inline-flex items-center gap-1.5 self-start text-sm font-semibold text-brand transition-colors duration-fast hover:text-brand-strong"
      >
        {ctaLabel}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/aud:-translate-y-0.5 group-hover/aud:translate-x-0.5" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function DualAudienceSection() {
  return (
    <section
      aria-label="For reporters and DICT"
      className="bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-20">
          <AudienceColumn
            eyebrow="For students & staff"
            title="Report a fault in under a minute."
            subtitle="Pick a category and location, describe what happened, optionally attach a photo. Anonymous mode available."
            features={AUDIENCE_FEATURES}
            ctaHref="/sign-up"
            ctaLabel="Create your reporter account"
          />
          <AudienceColumn
            eyebrow="For DICT staff"
            title="Triage, assign, resolve."
            subtitle="The queue, the timers, the breaches, the reports — all in one place. AI helps interpret free text; rules keep the lights on if the AI is offline."
            features={DICT_FEATURES}
            ctaHref="/sign-in"
            ctaLabel="DICT staff sign in"
          />
        </div>
      </div>
    </section>
  );
}
