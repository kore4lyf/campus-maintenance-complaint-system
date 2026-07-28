import { forwardRef, type HTMLAttributes } from "react";

/*
 * Badge — base chip primitive. Five semantic tones. Icons optional.
 */
type Tone =
  | "brand"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone | undefined;
  leadingIcon?: React.ReactNode | undefined;
  children: React.ReactNode;
}

const TONE: Record<Tone, { bg: string; text: string; ring: string }> = {
  brand: {
    bg: "bg-brand/10",
    text: "text-brand",
    ring: "ring-brand/20",
  },
  neutral: {
    bg: "bg-muted/15",
    text: "text-muted-strong",
    ring: "ring-muted/20",
  },
  info: {
    bg: "bg-info/15",
    text: "text-info-strong",
    ring: "ring-info/20",
  },
  success: {
    bg: "bg-success/15",
    text: "text-success-strong",
    ring: "ring-success/20",
  },
  warning: {
    bg: "bg-warning/15",
    text: "text-warning",
    ring: "ring-warning/20",
  },
  danger: {
    bg: "bg-danger/15",
    text: "text-danger-strong",
    ring: "ring-danger/20",
  },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { tone = "neutral", leadingIcon, className = "", children, ...rest },
    ref,
  ) => {
    const t = TONE[tone]!;
    return (
      <span
        ref={ref}
        className={[
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
          t.bg,
          t.text,
          t.ring,
          className,
        ].join(" ")}
        {...rest}
      >
        {leadingIcon ? (
          <span aria-hidden="true" className="flex h-3 w-3 items-center justify-center">
            {leadingIcon}
          </span>
        ) : null}
        <span>{children}</span>
      </span>
    );
  },
);
Badge.displayName = "Badge";
