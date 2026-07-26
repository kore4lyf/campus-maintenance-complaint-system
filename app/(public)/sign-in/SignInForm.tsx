"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInAction } from "@/lib/auth/actions";

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
      const result = await signInAction({
        email: data.email,
        password: data.password,
        redirect: redirectParam || undefined,
      });
      if (result.ok) {
        router.push(result.redirectTo);
        router.refresh();
        return;
      }
      setFormError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="sign-in-email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "sign-in-email-error" : undefined}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="sign-in-email-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="sign-in-password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password) || undefined}
          aria-describedby={
            errors.password ? "sign-in-password-error" : undefined
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("password")}
        />
        {errors.password ? (
          <p
            id="sign-in-password-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.password.message}
          </p>
        ) : null}
      </div>

      {formError ? (
        <div
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-medium text-danger"
        >
          {formError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in\u2026" : "Sign in"}
      </button>
    </form>
  );
}
