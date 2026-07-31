"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { X, ZoomIn, Loader2 } from "lucide-react";
import { usePreloadImage } from "./use-preload-image";

interface ImageLightboxProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function ImageLightbox({
  src,
  alt,
  caption,
  width = 1200,
  height = 900,
  className,
}: ImageLightboxProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { loaded, error } = usePreloadImage(open ? src : null);

  useEffect(() => setMounted(true), []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Expand ${alt}`}
        className={`group/lightbox relative flex h-full w-full items-center justify-center overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${className ?? ""}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-medium group-hover/lightbox:scale-[1.03]"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-fast group-hover/lightbox:bg-black/10">
          <ZoomIn className="h-8 w-8 text-white opacity-0 drop-shadow transition-opacity duration-fast group-hover/lightbox:opacity-100" aria-hidden="true" />
        </span>
      </button>

      {mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Expanded view of ${alt}`}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
              style={{ visibility: open ? "visible" : "hidden", pointerEvents: open ? "auto" : "none" }}
              onClick={open ? () => setOpen(false) : undefined}
            >
              <div
                className="relative flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-overlay shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close preview"
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/90 text-muted-strong backdrop-blur transition-colors hover:bg-surface hover:text-foreground-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                {open && !loaded && !error && (
                  <div className="absolute inset-0 z-10 flex min-h-[200px] min-w-[300px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-strong" />
                  </div>
                )}
                {open && (
                  <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    className={`max-h-[85vh] w-auto object-contain transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
                  />
                )}
                {caption ? (
                  <div className="border-t border-border bg-surface-raised px-5 py-4 text-center shrink-0">
                    <p className="text-sm font-medium text-foreground-strong">
                      {caption}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
