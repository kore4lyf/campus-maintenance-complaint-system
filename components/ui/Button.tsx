"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

/*
 * Button — five visual variants × three sizes, with token-driven styling.
 *
 * Spec 0014 §D: Astryx size scale + Apple HIG 44 pt tap-target floor.
 *   sm: h-8 (32 px) = Astryx --size-element-md. Compact toolbar use,
 *                       table row actions, mobile bottom nav.
 *   md: h-11 (44 px) = Astryx --spacing-11 = Apple HIG floor. Default
 *                       for every form / dialog / page CTA. The 44 px
 *                       floor ensures fat-finger reliability.
 *   lg: h-12 (48 px). Reserved for hero CTAs and primary marketing
 *                       surfaces (a documented one-step deviation from
 *                       Astryx's --size-element-lg = 36 px because
 *                       padding-budget at 36 px is too tight for the
 *                       marketing hero icons we already ship).
 *
 * Astryx Principles: "Use semantic tokens over hardcoded values" — no
 * Tailwind hex anywhere in this file.
 */
type Variant = "primary" | "secondary" | "ghost" | "destructive" | "link";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant | undefined;
  size?: Size | undefined;
  loading?: boolean | undefined;
  leadingIcon?: React.ReactNode | undefined;
  trailingIcon?: React.ReactNode | undefined;
}

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-strong active:translate-y-px focus-visible:ring-accent",
  secondary:
    "border border-border-strong bg-surface-raised text-foreground-strong hover:bg-surface hover:border-brand hover:text-brand",
  ghost:
    "text-muted-strong hover:bg-surface-raised hover:text-foreground-strong",
  destructive:
    "bg-danger text-white hover:bg-danger-strong focus-visible:ring-danger/40",
  link: "text-brand hover:text-brand-strong underline-offset-2 hover:underline",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-base gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      leadingIcon,
      trailingIcon,
      className = "",
      children,
      type = "button",
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          "inline-flex items-center justify-center rounded-md font-medium",
          "transition-[background-color,color,border-color,box-shadow] duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          "disabled:cursor-not-allowed disabled:opacity-60",
          VARIANT[variant],
          SIZE[size],
          className,
        ].join(" ")}
        {...rest}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : leadingIcon ? (
          <span className="-ml-0.5 flex h-4 w-4 items-center justify-center">
            {leadingIcon}
          </span>
        ) : null}
        <span>{children}</span>
        {!loading && trailingIcon ? (
          <span className="-mr-0.5 flex h-4 w-4 items-center justify-center">
            {trailingIcon}
          </span>
        ) : null}
      </button>
    );
  },
);
Button.displayName = "Button";
