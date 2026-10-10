"use client";

import { DownloadIcon } from "./Icons";
import { useInstall } from "@/lib/pwa/useInstall";

// Only renders when the browser says the app can be installed
// (Chrome, Edge, Android). iOS has no prompt; people use Share > Add to Home Screen.
export function InstallButton() {
  const { available, install } = useInstall();
  if (!available) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      <DownloadIcon className="size-4" aria-hidden />
      Install
    </button>
  );
}
