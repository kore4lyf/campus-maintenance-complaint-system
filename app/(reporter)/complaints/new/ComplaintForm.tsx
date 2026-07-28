"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Send, ShieldCheck } from "lucide-react";

const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 2000;
const PHOTO_MAX_MB = 10;
const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;

const ALLOWED_PHOTO_MIME = ["image/jpeg", "image/png", "image/webp"] as const;

const complaintSchema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  locationId: z.string().min(1, "Select a location"),
  description: z
    .string()
    .trim()
    .min(
      DESCRIPTION_MIN,
      `Description must be at least ${DESCRIPTION_MIN} characters`,
    )
    .max(
      DESCRIPTION_MAX,
      `Description must be at most ${DESCRIPTION_MAX} characters`,
    ),
  isAnonymous: z.boolean(),
});

type ComplaintInput = z.infer<typeof complaintSchema>;

interface CategoryOption {
  id: string;
  name: string;
  systemType: string;
}

interface LocationOption {
  id: string;
  name: string;
  area: string;
}

interface ComplaintFormProps {
  categories: CategoryOption[];
  locations: LocationOption[];
}

export function ComplaintForm({ categories, locations }: ComplaintFormProps) {
  const router = useRouter();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ComplaintInput>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      categoryId: "",
      locationId: "",
      description: "",
      isAnonymous: false,
    },
  });

  const validatePhoto = (file: File | null): string | null => {
    if (!file) return null;
    if (!ALLOWED_PHOTO_MIME.includes(file.type as (typeof ALLOWED_PHOTO_MIME)[number])) {
      return "Photo must be a JPG, PNG, or WebP image";
    }
    if (file.size > PHOTO_MAX_BYTES) {
      return `Photo must be ${PHOTO_MAX_MB} MB or smaller`;
    }
    return null;
  };

  const onPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    const file = list?.[0] ?? null;
    setPhotoFile(file);
    setPhotoError(validatePhoto(file));
  };

  const onSubmit = handleSubmit((data) => {
    setFormError(null);
    const livePhotoError = validatePhoto(photoFile);
    if (livePhotoError) {
      setPhotoError(livePhotoError);
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.set("categoryId", data.categoryId);
      form.set("locationId", data.locationId);
      form.set("description", data.description);
      form.set("isAnonymous", data.isAnonymous ? "true" : "false");
      if (photoFile) {
        form.set("photo", photoFile);
      }
      let response: Response;
      try {
        response = await fetch("/api/complaints", {
          method: "POST",
          body: form,
        });
      } catch (err) {
        setFormError(
          err instanceof Error
            ? err.message
            : "Network error. Please try again.",
        );
        return;
      }
      let payload: {
        data?: { redirectTo?: string; trackerUrl?: string; id?: string };
        error?: { code: string; message: string };
      } | null = null;
      try {
        payload = (await response.json()) as { data?: { redirectTo?: string; trackerUrl?: string; id?: string }; error?: { code: string; message: string } };
      } catch {
        payload = null;
      }
      if (!response.ok || !payload?.data?.redirectTo) {
        setFormError(
          payload?.error?.message ??
            `Submission failed (HTTP ${response.status}). Please try again.`,
        );
        return;
      }
      if (data.isAnonymous && payload.data.trackerUrl) {
        try {
          window.sessionStorage.setItem(
            "cms_lasu:last_tracker_url",
            payload.data.trackerUrl,
          );
        } catch {
          // sessionStorage may be unavailable; ignore.
        }
      }
      router.push(payload.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
      encType="multipart/form-data"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="complaint-category"
          className="text-sm font-medium text-foreground"
        >
          Category
        </label>
        <select
          id="complaint-category"
          aria-invalid={Boolean(errors.categoryId) || undefined}
          aria-describedby={
            errors.categoryId ? "complaint-category-error" : undefined
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("categoryId")}
        >
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.categoryId ? (
          <p
            id="complaint-category-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.categoryId.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="complaint-location"
          className="text-sm font-medium text-foreground"
        >
          Location
        </label>
        <select
          id="complaint-location"
          aria-invalid={Boolean(errors.locationId) || undefined}
          aria-describedby={
            errors.locationId ? "complaint-location-error" : undefined
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("locationId")}
        >
          <option value="">Choose a location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        {errors.locationId ? (
          <p
            id="complaint-location-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.locationId.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="complaint-description"
          className="text-sm font-medium text-foreground"
        >
          Description
        </label>
        <textarea
          id="complaint-description"
          rows={5}
          aria-invalid={Boolean(errors.description) || undefined}
          aria-describedby={
            errors.description ? "complaint-description-error" : undefined
          }
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          {...register("description")}
        />
        {errors.description ? (
          <p
            id="complaint-description-error"
            role="alert"
            className="text-xs font-medium text-danger"
          >
            {errors.description.message}
          </p>
        ) : null}
        <p className="text-xs text-muted-strong">
          Between {DESCRIPTION_MIN} and {DESCRIPTION_MAX} characters.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="complaint-photo"
          className="text-sm font-medium text-foreground"
        >
          Photo (optional)
        </label>
        <div className="flex items-center gap-2">
          <label
            htmlFor="complaint-photo"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            <span>{photoFile ? "Replace photo" : "Choose photo"}</span>
          </label>
          <input
            id="complaint-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={onPhotoChange}
          />
          {photoFile ? (
            <span className="text-xs text-muted-strong">
              {photoFile.name} ({Math.round(photoFile.size / 1024)} KB)
            </span>
          ) : (
            <span className="text-xs text-muted-strong">JPG, PNG, or WebP up to {PHOTO_MAX_MB} MB.</span>
          )}
        </div>
        {photoError ? (
          <p role="alert" className="text-xs font-medium text-danger">
            {photoError}
          </p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          id="complaint-anonymous"
          type="checkbox"
          className="h-4 w-4 rounded border-border text-brand accent-brand focus:ring-brand/30"
          {...register("isAnonymous")}
        />
        <ShieldCheck className="h-4 w-4 text-muted-strong" aria-hidden="true" />
        <span>Submit anonymously and receive a tracker URL</span>
      </label>

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
        className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        <span>{isPending ? "Submitting\u2026" : "Submit complaint"}</span>
      </button>
    </form>
  );
}
