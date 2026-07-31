"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Preloads an image URL into browser cache using an off-DOM Image object.
 * Returns loading state. Once loaded, any <img> with the same src
 * gets a cache hit — no refetch.
 */
export function usePreloadImage(src: string | null) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;

    // Already cached by browser — skip preload
    if (imgRef.current?.complete && imgRef.current?.src === src) {
      setLoaded(true);
      return;
    }

    setLoaded(false);
    setError(false);

    const img = new Image();
    imgRef.current = img;

    img.onload = () => setLoaded(true);
    img.onerror = () => setError(true);
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { loaded, error };
}
