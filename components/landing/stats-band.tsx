export function StatsBand() {
  return (
    <section
      aria-label="At-a-glance"
      className="border-y border-border bg-surface"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ul
          role="list"
          className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {[
            {
              kicker: "Acknowledge",
              value: "≤ 4 h",
              note: "DICT responds to a Submitted fault within four hours.",
            },
            {
              kicker: "Resolve",
              value: "≤ 72 h",
              note: "Most categories resolved within three working days.",
            },
            {
              kicker: "Receipt",
              value: "100%",
              note: "Every fix is photographically receipted before closure.",
            },
          ].map((item) => (
            <li
              key={item.kicker}
              className="flex flex-col gap-2 px-2 py-8 sm:px-8 sm:py-10"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent-strong">
                {item.kicker}
              </p>
              <p className="numeric text-4xl font-semibold tracking-[-0.025em] text-foreground-strong sm:text-5xl">
                {item.value}
              </p>
              <p className="max-w-xs text-sm leading-[1.55] text-muted-strong">
                {item.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
