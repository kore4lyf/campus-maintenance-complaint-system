"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { signUpAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput } from "@/components/ui/Field";

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
      try {
        const result = await signUpAction({
          email: data.email,
          password: data.password,
          name: data.name,
        });
        if (result.ok) {
          toast.success(
            result.message ?? `Account created. Signed in as ${data.name}.`,
          );
          // Toast appears before the route swap so the user sees it.
          setTimeout(() => {
            router.push(result.redirectTo);
            router.refresh();
          }, 350);
          return;
        }
        setFormError(result.error);
        toast.error(result.error);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Could not create account. Please try again.";
        setFormError(message);
        toast.error(message);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field
        label="Display name"
        htmlFor="sign-up-name"
        error={errors.name?.message}
        required
      >
        <Input
          id="sign-up-name"
          type="text"
          autoComplete="name"
          placeholder="Aisha Bello"
          invalid={Boolean(errors.name)}
          {...register("name")}
        />
      </Field>

      <Field
        label="Email"
        htmlFor="sign-up-email"
        error={errors.email?.message}
        hint="Use your LASU email if you have one."
        required
      >
        <Input
          id="sign-up-email"
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
        htmlFor="sign-up-password"
        error={errors.password?.message}
        hint="Minimum 8 characters. Use a memorable phrase."
        required
      >
        <PasswordInput
          id="sign-up-password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
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
        leadingIcon={
          isPending ? undefined : <UserPlus className="h-4 w-4" />
        }
        trailingIcon={
          !isPending ? (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          ) : undefined
        }
      >
        {isPending ? "Creating account" : "Create account"}
      </Button>

      <p className="inline-flex items-center justify-start gap-1.5 text-xs text-muted">
        <Sparkles
          className="h-3 w-3 text-accent-strong"
          aria-hidden="true"
        />
        Reporter accounts are auto-approved. Your display name shows up
        in the DICT queue.
      </p>
    </form>
  );
}
