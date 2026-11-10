"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { compareMonths, MONTH_NAMES, monthGrid, monthOf, shiftMonth, type MonthRef } from "@/lib/domain/calendar";
import { formatDay } from "@/lib/domain/dates";
import type { DateKey } from "@/lib/domain/types";
import { ACCENT_ON } from "./formStyles";

const WEEK_STARTS_ON = 0; // 0 = Sunday first, 1 = Monday first
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
const HEADER = Array.from({ length: 7 }, (_, i) => WEEKDAY_INITIALS[(i + WEEK_STARTS_ON) % 7]);

const NAV =
  "grid size-9 place-items-center rounded-full border border-zinc-300 bg-white text-zinc-900 transition duration-300 ease-spring hover:bg-zinc-50 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white motion-reduce:transition-none";

export function MiniCalendar({
  selected,
  today,
  min,
  max,
  onSelect,
}: {
  selected: DateKey | null;
  today: DateKey;
  min: DateKey; // first day that can be picked
  max: DateKey; // last day that can be picked
  onSelect: (date: DateKey) => void;
}) {
  const [view, setView] = useState<MonthRef>(monthOf(selected ?? min));
  const cells = monthGrid(view, WEEK_STARTS_ON);

  const canGoBack = compareMonths(view, monthOf(min)) > 0;
  const canGoForward = compareMonths(view, monthOf(max)) < 0;

  return (
    <div className="rounded-2xl border border-zinc-200 p-4" role="group" aria-label="Start date">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => setView((v) => shiftMonth(v, -1))}
          className={NAV}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} aria-hidden />
        </button>
        <p aria-live="polite" className="text-sm font-medium">
          {MONTH_NAMES[view.month]} {view.year}
        </p>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => setView((v) => shiftMonth(v, 1))}
          className={NAV}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 place-items-center gap-y-1">
        {HEADER.map((d, i) => (
          <span key={i} aria-hidden className="grid h-7 place-items-center text-xs text-zinc-400">
            {d}
          </span>
        ))}

        {cells.map((date, i) => {
          if (!date) return <span key={i} />;

          const disabled = date < min || date > max;
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              aria-label={`${formatDay(date)} ${date.slice(0, 4)}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(date)}
              className={`grid size-10 place-items-center rounded-xl text-sm tabular-nums transition duration-300 ease-spring motion-reduce:transition-none ${
                isSelected
                  ? `scale-110 font-medium ${ACCENT_ON}`
                  : disabled
                    ? "cursor-not-allowed text-zinc-300"
                    : "hover:bg-zinc-100 active:scale-90"
              } ${date === today && !isSelected ? "ring-1 ring-zinc-300" : ""}`}
            >
              {Number(date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
