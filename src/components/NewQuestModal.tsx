"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useQuestStore } from "@/features/quests/store";
import { useScrollLock } from "@/lib/useScrollLock";

const TIMEFRAMES = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "custom", label: "Custom" },
  { id: "infinite", label: "Infinite" },
] as const;

type TimeframeId = (typeof TIMEFRAMES)[number]["id"];

const PRESET_DAYS = { day: 1, week: 7, month: 30 } as const;
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function durationFor(
  timeframe: TimeframeId,
  customDays: string,
): number | null {
  if (timeframe === "infinite") return null;
  if (timeframe === "custom") return Number(customDays);
  return PRESET_DAYS[timeframe];
}

const colors = (active: boolean) =>
  active ? "bg-zinc-900 text-white" : "bg-zinc-100 hover:bg-zinc-200";

const pill = (active: boolean) =>
  `rounded-full px-3 py-1 text-sm transition ${colors(active)}`;

const dayChip = (active: boolean) =>
  `grid size-9 place-items-center rounded-full text-sm transition ${colors(active)}`;

export function NewQuestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Rendering the body only while open resets the form each time for free.
  if (!open) return null;
  return <ModalBody onClose={onClose} />;
}

function ModalBody({ onClose }: { onClose: () => void }) {
  useScrollLock(true);

  const addQuest = useQuestStore((s) => s.addQuest);
  const [title, setTitle] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeId>("week");
  const [customDays, setCustomDays] = useState("14");
  const [skipDays, setSkipDays] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleDay(day: number) {
    setSkipDays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      addQuest({
        title,
        kind: timeframe === "infinite" ? "infinite" : "fixed",
        durationDays: durationFor(timeframe, customDays),
        skipWeekdays: skipDays,
      });
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
        aria-labelledby="new-quest-heading"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h2 id="new-quest-heading" className="text-xl font-semibold">
          New quest
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quest-name" className="text-sm font-medium">
              Quest name
            </label>
            <input
              id="quest-name"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 10 pages"
              className="rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">How long?</span>
            <div className="flex flex-wrap gap-2">
              {TIMEFRAMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={timeframe === t.id}
                  onClick={() => setTimeframe(t.id)}
                  className={pill(timeframe === t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {timeframe === "custom" && (
              <input
                type="number"
                min={1}
                max={365}
                aria-label="Number of days"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-28 rounded-lg border border-zinc-300 px-3 py-2 outline-none focus:border-zinc-900"
              />
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
                  aria-pressed={skipDays.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={dayChip(skipDays.includes(day))}
                >
                  {name[0]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 text-sm hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Create quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
