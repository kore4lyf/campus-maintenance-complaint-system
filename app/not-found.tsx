import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="inline-flex flex-col items-center gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/15 text-muted">
            <FileQuestion className="h-7 w-7" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-strong">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground-strong">
            Page not found
          </h1>
          <p className="max-w-md text-sm text-muted-strong">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <div className="mt-2">
            <Link href="/">
              <Button variant="primary" size="md">
                Go home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
