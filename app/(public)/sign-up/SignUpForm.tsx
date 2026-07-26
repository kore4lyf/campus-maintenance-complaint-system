"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUpAction } from "@/lib/auth/actions";

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  name: z
    .string()
    .min(1, "Display name is required")
    .max(80, "Display name must be 80 characters or fewer"),
});

type SignUpInput = z.infer<typeof signUpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const onSubmit = handleSubmit((data) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signUpAction({
        email: data.email,
        password: data.password,
        name: data.name,
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
          htmlFor="sign-up-name"
          className="text-sm font-medium text-foreground"
        >
          Display name
        </label>
        <input
          id="sign-up-name"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(errors.name) || undefined}
          aria-describedby={errors.name ? "sign-up-name-error" : undefined}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("name")}
        />
        {errors.name ? (
          <p
            id="sign-up-name-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="sign-up-email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "sign-up-email-error" : undefined}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("email")}
        />
        {errors.email ? (
          <p
            id="sign-up-email-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="sign-up-password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password) || undefined}
          aria-describedby={
            errors.password ? "sign-up-password-error" : undefined
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("password")}
        />
        {errors.password ? (
          <p
            id="sign-up-password-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.password.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-strong">Minimum 8 characters.</p>
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
        {isPending ? "Creating account\u2026" : "Create account"}
      </button>
    </form>
  );
}
