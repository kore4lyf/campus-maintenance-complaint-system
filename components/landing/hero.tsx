import Link from "next/link";
import Image from "next/image";
import { ChevronRight, ArrowRight, ShieldCheck } from "lucide-react";
import { getServerSession } from "@/lib/auth/dal";

const STATS_TRIO = [
  { value: "10", label: "Categories", note: "Electrical · Plumbing · HVAC · ICT …" },
  { value: "15+", label: "Campus locations", note: "Hostels · Blocks · Labs · Offices" },
  { value: "24/7", label: "Live SLA timers", note: "Acknowledge + resolve deadlines" },
] as const;

async function HeroIllustration() {
  return (
    <div className="lg:col-span-5">
      <div className="relative">
        <div>
          <div className="flex justify-center">
            <div className="relative">
              <Image
                src="/cms-lasu-icon.png"
                alt="LASU CMS mark"
                width={220}
                height={220}
                className="relative h-44 w-auto drop-shadow-lg sm:h-52"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function Hero() {
  const session = await getServerSession();
  const signedIn = !!session;

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 22% 0%, rgba(244,215,106,0.20), transparent 55%)",
        }}
      />

      <div className="mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 sm:pt-24 sm:pb-32 lg:px-8 lg:pt-32 lg:pb-40 xl:pt-40 xl:pb-48">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="flex flex-col gap-7 lg:col-span-7 lg:gap-9">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-px w-8 bg-border-strong"
              />
              <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                
                Lagos State University
              </p>
            </div>

             <h1 className="text-balance font-semibold tracking-[-0.025em] text-foreground-strong text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">
              Campus maintenance,
              <br />
              <span className="text-brand">made transparent.</span>
            </h1>

            <p className="max-w-2xl text-balance text-lg leading-[1.5] text-muted-strong sm:text-xl sm:leading-[1.45]">
              Submit a fault. Track it in real time. See the proof of fix.
              Whether it&apos;s a bulb in the hostel or a server outage in
              Engineering, the entire repair loop is finally visible.
            </p>

            <ul
              role="list"
              className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-surface/60 backdrop-blur-sm"
            >
              {STATS_TRIO.map((stat) => (
                <li
                  key={stat.label}
                  className="flex flex-col gap-1 px-4 py-4 sm:px-5 sm:py-5"
                >
                  <p className="numeric text-3xl font-semibold tracking-[-0.025em] text-foreground-strong sm:text-4xl">
                    {stat.value}
                  </p>
                  <p className="text-sm font-semibold tracking-[-0.005em] text-foreground-strong">
                    {stat.label}
                  </p>
                  <p className="hidden text-xs leading-[1.5] text-muted-strong sm:block">
                    {stat.note}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!signedIn ? (
                <>
                  <Link
                    href="/complaints/new"
                    className="group/cta inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-base font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                  >
                    Report a fault
                    <ChevronRight className="h-4 w-4 transition-transform duration-fast group-hover/cta:translate-x-0.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/sign-up"
                    className="group/link inline-flex items-center gap-1.5 self-start text-sm font-medium text-muted-strong transition-colors duration-fast hover:text-brand sm:self-center"
                  >
                    <span>New here? Create an account</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-fast group-hover/link:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </>
              ) : (
                <Link
                  href="/complaints/mine"
                  className="group/cta inline-flex h-12 items-center gap-2 rounded-md bg-brand px-6 text-base font-semibold text-white shadow-sm transition-[background-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:bg-brand-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                >
                  Go to your complaints
                  <ChevronRight className="h-4 w-4 transition-transform duration-fast group-hover/cta:translate-x-0.5" aria-hidden="true" />
                </Link>
              )}
            </div>

            <p className="inline-flex flex-wrap items-center gap-1.5 text-sm text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-accent-strong" aria-hidden="true" />
              Free for LASU students and staff.{" "}
              <Link
                href="/sign-in"
                className="font-medium text-muted-strong underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              or file{" "}
              <Link
                href="/complaints/new"
                className="font-medium text-brand underline-offset-2 hover:underline"
              >
                anonymously
              </Link>
              .
            </p>
          </div>

          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
