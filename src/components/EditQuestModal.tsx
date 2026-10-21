"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuestStore } from "@/features/quests/store";
import { daysSoFar, type QuestPatch } from "@/lib/domain/edit";
import { getStatus } from "@/lib/domain/quest";
import type { Quest } from "@/lib/domain/types";

const TIMEFRAMES = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
  { id: "infinite", label: "Infinite" },
] as const;

type TimeframeId = (typeof TIMEFRAMES)[number]["id"];

const PRESET_DAYS = { day: 1, week: 7, month: 30 } as const;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function timeframeOf(q: Quest): TimeframeId {
  if (q.durationDays === null) return "infinite";
  const preset = (Object.keys(PRESET_DAYS) as (keyof typeof PRESET_DAYS)[]).find(
    (k) => PRESET_DAYS[k] === q.durationDays,
  );
  return preset ?? "custom";
}

function durationFor(timeframe: TimeframeId, customDays: string): number | null {
  if (timeframe === "infinite") return null;
  if (timeframe === "custom") return Number(customDays);
  return PRESET_DAYS[timeframe];
}

const colors = (active: boolean) =>
  active ? "bg-zinc-900 text-white" : "bg-zinc-100 hover:bg-zinc-200";

const pill = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${colors(active)}`;

const dayChip = (active: boolean) =>
  `grid size-9 place-items-center rounded-full text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${colors(active)}`;

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

export function EditQuestModal({
  quest,
  open,
  onClose,
}: {
  quest: Quest;
  open: boolean;
  onClose: () => void;
}) {
  // Rendering the body only while open resets the form to the quest each time.
  if (!open) return null;
  return <ModalBody quest={quest} onClose={onClose} />;
}

function ModalBody({ quest, onClose }: { quest: Quest; onClose: () => void }) {
  const editQuest = useQuestStore((s) => s.editQuest);
  const today = useQuestStore((s) => s.today());

  const [title, setTitle] = useState(quest.title);
  const [timeframe, setTimeframe] = useState<TimeframeId>(timeframeOf(quest));
  const [customDays, setCustomDays] = useState(quest.durationDays?.toString() ?? "");
  const [daysFocused, setDaysFocused] = useState(false);
  const [skipDays, setSkipDays] = useState<number[]>(quest.skipWeekdays);
  const [error, setError] = useState<string | null>(null);

  // A finished or broken quest keeps its schedule; only the name can change.
  const state = getStatus(quest, today).state;
  const locked = state === "completed" || state === "broken" || state === "lapsed";
  const minDays = daysSoFar(quest, today);
  const customOpen = timeframe === "custom";
  const daysFloated = daysFocused || customDays !== "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleDay(day: number) {
    setSkipDays((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Send only what changed.
    const patch: QuestPatch = {};
    if (title.trim() !== quest.title) patch.title = title;
    if (!locked) {
      const days = durationFor(timeframe, customDays);
      if (days !== quest.durationDays) patch.durationDays = days;
      if (!sameDays(skipDays, quest.skipWeekdays)) patch.skipWeekdays = skipDays;
    }

    if (Object.keys(patch).length === 0) {
      onClose();
      return;
    }

    try {
      editQuest(quest.id, patch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-zinc-900/10 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-quest-heading"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 id="edit-quest-heading" className="text-xl font-semibold">
          Edit quest
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-quest-name" className="text-sm font-medium">
              Quest name
            </label>
            <input
              id="edit-quest-name"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </div>

          {locked && (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              {state === "completed"
                ? "This quest is complete, so only its name can change."
                : "Restore or restart this quest to change its length or skipped days."}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">How long?</span>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map((t) => {
                const tooShort = t.id in PRESET_DAYS && PRESET_DAYS[t.id as keyof typeof PRESET_DAYS] < minDays;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={locked || tooShort}
                    aria-pressed={timeframe === t.id}
                    onClick={() => setTimeframe(t.id)}
                    className={pill(timeframe === t.id)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div
              inert={!customOpen}
              aria-hidden={!customOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                customOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="mt-3 overflow-hidden pt-3.5">
                <div className="relative h-12.5 w-36">
                  <input
                    id="edit-custom-days"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    disabled={locked}
                    aria-label="Number of days"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value.replace(/\D/g, ""))}
                    onFocus={() => setDaysFocused(true)}
                    onBlur={() => setDaysFocused(false)}
                    className={`h-full w-full rounded-lg border bg-transparent px-3.5 transition-colors outline-none disabled:opacity-40 ${
                      daysFocused ? "border-zinc-900" : "border-zinc-300"
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400 transition-opacity duration-200 motion-reduce:transition-none ${
                      daysFloated ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    10 days
                  </span>
                  <label
                    htmlFor="edit-custom-days"
                    className={`pointer-events-none absolute left-3 -translate-y-1/2 bg-white px-1.5 text-xs transition-all duration-200 motion-reduce:transition-none ${
                      daysFloated ? "top-0 opacity-100" : "top-1/2 opacity-0"
                    } ${daysFocused ? "text-zinc-900" : "text-zinc-500"}`}
                  >
                    Days
                  </label>
                </div>
              </div>
            </div>

            {!locked && minDays > 1 && (
              <p className="text-xs text-zinc-500">
                Already {minDays} days in, so the quest can't be shorter than that.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Skip these days</span>
            <div className="flex gap-1.5">
              {WEEKDAYS.map((name, day) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  disabled={locked}
                  aria-pressed={skipDays.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={dayChip(skipDays.includes(day))}
                >
                  {name[0]}
                </button>
              ))}
            </div>
            {!locked && (
              <p className="text-xs text-zinc-500">Changes apply from today. Past days stay as they were.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm hover:bg-zinc-100">
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
