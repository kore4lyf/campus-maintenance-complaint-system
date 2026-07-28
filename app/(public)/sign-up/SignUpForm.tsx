"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { signUpAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";

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
        <Input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          leadingIcon={<Lock className="h-4 w-4" aria-hidden="true" />}
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
          <p role="alert" className="flex items-start gap-2 text-sm font-medium">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </p>
        </Card>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={isPending}
        leadingIcon={<UserPlus className="h-4 w-4" />}
      >
        {isPending ? "Creating account" : "Create account"}
      </Button>

      <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-strong">
        <CheckCircle2 className="h-3 w-3 text-accent-strong" aria-hidden="true" />
        Reporter accounts are auto-approved. DICT/Director accounts are seeded
        by administrators.
      </p>
    </form>
  );
}
