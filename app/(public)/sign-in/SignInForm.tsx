"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { signInAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";

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
            : "Sign-in failed";
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
        hint="Use your LASU email if you have one."
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
        hint="Minimum 8 characters."
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
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger-soft p-3 text-sm text-danger-strong"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 flex-shrink-0"
            aria-hidden="true"
          />
          <span className="font-medium">{formError}</span>
        </div>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isPending}
        leadingIcon={undefined}
        trailingIcon= {undefined}
      >
        {isPending ? "Signing in" : "Sign in"}
      </Button>
    </form>
  );
}
