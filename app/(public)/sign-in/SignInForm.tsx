"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  LogIn,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { signInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInInput = z.infer<typeof signInSchema>;

export function SignInForm({ redirectParam }: { redirectParam: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit((data) => {
    setFormError(null);
    startTransition(async () => {
      try {
        const result = await signInAction({
          email: data.email,
          password: data.password,
          ...(redirectParam ? { redirect: redirectParam } : {}),
        });
        if (result.ok) {
          if (result.message) toast.success(result.message);
          // Brief hold so the toast is on-screen before the route swap.
          setTimeout(() => {
            router.push(result.redirectTo);
            router.refresh();
          }, 250);
          return;
        }
        setFormError(result.error);
        toast.error(result.error);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Sign-in failed. Please try again.";
        setFormError(message);
        toast.error(message);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label="Email"
        htmlFor="sign-in-email"
        error={errors.email?.message}
        required
      >
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          placeholder="you@student.lasu.edu.ng"
          leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="sign-in-password"
        error={errors.password?.message}
        required
      >
        <PasswordInput
          id="sign-in-password"
          autoComplete="current-password"
          placeholder="Minimum 8 characters"
          invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      {formError ? (
        <Card
          padding="sm"
          variant="surface"
          className="border-danger/40 bg-danger/5 text-danger"
        >
          <p
            role="alert"
            className="flex items-start gap-2 text-sm font-medium"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{formError}</span>
          </p>
        </Card>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isPending}
        leadingIcon={<LogIn className="h-4 w-4" />}
        trailingIcon={
          !isPending ? (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          ) : undefined
        }
      >
        {isPending ? "Signing in" : "Sign in"}
      </Button>

      <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-strong">
        <ShieldCheck
          className="h-3 w-3 text-accent-strong"
          aria-hidden="true"
        />
        Your session is encrypted. We never store passwords in plain text.
      </p>
    </form>
  );
}
