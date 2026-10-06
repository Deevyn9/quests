import { useEffect, useState } from "react";

// Returns true while `active` is true, and for `ms` more milliseconds after it turns off.
export function useLingering(active: boolean, ms: number): boolean {
  const [lingering, setLingering] = useState(false);
  const [previous, setPrevious] = useState(active);

  // Turned off just now: keep it around for the exit animation.
  if (previous !== active) {
    setPrevious(active);
    setLingering(!active);
  }

  useEffect(() => {
    if (!lingering) return;
    const timer = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(timer);
  }, [lingering, ms]);

  return active || lingering;
}