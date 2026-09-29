"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// three.js (~150 Ko gzip) n'est chargé qu'après le premier rendu, sur écran
// large, et jamais si l'utilisateur préfère réduire les animations : le titre
// reste l'élément LCP, la scène 3D arrive ensuite en décor.
const HeroCanvas = dynamic(
  () => import("@/components/marketing/hero-canvas").then((m) => m.HeroCanvas),
  { ssr: false }
);

export function HeroCanvasLazy() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wide || reduce) return;
    // requestIdleCallback n'existe pas partout (Safari) : repli sur un délai.
    const ric = typeof window.requestIdleCallback === "function";
    const handle = ric
      ? window.requestIdleCallback(() => setEnabled(true), { timeout: 2000 })
      : setTimeout(() => setEnabled(true), 1200);
    return () => {
      if (ric) window.cancelIdleCallback(handle as number);
      else clearTimeout(handle);
    };
  }, []);

  return enabled ? <HeroCanvas /> : null;
}
