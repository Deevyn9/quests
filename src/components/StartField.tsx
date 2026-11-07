"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { MAX_START_AHEAD_DAYS } from "@/lib/domain/create";
import { addDays } from "@/lib/domain/dates";
import { describeStart, type StartChoice } from "@/lib/domain/start";
import type { DateKey } from "@/lib/domain/types";
import { MiniCalendar } from "./MiniCalendar";

const pill = (active: boolean) =>
  `inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition ${
    active ? "bg-zinc-900 text-white" : "bg-zinc-100 hover:bg-zinc-200"
  }`;

// Opens and closes smoothly. `inert` keeps hidden controls out of the tab order.
function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

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
      <span className="mb-1.5 text-sm font-medium">When does it start?</span>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3.5 py-2.5">
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
          className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
            value.immediately ? "bg-zinc-900" : "bg-zinc-300"
          }`}
        >
          <span
            aria-hidden
            className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform motion-reduce:transition-none ${
              value.immediately ? "translate-x-4" : ""
            }`}
          />
        </button>
      </div>

      <Reveal open={later}>
        <div className="flex flex-wrap gap-2 pt-2">
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
            <HugeiconsIcon icon={Calendar03Icon} size={16} strokeWidth={1.5} aria-hidden />
            Pick a date
          </button>
        </div>
      </Reveal>

      <Reveal open={later && value.pick === "date"}>
        <div className="pt-2">
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
