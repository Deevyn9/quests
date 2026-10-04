import { useEffect } from "react";

// Several dialogs can be open at once (a delete confirmation inside a card, say),
// so the page only scrolls again once the last one has closed.
let locks = 0;
let saved = "";

function lock() {
  if (locks++ === 0) {
    saved = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
}

function unlock() {
  if (--locks === 0) {
    document.body.style.overflow = saved;
  }
}

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}