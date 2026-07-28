import type { Metadata } from "next";
import Link from "next/link";
import { LogIn, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in · LASU CMS",
  description: "Sign in to submit and track campus maintenance complaints.",
};

type SearchParams = { redirect?: string };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const redirectParam = params.redirect?.trim() ?? "";

  return (
    <PageShell>
      <HeroBand
        kicker="Welcome back"
        title={
          <>
            Sign in to <span className="text-brand">continue</span>
          </>
        }
        subtitle="Submit a maintenance complaint or check your queue. We'll keep you signed in for seven days."
      />
      <HeroBody>
        <div className="mx-auto w-full max-w-md">
          <Card padding="lg" variant="overlay" className="overflow-hidden">
            <SignInForm redirectParam={redirectParam} />

            <hr className="my-7 border-border" />

            <div className="flex flex-col gap-2 text-sm">
              <p className="text-muted-strong">
                Don&apos;t have an account?
              </p>
              <Link href="/sign-up" className="inline-flex">
                <Button variant="secondary" size="md" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                  Create one
                </Button>
              </Link>
            </div>
          </Card>

          <p className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-muted-strong">
            <LogIn className="h-3 w-3" aria-hidden="true" />
            Trouble signing in? Contact DICT support.
          </p>
        </div>
      </HeroBody>
    </PageShell>
  );
}
