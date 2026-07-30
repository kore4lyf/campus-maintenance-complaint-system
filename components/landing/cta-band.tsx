import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="relative isolate overflow-hidden bg-brand text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-8 px-0 py-20 md:flex-row md:items-center md:justify-between md:py-24 xl:py-28">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              Join the loop
            </p>
            <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.025em] text-white sm:text-5xl xl:text-6xl">
              A campus that fixes itself,
              <br className="hidden sm:block" />
              <span className="text-accent">in the open.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-[1.5] text-white/75 sm:text-lg sm:leading-[1.45]">
              From the smallest faucet leak to a campus-wide outage, every
              maintenance task passes through the same system. Sign up to
              file, bookmark a tracker URL to follow.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/sign-up"
              className="group/cta inline-flex h-12 items-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-brand-strong shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-accent-strong hover:text-brand hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand"
            >
              Create your account
              <ChevronRight className="h-4 w-4 transition-transform duration-fast group-hover/cta:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href="/sign-in"
              className="self-start text-sm font-medium text-white/75 underline-offset-4 transition-colors duration-fast hover:text-white hover:underline sm:self-center"
            >
              Already have one? Sign in →
            </Link>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-black/40 to-transparent"
      />
    </section>
  );
}
