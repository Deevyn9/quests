"use client";

import { useEffect } from "react";
import { useQuestStore } from "@/features/quests/store";

export function Toast() {
  const toast = useQuestStore((s) => s.toast);
  const dismiss = useQuestStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, 3000);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-4 z-30 mx-auto w-fit max-w-[min(90vw,28rem)] rounded-2xl bg-zinc-900 px-5 py-2.5 text-center text-sm text-white"
    >
      {toast.message}
    </div>
  );
}
