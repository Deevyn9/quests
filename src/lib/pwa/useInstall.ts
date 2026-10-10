"use client";

import { useCallback, useSyncExternalStore } from "react";
import { canInstall, promptInstall, subscribe } from "./installPrompt";

export function useInstall() {
  const available = useSyncExternalStore(subscribe, canInstall, () => false);
  const install = useCallback(() => promptInstall(), []);
  return { available, install };
}