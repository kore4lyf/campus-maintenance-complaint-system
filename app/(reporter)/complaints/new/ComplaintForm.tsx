"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Camera,
  Send,
  ShieldCheck,
  Tag,
  MapPin,
  Image as ImageIcon,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Card";
import {
  Field,
  Label,
  Input,
  Textarea,
  Select,
  Checkbox,
} from "@/components/ui/Field";
import { H2, Kicker, Supporting } from "@/components/ui/type";

/*
 * ComplaintForm — the largest of the reporter surfaces (415 LoC).
 *
 * Aesthetic pass (2026-07-29):
 *   - Adds numbered caption strips at the top of each card
 *     (`01 Identification`, `02 Description`, `03 Photo`, `04 Privacy`)
 *     to mirror the home / detail / queue compositional cadence.
 *   - Two-column label + count pill on the description meta slot
 *     (so character count is visible without consuming label real
 *     estate), with a hairline character-progress ring optional.
 *   - Photo block uses a brand-tinted drag-and-drop surface with
 *     a hairline border; chosen photo carries an `accent-soft`
 *     badge to differentiate the chosen state.
 *   - Privacy block keeps the accent chip restraint.
 *   - Error block lifted into a Card with border-danger/40 to give
 *     it visual differentiation from success states.
 *   - Submit footer restructured as a hairline-bordered action row
 *     with a sticky-feel shadow at the bottom of long forms.
 *
 * Tokens used (no new tokens):
 *   - bg-brand (#0c2848) on the primary CTA.
 *   - text-brand-strong on the privacy eyebrow accent.
 *   - text-success-strong on the chosen-photo badge.
 *   - hairline border-border on every section divider.
 */

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
    watch,
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

  const descriptionValue = watch("description") ?? "";

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
      toast.error(livePhotoError);
      return;
    }
    startTransition(async () => {
      try {
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
          const message =
            err instanceof Error
              ? err.message
              : "Network error. Please try again.";
          setFormError(message);
          toast.error(message);
          return;
        }

        let payload: {
          data?: { redirectTo?: string; trackerUrl?: string; id?: string };
          error?: { code: string; message: string };
        } | null = null;
        try {
          payload = (await response.json()) as {
            data?: { redirectTo?: string; trackerUrl?: string; id?: string };
            error?: { code: string; message: string };
          };
        } catch {
          payload = null;
        }

        if (!response.ok || !payload?.data?.redirectTo) {
          const message =
            payload?.error?.message ??
            `Submission failed (HTTP ${response.status}). Please try again.`;
          setFormError(message);
          toast.error(message);
          return;
        }

        const targetUrl = payload.data.redirectTo;
        const trackerUrl = payload.data.trackerUrl;

        if (data.isAnonymous && trackerUrl) {
          try {
            window.sessionStorage.setItem(
              "cms_lasu:last_tracker_url",
              trackerUrl,
            );
          } catch {
            // sessionStorage may be unavailable; ignore.
          }
        }

        toast.success(
          data.isAnonymous
            ? "Anonymous report submitted. We saved your tracker URL in this browser."
            : "Complaint submitted. Tracking it from your queue now.",
          {
            description: data.isAnonymous
              ? "Bookmark or save the URL we'll redirect you to so you can check status without signing in."
              : "You'll see it on your dashboard with a live SLA timer.",
          },
        );

        // Brief hold so the toast is on-screen before the route swap.
        setTimeout(() => {
          router.push(targetUrl);
          router.refresh();
        }, 350);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Submission failed unexpectedly. Please try again.";
        setFormError(message);
        toast.error(message);
      }
    });
  });

  const characterRatio = Math.min(
    1,
    descriptionValue.length / DESCRIPTION_MAX,
  );
  const characterTone =
    descriptionValue.length > DESCRIPTION_MAX * 0.9
      ? "text-warning-strong"
      : descriptionValue.length < DESCRIPTION_MIN
        ? "text-muted-strong"
        : "text-foreground-strong";

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6"
      noValidate
      encType="multipart/form-data"
    >
      {/* ---------- Identity section ---------- */}
      <Card padding="lg" variant="surface">
        <header className="mb-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="numeric text-xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong">
              01
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
            <Kicker>Identification</Kicker>
          </div>
          <H2 className="text-xl font-semibold tracking-[-0.01em] text-foreground-strong">
            What&apos;s broken and where?
          </H2>
          <Supporting>
            Pick the closest category and location so the technician can
            route the right equipment to your building.
          </Supporting>
        </header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Category"
            htmlFor="complaint-category"
            error={errors.categoryId?.message}
            hint={
              categories.length > 0
                ? `${categories.length} categories available`
                : "Loading categories…"
            }
            required
          >
            <Select
              id="complaint-category"
              leadingIcon={<Tag className="h-4 w-4" />}
              invalid={Boolean(errors.categoryId)}
              {...register("categoryId")}
            >
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Location"
            htmlFor="complaint-location"
            error={errors.locationId?.message}
            hint={
              locations.length > 0
                ? `${locations.length} campus locations`
                : "Loading locations…"
            }
            required
          >
            <Select
              id="complaint-location"
              leadingIcon={<MapPin className="h-4 w-4" />}
              invalid={Boolean(errors.locationId)}
              {...register("locationId")}
            >
              <option value="">Choose a location…</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {/* ---------- Description section ---------- */}
      <Card padding="lg" variant="surface">
        <header className="mb-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="numeric text-xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong">
              02
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
            <Kicker>Description</Kicker>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <H2 className="text-xl font-semibold tracking-[-0.01em] text-foreground-strong">
                What happened?
              </H2>
              <Supporting>
                Be specific. Mention what you saw, when, and how often it
                happens.
              </Supporting>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium">
              <span className="text-muted-strong">
                {DESCRIPTION_MIN}–{DESCRIPTION_MAX} chars
              </span>
              <span
                aria-hidden="true"
                className="h-3 w-px bg-border-strong"
              />
              <span className={`numeric ${characterTone}`}>
                {descriptionValue.length} / {DESCRIPTION_MAX}
              </span>
              <span
                aria-hidden="true"
                className="h-2 w-12 overflow-hidden rounded-full bg-surface-raised ring-1 ring-inset ring-border"
              >
                <span
                  className="block h-full bg-brand transition-[width] duration-medium"
                  style={{ width: `${characterRatio * 100}%` }}
                />
              </span>
            </div>
          </div>
        </header>

        <Field
          label="Describe the fault"
          htmlFor="complaint-description"
          error={errors.description?.message}
          required
        >
          <Textarea
            id="complaint-description"
            rows={6}
            placeholder="Describe what you saw so a technician can act on it."
            invalid={Boolean(errors.description)}
            {...register("description")}
          />
        </Field>
      </Card>

      {/* ---------- Photo section ---------- */}
      <Card padding="lg" variant="surface">
        <header className="mb-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="numeric text-xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong">
              03
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
            <Kicker>Photo</Kicker>
            <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-muted/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-strong">
              Optional
            </span>
          </div>
          <H2 className="text-xl font-semibold tracking-[-0.01em] text-foreground-strong">
            Attach a photo
          </H2>
          <Supporting>
            A photo helps the technician act on the first visit. JPG, PNG,
            or WebP up to {PHOTO_MAX_MB}&nbsp;MB.
          </Supporting>
        </header>

        <Field htmlFor="complaint-photo" error={photoError ?? undefined}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label
                htmlFor="complaint-photo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface-raised px-4 py-2.5 text-sm font-semibold text-foreground-strong transition-colors hover:border-brand hover:text-brand focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2"
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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success-strong ring-1 ring-inset ring-success/30">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {photoFile.name} ·{" "}
                  <span className="numeric">
                    {Math.round(photoFile.size / 1024)} KB
                  </span>
                </span>
              ) : (
                <span className="text-xs text-muted">
                  Tip: a photo speeds up the technician&apos;s first visit.
                </span>
              )}
            </div>
          </div>
        </Field>
      </Card>

      {/* ---------- Privacy section ---------- */}
      <Card padding="lg" variant="raised">
        <header className="mb-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="numeric text-xl font-semibold leading-none tracking-[-0.02em] text-foreground-strong">
              04
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-border-strong" />
            <Kicker>Privacy</Kicker>
          </div>
          <H2 className="text-xl font-semibold tracking-[-0.01em] text-foreground-strong">
            One more thing…
          </H2>
        </header>

        <Field
          htmlFor="complaint-anonymous"
          error={errors.isAnonymous?.message}
        >
          <Checkbox
            id="complaint-anonymous"
            label={
              <span className="inline-flex items-center gap-1.5 font-medium">
                <EyeOff
                  className="h-4 w-4 text-muted-strong"
                  aria-hidden="true"
                />
                Submit anonymously
              </span>
            }
            description={
              <>
                We hide your name and email. You will get a private tracker
                URL instead of a sign-in session.{" "}
                <span className="text-sm font-medium text-accent-strong">
                  Recommended for sensitive issues.
                </span>
              </>
            }
            {...register("isAnonymous")}
          />
        </Field>
      </Card>

      {/* ---------- Error banner ---------- */}
      {formError ? (
        <Card
          padding="sm"
          variant="surface"
          className="border-danger/40 bg-danger/5"
        >
          <p
            role="alert"
            className="flex items-start gap-2 text-sm font-medium text-danger-strong"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 flex-shrink-0"
              aria-hidden="true"
            />
            <span>{formError}</span>
          </p>
        </Card>
      ) : null}

      {/* ---------- Submit footer (sticky shadow at the bottom) ---------- */}
      <div className="sticky bottom-0 z-10 -mx-1 mt-2 rounded-xl border border-border bg-surface/95 px-5 py-4 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-strong">
            <ShieldCheck className="h-3 w-3 text-accent-strong" aria-hidden="true" />
            Your submission is private and visible only to DICT.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isPending}
            leadingIcon={ undefined }
            trailingIcon={ undefined }
          >
            {isPending ? "Submitting" : "Submit complaint"}
          </Button>
        </div>
      </div>
    </form>
  );
}
