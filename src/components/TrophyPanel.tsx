"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDay } from "@/lib/domain/dates";
import { plural, summarizeCompleted } from "@/lib/domain/describe";
import { TROPHIES, TROPHY_GROUPS, type Trophy } from "@/lib/domain/trophies";
import type { DateKey, Quest } from "@/lib/domain/types";
import { useScrollLock } from "@/lib/useScrollLock";

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

function Chip({ children }: { children: ReactNode }) {
  return (
    <li className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700">
      {children}
    </li>
  );
}

function TrophyItem({
  trophy,
  earnedOn,
}: {
  trophy: Trophy;
  earnedOn: DateKey | undefined;
}) {
  return (
    <li
      className={`rounded-xl border p-4 ${
        earnedOn ? "border-zinc-300 bg-zinc-50" : "border-zinc-200 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{trophy.title}</p>
        {trophy.restores > 0 && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              earnedOn
                ? "bg-amber-100 text-amber-800"
                : "bg-zinc-100 text-zinc-600"
            }`}
          >
            +{plural(trophy.restores, "restore")}
          </span>
        )}
      </div>
      <p className="text-sm text-zinc-500">{trophy.description}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {earnedOn ? `Earned ${formatDay(earnedOn)}` : "Locked"}
      </p>
    </li>
  );
}

function CompletedQuest({ quest }: { quest: Quest }) {
  const s = summarizeCompleted(quest);
  return (
    <li className="rounded-xl border border-zinc-200 p-4">
      <p className="font-medium">{quest.title}</p>
      <p className="text-sm text-zinc-500">
        {[s.length, s.skips].filter(Boolean).join(" · ")}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {formatDay(s.started)} → {formatDay(s.finished)}
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        <Chip>{plural(s.checkIns, "check-in")}</Chip>
        <Chip>Best streak {s.bestStreak}</Chip>
        {s.restoredDays > 0 && (
          <Chip>{plural(s.restoredDays, "restored day")}</Chip>
        )}
        {s.skippedDays > 0 && (
          <Chip>{plural(s.skippedDays, "day")} skipped</Chip>
        )}
        {s.heldDays > 0 && <Chip>{plural(s.heldDays, "day")} on hold</Chip>}
      </ul>
    </li>
  );
}

export function TrophyPanel({ open, onClose, trophies, completed }: Props) {
  const [tab, setTab] = useState<Tab>("trophies");
  const closeRef = useRef<HTMLButtonElement>(null);

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Only count trophies that still exist in the catalog.
  const earnedCount = TROPHIES.filter((t) => t.key in trophies).length;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-zinc-900/10 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-label="Trophies and completed quests"
        aria-hidden={!open}
        inert={!open}
        className={`fixed top-3 right-3 bottom-3 z-50 flex w-[calc(100%-1.5rem)] max-w-sm flex-col rounded-xl border border-zinc-200 bg-white transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-[calc(100%+1.5rem)]"
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-xl font-semibold">Trophy room</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close trophies"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full text-lg hover:bg-zinc-100"
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
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 hover:bg-zinc-200"
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
              <p className="mb-4 text-sm text-zinc-500">
                {earnedCount} of {TROPHIES.length} earned
              </p>
              {TROPHY_GROUPS.map((group) => (
                <section
                  key={group.id}
                  aria-label={group.label}
                  className="mb-6"
                >
                  <h3 className="mb-2.5 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    {group.label}
                  </h3>
                  <ul className="flex flex-col gap-2.5">
                    {TROPHIES.filter((t) => t.group === group.id).map((t) => (
                      <TrophyItem
                        key={t.key}
                        trophy={t}
                        earnedOn={trophies[t.key]}
                      />
                    ))}
                  </ul>
                </section>
              ))}
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
                <p className="text-sm text-zinc-500">
                  No completed quests yet. Finish a fixed quest and it will show
                  up here.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {completed.map((q) => (
                    <CompletedQuest key={q.id} quest={q} />
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
