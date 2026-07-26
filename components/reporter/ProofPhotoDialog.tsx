"use client";

import { useState } from "react";

interface ProofPhotoDialogProps {
  url: string;
  caption: string;
}

export function ProofPhotoDialog({ url, caption }: ProofPhotoDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-block overflow-hidden rounded-md border border-border"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof photo */}
        <img
          src={url}
          alt="Proof of fix photo"
          className="h-12 w-12 object-cover"
        />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Proof of fix photo"
        >
          <div
            className="relative max-w-2xl rounded-xl bg-surface-overlay shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 z-10 rounded-full bg-surface-raised p-1 text-muted-strong transition-colors hover:text-foreground"
              aria-label="Close"
            >
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
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary proof photo */}
            <img
              src={url}
              alt="Proof of fix photo"
              className="max-h-[70vh] w-full rounded-xl object-contain"
            />
            <p className="px-4 py-3 text-center text-sm text-muted-strong">
              {caption}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
