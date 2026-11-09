"use client";

import { useEffect } from "react";
import { useScrollLock } from "@/lib/useScrollLock";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 grid place-items-center bg-zinc-900/10 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-heading"
        className="animate-pop-in rounded-surface w-full max-w-sm border border-zinc-200 bg-white p-6"
      >
        <h2 id="confirm-heading" className="text-lg font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-control ease-spring inline-flex h-10 items-center justify-center px-4 text-sm font-medium transition duration-300 hover:bg-zinc-100 active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-control ease-spring inline-flex h-10 items-center justify-center px-5 text-sm font-medium text-white transition duration-300 active:scale-95 ${
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
