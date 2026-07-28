"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

/*
 * Form primitives. Every form in the project lands here so layout, focus
 * state, error state and helper text stay consistent.
 */

const CONTROL =
  "block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted " +
  "transition-[border-color,box-shadow,background-color] duration-200 " +
  "hover:border-border-strong " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-accent/40 " +
  "disabled:cursor-not-allowed disabled:bg-surface-raised disabled:opacity-70";

const CONTROL_ERROR =
  "border-danger focus:border-danger focus:ring-danger/40";

/* ---------- Field (label + control + optional helper / error) ---------- */
export interface FieldProps {
  label?: ReactNode | undefined;
  htmlFor?: string | undefined;
  hint?: ReactNode | undefined;
  error?: ReactNode | undefined;
  required?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} className="flex items-center gap-1 text-xs font-medium text-danger">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
          {error}
        </p>
      ) : hint ? (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="text-xs text-muted-strong">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Label ---------- */
export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean | undefined }>(
  ({ className = "", required, children, ...rest }, ref) => (
    <label
      ref={ref}
      className={[
        "text-sm font-medium text-foreground-strong tracking-tight",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-1 text-danger">
          *
        </span>
      ) : null}
    </label>
  ),
);
Label.displayName = "Label";

/* ---------- Input ---------- */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean | undefined;
  leadingIcon?: ReactNode | undefined;
  trailingIcon?: ReactNode | undefined;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", invalid, leadingIcon, trailingIcon, ...rest }, ref) => {
    if (leadingIcon || trailingIcon) {
      return (
        <div
          className={[
            "relative flex items-center",
            invalid ? CONTROL_ERROR : "",
            className,
          ].join(" ")}
        >
          {leadingIcon ? (
            <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-muted-strong">
              {leadingIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            aria-invalid={invalid || undefined}
            className={[
              CONTROL,
              invalid ? CONTROL_ERROR : "",
              leadingIcon ? "pl-9" : "",
              trailingIcon ? "pr-9" : "",
            ].join(" ")}
            {...rest}
          />
          {trailingIcon ? (
            <span className="pointer-events-none absolute right-3 flex h-4 w-4 items-center justify-center text-muted-strong">
              {trailingIcon}
            </span>
          ) : null}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={[CONTROL, invalid ? CONTROL_ERROR : "", className].join(" ")}
        {...rest}
      />
    );
  },
);
Input.displayName = "Input";

/* ---------- Textarea ---------- */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean | undefined }>(
  ({ className = "", invalid, ...rest }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[CONTROL, "min-h-[6rem] resize-y", invalid ? CONTROL_ERROR : "", className].join(" ")}
      {...rest}
    />
  ),
);
Textarea.displayName = "Textarea";

/* ---------- Select ---------- */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean | undefined }>(
  ({ className = "", invalid, children, ...rest }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[CONTROL, "pr-9", invalid ? CONTROL_ERROR : "", className].join(" ")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
        backgroundPosition: "right 0.65rem center",
        backgroundSize: "1.25rem",
        backgroundRepeat: "no-repeat",
      }}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

/* ---------- Checkbox ---------- */
export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  description?: ReactNode | undefined;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", ...rest }, ref) => (
    <label className={`flex cursor-pointer items-start gap-3 ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-border bg-surface text-brand accent-brand focus:outline-none focus:ring-2 focus:ring-accent/40"
        {...rest}
      />
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground-strong">
          {label}
        </span>
        {description ? (
          <span className="mt-0.5 text-xs text-muted-strong">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
