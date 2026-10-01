"use client";

import { useEffect } from "react";
import { useQuestStore } from "@/features/quests/store";

export function Toast() {
  const toast = useQuestStore((s) => s.toast);
  const dismiss = useQuestStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, 2500);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-4 z-30 mx-auto w-fit max-w-[80vw] rounded-full bg-slate-900 px-5 py-2 text-sm text-white shadow-lg"
    >
      {toast.message}
    </div>
  );
}
