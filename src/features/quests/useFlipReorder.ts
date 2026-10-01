"use client";

import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { useQuestStore } from "./store";

gsap.registerPlugin(Flip);

const ITEM = "[data-flip-id]";

// FLIP = First, Last, Invert, Play:
//   1. First:  record where every item is BEFORE the change
//   2. Last:   let React re-render into the new order
//   3. Invert + Play: snap items back to their old spots, then animate to the new ones
export function useFlipReorder(container: RefObject<HTMLElement | null>, orderKey: string) {
  const before = useRef<ReturnType<typeof Flip.getState> | null>(null);

  // The store notifies subscribers synchronously, before React re-renders,
  // so the DOM still shows the old layout at this moment.
  useEffect(() => {
    return useQuestStore.subscribe(() => {
      const el = container.current;
      if (el) before.current = Flip.getState(el.querySelectorAll(ITEM));
    });
  }, [container]);

  // Runs after React updated the DOM but before the browser paints.
  useLayoutEffect(() => {
    const el = container.current;
    const previous = before.current;
    before.current = null;
    if (!el || !previous) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    try {
      Flip.from(previous, {
        targets: el.querySelectorAll(ITEM),
        duration: 0.5,
        ease: "power2.inOut",
        // brand-new cards fade and drop in
        onEnter: (els) =>
          gsap.fromTo(els, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.35 }),
      });
    } catch {
      // An animation problem should never break the list itself.
    }
  }, [orderKey, container]);
}