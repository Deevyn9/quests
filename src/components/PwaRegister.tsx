"use client";

import { useEffect } from "react";
import { listenForInstall } from "@/lib/pwa/installPrompt";

// Registers the service worker (production only) and starts listening for the
// browser's install prompt as early as possible. Renders nothing.
export function PwaRegister() {
  useEffect(() => {
    listenForInstall();
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;

    // On the very first visit this page loaded before the service worker existed, so the
    // worker never saw it. Ask it to keep a copy now, so the app opens offline straight away.
    const firstVisit = !navigator.serviceWorker.controller;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        if (firstVisit)
          registration.active?.postMessage({ type: "CACHE_HOME" });
      })
      .catch(() => {});
  }, []);
  return null;
}
