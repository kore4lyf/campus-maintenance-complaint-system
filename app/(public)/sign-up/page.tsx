import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageShell, HeroBand, HeroBody } from "@/components/shared/PageShell";
import { SignUpForm } from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign up · LASU CMS",
  description: "Create an account to submit campus maintenance complaints.",
};

export default function SignUpPage() {
  return (
    <PageShell>
      <HeroBand
        kicker="Get started"
        title="Create your account"
        subtitle="Register as a reporter to submit maintenance complaints and track their resolution. It takes a minute."
      />
      <HeroBody>
        <div className="mx-auto w-full max-w-md">
          <Card padding="lg" variant="overlay" className="overflow-hidden">
            <SignUpForm />

            <hr className="my-7 border-border" />

            <div className="flex flex-col gap-2 text-sm">
              <p className="text-muted-strong">
                Already have an account?
              </p>
              <Link href="/sign-in" className="inline-flex">
                <Button variant="secondary" size="md" trailingIcon={<ArrowRight className="h-4 w-4" />}>
                  Sign in
                </Button>
              </Link>
            </div>
          </Card>

          <p className="mt-6 inline-flex items-center justify-center gap-1.5 text-xs text-muted-strong">
            <UserPlus className="h-3 w-3" aria-hidden="true" />
            Need a DICT or Technician account? Ask your administrator to seed it.
          </p>
        </div>
      </HeroBody>
    </PageShell>
  );
}
