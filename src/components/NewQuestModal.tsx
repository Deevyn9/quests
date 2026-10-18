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
  `rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${colors(active)}`;

const dayChip = (active: boolean) =>
  `grid size-9 place-items-center rounded-full text-sm transition-colors duration-200 ${colors(active)}`;

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
  const [daysFocused, setDaysFocused] = useState(false);
  const daysFloated = daysFocused || customDays !== "";

  const customOpen = timeframe === "custom";

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
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-7"
      >
        <h2 id="new-quest-heading" className="text-xl font-semibold">
          New quest
        </h2>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-8">
          <div className="flex flex-col gap-2.5">
            <label htmlFor="quest-name" className="text-sm font-medium">
              Quest name
            </label>
            <input
              id="quest-name"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 10 pages"
              className="rounded-lg border border-zinc-300 px-3.5 py-2.5 outline-none focus:border-zinc-900"
            />
          </div>

          <div className="flex flex-col">
            <span className="mb-3 text-sm font-medium">How long?</span>
            <div className="flex flex-wrap gap-2.5">
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

            {/* Always in the form but collapsed; the row height and opacity animate open. */}
            <div
              inert={!customOpen}
              aria-hidden={!customOpen}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                customOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="mt-2 overflow-hidden pt-3.5">
                <div className="relative h-12.5 w-36">
                  <input
                    id="custom-days"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    aria-label="Number of days"
                    value={customDays}
                    onChange={(e) =>
                      setCustomDays(e.target.value.replace(/\D/g, ""))
                    }
                    onFocus={() => setDaysFocused(true)}
                    onBlur={() => setDaysFocused(false)}
                    className={`h-full w-full rounded-lg border bg-transparent px-3.5 transition-colors outline-none ${
                      daysFocused ? "border-zinc-900" : "border-zinc-300"
                    }`}
                  />

                  {/* The "10 days" hint, shown only while the field is empty and idle */}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-400 transition-opacity duration-200 motion-reduce:transition-none ${
                      daysFloated ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    10 days
                  </span>

                  {/* "Days" slides up onto the border when focused or filled */}
                  <label
                    htmlFor="custom-days"
                    className={`pointer-events-none absolute left-3 -translate-y-1/2 bg-white px-1.5 text-xs transition-all duration-200 motion-reduce:transition-none ${
                      daysFloated ? "top-0 opacity-100" : "top-1/2 opacity-0"
                    } ${daysFocused ? "text-zinc-900" : "text-zinc-500"}`}
                  >
                    Days
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Skip these days</span>
            <div className="flex flex-wrap gap-2">
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

          <div className="flex justify-end gap-3 pt-1">
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
