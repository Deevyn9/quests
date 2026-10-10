"use client";

import { useEffect } from "react";
import { listenForInstall } from "@/lib/pwa/installPrompt";

// Registers the service worker (production only) and starts listening for the
// browser's install prompt as early as possible. Renders nothing.
export function PwaRegister() {
  useEffect(() => {
    listenForInstall();
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }
  }, []);
  return null;
}
