"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { useEffect, useState, type FormEvent } from "react";
import { useQuestStore } from "@/features/quests/store";
import {
  START_IMMEDIATELY,
  startDateFor,
  type StartChoice,
} from "@/lib/domain/start";
import { useScrollLock } from "@/lib/useScrollLock";
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  chip,
  FIELD,
  HINT,
  LABEL,
  pill,
} from "./formStyles";
import { Reveal } from "./Reveal";
import { StartField } from "./StartField";

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

export function NewQuestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Rendering the body only while open gives a fresh, empty form every time.
  if (!open) return null;
  return <ModalBody onClose={onClose} />;
}

function ModalBody({ onClose }: { onClose: () => void }) {
  const addQuest = useQuestStore((s) => s.addQuest);
  const today = useQuestStore((s) => s.today());

  const [title, setTitle] = useState("");
  const [timeframe, setTimeframe] = useState<TimeframeId>("week");
  const [customDays, setCustomDays] = useState("14");
  const [daysFocused, setDaysFocused] = useState(false);
  const [skipDays, setSkipDays] = useState<number[]>([]);
  const [start, setStart] = useState<StartChoice>(START_IMMEDIATELY);
  const [error, setError] = useState<string | null>(null);

  useScrollLock(true);

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
        startDate: startDateFor(start, today),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-40 grid place-items-center bg-zinc-900/20 p-4 backdrop-blur-sm motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-quest-heading"
        className="animate-pop-in max-h-full w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl shadow-zinc-900/10 motion-reduce:animate-none"
      >
        <h2
          id="new-quest-heading"
          className="text-2xl font-semibold tracking-tight"
        >
          New quest
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="quest-name" className={LABEL}>
              Quest name
            </label>
            <input
              id="quest-name"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Read 10 pages"
              className={FIELD}
            />
          </div>

          {/* No flex gap inside: collapsed sections would still leave their gap behind. */}
          <div className="flex flex-col">
            <span className={`mb-2 ${LABEL}`}>How long?</span>
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

            <Reveal open={customOpen}>
              {/* pt-4 leaves room for the floating "Days" label above the box */}
              <div className="pt-4">
                <div className="relative h-12.5 w-40">
                  <input
                    id="custom-days"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    aria-label="Number of days"
                    value={customDays}
                    onChange={(e) =>
                      setCustomDays(e.target.value.replace(/\D/g, ""))
                    }
                    onFocus={() => setDaysFocused(true)}
                    onBlur={() => setDaysFocused(false)}
                    className={`h-full w-full rounded-2xl border bg-transparent px-4 transition-colors outline-none ${
                      daysFocused ? "border-zinc-900" : "border-zinc-300"
                    }`}
                  />
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-zinc-400 transition-opacity duration-200 motion-reduce:transition-none ${
                      daysFloated ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    10 days
                  </span>
                  <label
                    htmlFor="custom-days"
                    className={`ease-spring pointer-events-none absolute left-3.5 -translate-y-1/2 bg-white px-1.5 text-xs transition-all duration-300 motion-reduce:transition-none ${
                      daysFloated ? "top-0 opacity-100" : "top-1/2 opacity-0"
                    } ${daysFocused ? "text-zinc-900" : "text-zinc-500"}`}
                  >
                    Days
                  </label>
                </div>
              </div>
            </Reveal>
          </div>

          <StartField today={today} value={start} onChange={setStart} />

          <div className="flex flex-col gap-2">
            <span className={LABEL}>Skip these days</span>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((name, day) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  aria-pressed={skipDays.includes(day)}
                  onClick={() => toggleDay(day)}
                  className={chip(skipDays.includes(day))}
                >
                  {name[0]}
                </button>
              ))}
            </div>
            <p className={HINT}>
              Skipped days don&apos;t count against your streak.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={BUTTON_SECONDARY}
            >
              Cancel
            </button>
            <button type="submit" className={BUTTON_PRIMARY}>
              <HugeiconsIcon
                icon={Add01Icon}
                size={18}
                strokeWidth={2}
                aria-hidden
              />
              Create quest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
