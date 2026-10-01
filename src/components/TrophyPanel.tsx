"use client";

import { useEffect, useRef, useState } from "react";
import { TROPHIES } from "@/lib/domain/trophies";
import type { DateKey, Quest } from "@/lib/domain/types";

type Props = {
  open: boolean;
  onClose: () => void;
  trophies: Record<string, DateKey>;
  completed: Quest[];
};

type Tab = "trophies" | "completed";

const TABS: { id: Tab; label: string }[] = [
  { id: "trophies", label: "Trophies" },
  { id: "completed", label: "Completed quests" },
];

function finishedOn(q: Quest): DateKey {
  const days = [...q.checkIns, ...q.restoredDates].sort();
  return days[days.length - 1] ?? q.startDate;
}

export function TrophyPanel({ open, onClose, trophies, completed }: Props) {
  const [tab, setTab] = useState<Tab>("trophies");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const earnedCount = Object.keys(trophies).length;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/30 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Trophies and completed quests"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-xl font-semibold">Trophy room</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close trophies"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-lg hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div role="tablist" className="mt-4 flex gap-2 px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                tab === t.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Both panes sit side by side; sliding the track swaps which one is visible. */}
        <div className="mt-4 min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full w-[200%] transition-transform duration-300 ease-out"
            style={{
              transform:
                tab === "trophies" ? "translateX(0)" : "translateX(-50%)",
            }}
          >
            <div
              id="panel-trophies"
              role="tabpanel"
              aria-labelledby="tab-trophies"
              aria-hidden={tab !== "trophies"}
              inert={tab !== "trophies"}
              className="h-full w-1/2 overflow-y-auto px-5 pb-8"
            >
              <p className="mb-3 text-sm text-slate-500">
                {earnedCount} of {TROPHIES.length} earned
              </p>
              <ul className="flex flex-col gap-3">
                {TROPHIES.map((t) => {
                  const earnedOn = trophies[t.key];
                  return (
                    <li
                      key={t.key}
                      className={`rounded-xl border p-4 ${
                        earnedOn
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 opacity-60"
                      }`}
                    >
                      <p className="font-medium">{t.title}</p>
                      <p className="text-sm text-slate-500">{t.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {earnedOn ? `Earned ${earnedOn}` : "Locked"}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div
              id="panel-completed"
              role="tabpanel"
              aria-labelledby="tab-completed"
              aria-hidden={tab !== "completed"}
              inert={tab !== "completed"}
              className="h-full w-1/2 overflow-y-auto px-5 pb-8"
            >
              {completed.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No completed quests yet. Finish a fixed quest and it will show
                  up here.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {completed.map((q) => (
                    <li
                      key={q.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                    >
                      <p className="font-medium">{q.title}</p>
                      <p className="text-xs text-slate-500">
                        {q.checkIns.length} check-ins · finished {finishedOn(q)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
