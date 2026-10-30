"use client";

import { useEffect } from "react";
import Lenis from "lenis";

const holder: { lenis: Lenis | null } = { lenis: null };

export function scrollToY(y: number) {
  if (holder.lenis) holder.lenis.scrollTo(y, { duration: 1.2 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

/** Smooth scrolling for the showcase home page only; task pages keep native scrolling. */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11 });
    holder.lenis = lenis;
    return () => {
      lenis.destroy();
      holder.lenis = null;
    };
  }, []);
  return null;
}
