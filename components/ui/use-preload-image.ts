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

    // Already cached by a previous preload — skip
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

    // Handle browser-cached images: onload may fire synchronously before
    // React can batch the state update, or may have already fired by the
    // time we reach this line. Check complete after setting src.
    if (img.complete) {
      setLoaded(true);
    }

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return { loaded, error };
}
