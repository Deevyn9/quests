"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onCancel: () => void;
  signOutAction: () => Promise<void>;
};

export function SignOutDialog({ open, onCancel, signOutAction }: Props) {
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
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-out-heading"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="sign-out-heading" className="text-lg font-semibold">
          Sign out?
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Your quests are saved and will be here when you sign back in.
        </p>
        <form action={signOutAction} className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
