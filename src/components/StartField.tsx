"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { MAX_START_AHEAD_DAYS } from "@/lib/domain/create";
import { addDays } from "@/lib/domain/dates";
import { describeStart, type StartChoice } from "@/lib/domain/start";
import type { DateKey } from "@/lib/domain/types";
import { ACCENT_BG, LABEL, pill } from "./formStyles";
import { MiniCalendar } from "./MiniCalendar";
import { Reveal } from "./Reveal";

export function StartField({
  today,
  value,
  onChange,
}: {
  today: DateKey;
  value: StartChoice;
  onChange: (next: StartChoice) => void;
}) {
  const later = !value.immediately;

  return (
    // No flex gap here: collapsed sections would still leave their gap behind.
    <div className="flex flex-col">
      <span className={`mb-2 ${LABEL}`}>When does it start?</span>

      <div className="flex min-h-12.5 items-center justify-between gap-3 rounded-2xl border border-zinc-300 bg-white px-4 py-2">
        <div className="min-w-0">
          <p id="start-now-label" className="text-sm font-medium">
            Start immediately
          </p>
          <p className="text-xs text-zinc-500">{describeStart(value, today)}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.immediately}
          aria-labelledby="start-now-label"
          onClick={() => onChange({ ...value, immediately: !value.immediately })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 ${
            value.immediately ? ACCENT_BG : "bg-zinc-300"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-600 ease-spring motion-reduce:transition-none ${
              value.immediately ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      <Reveal open={later}>
        <div className="flex flex-wrap gap-2 pt-3">
          <button
            type="button"
            aria-pressed={value.pick === "tomorrow"}
            onClick={() => onChange({ ...value, pick: "tomorrow" })}
            className={pill(value.pick === "tomorrow")}
          >
            Tomorrow
          </button>
          <button
            type="button"
            aria-pressed={value.pick === "date"}
            onClick={() => onChange({ ...value, pick: "date" })}
            className={pill(value.pick === "date")}
          >
            <HugeiconsIcon icon={Calendar03Icon} size={18} strokeWidth={1.5} aria-hidden />
            Pick a date
          </button>
        </div>
      </Reveal>

      <Reveal open={later && value.pick === "date"}>
        <div className="pt-3">
          <MiniCalendar
            selected={value.date}
            today={today}
            min={addDays(today, 1)}
            max={addDays(today, MAX_START_AHEAD_DAYS)}
            onSelect={(date) => onChange({ ...value, date })}
          />
        </div>
      </Reveal>
    </div>
  );
}
