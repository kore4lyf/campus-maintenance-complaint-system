"use client";

import {
  forwardRef,
  useState,
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
  className?: ReactNode | string | undefined;
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
    <div className={`flex flex-col gap-1.5 ${className as string}`}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="flex items-center gap-1 text-xs font-medium text-danger"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-danger" />
          {error}
        </p>
      ) : hint ? (
        <p
          id={htmlFor ? `${htmlFor}-hint` : undefined}
          className="text-xs text-muted-strong"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------- Label ---------- */
export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean | undefined }
>(
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

/* ---------- PasswordInput ---------- */
export type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  invalid?: boolean | undefined;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = "", invalid, ...rest }, ref) => {
    const [visible, setVisible] = useState(false);

    return (
      <div
        className={[
          "relative flex items-center",
          invalid ? CONTROL_ERROR : "",
          className,
        ].join(" ")}
      >
        <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-muted-strong">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          aria-invalid={invalid || undefined}
          className={[
            CONTROL,
            invalid ? CONTROL_ERROR : "",
            "pl-9 pr-10",
          ].join(" ")}
          {...rest}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 flex h-4 w-4 items-center justify-center text-muted-strong transition-colors hover:text-foreground-strong focus:outline-none"
        >
          {visible ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

/* ---------- Textarea ---------- */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean | undefined }
>(
  ({ className = "", invalid, ...rest }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={[
        CONTROL,
        "min-h-[6rem] resize-y",
        invalid ? CONTROL_ERROR : "",
        className,
      ].join(" ")}
      {...rest}
    />
  ),
);
Textarea.displayName = "Textarea";

/* ---------- Select ---------- */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean | undefined;
  leadingIcon?: ReactNode | undefined;
}

const CHEVRON_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2364748b'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className = "", invalid, children, leadingIcon, ...rest },
    ref,
  ) => {
    if (leadingIcon) {
      return (
        <div
          className={[
            "relative flex items-center",
            invalid ? CONTROL_ERROR : "",
            className,
          ].join(" ")}
        >
          <span className="pointer-events-none absolute left-3 flex h-4 w-4 items-center justify-center text-muted-strong">
            {leadingIcon}
          </span>
          <select
            ref={ref}
            aria-invalid={invalid || undefined}
            className={[CONTROL, "pl-9 pr-9", invalid ? CONTROL_ERROR : "", className].join(" ")}
            style={{
              backgroundImage: CHEVRON_BG,
              backgroundPosition: "right 0.65rem center",
              backgroundSize: "1.25rem",
              backgroundRepeat: "no-repeat",
            }}
            {...rest}
          >
            {children}
          </select>
        </div>
      );
    }
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={[CONTROL, "pr-9", invalid ? CONTROL_ERROR : "", className].join(" ")}
        style={{
          backgroundImage: CHEVRON_BG,
          backgroundPosition: "right 0.65rem center",
          backgroundSize: "1.25rem",
          backgroundRepeat: "no-repeat",
        }}
        {...rest}
      >
        {children}
      </select>
    );
  },
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
