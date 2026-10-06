"use client";

import { boxesFor } from "@/lib/domain/boxes";
import { lengthLabel, progressLabel, skipLabel } from "@/lib/domain/describe";
import { getStatus } from "@/lib/domain/quest";
import type { Quest } from "@/lib/domain/types";
import { HowItWorks } from "./HowItWorks";
import { FlameIcon } from "./Icons";
import { DayCell } from "./QuestCard";
import { SignInPrompt } from "./SignInPrompt";

// A made-up quest, so visitors see what a card looks like before they sign in.
// The dates are fixed, so it always shows day 4 of 7 on a Thursday.
const SAMPLE_TODAY = "2026-09-10";
const SAMPLE: Quest = {
  id: "sample",
  title: "Read 10 pages",
  kind: "fixed",
  durationDays: 7,
  startDate: "2026-09-07",
  checkIns: ["2026-09-07", "2026-09-08", "2026-09-09"],
  restoredDates: [],
  skipWeekdays: [0, 6],
  skippedDates: [],
  pausedFrom: null,
  pausedDates: [],
};

function SamplePreview() {
  const status = getStatus(SAMPLE, SAMPLE_TODAY);
  const streak = status.state === "active" ? status.streak : 0;
  const description = [lengthLabel(SAMPLE), skipLabel(SAMPLE)]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="sample-heading">
      <h2
        id="sample-heading"
        className="mb-3 text-xs font-medium tracking-wide text-zinc-500 uppercase"
      >
        What a quest looks like
      </h2>

      <div
        aria-hidden
        className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 select-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold">{SAMPLE.title}</p>
            <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
          </div>
          <span className="shrink-0 text-sm font-medium tabular-nums">
            {progressLabel(SAMPLE, SAMPLE_TODAY)}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-x-2 gap-y-3">
          {boxesFor(SAMPLE, SAMPLE_TODAY).map((box) => (
            <DayCell
              key={box.day}
              box={box}
              today={SAMPLE_TODAY}
              tone="normal"
              canCheckIn={false}
              title={SAMPLE.title}
              onCheckIn={() => {}}
            />
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-sm text-zinc-500">
          <FlameIcon className="size-4 text-orange-500" />
          Streak: {streak}
        </p>
      </div>

      <p className="mt-3 text-sm text-zinc-500">
        Cross off today, skip weekends, and watch the streak grow.
      </p>
    </section>
  );
}

export function Welcome({
  signInAction,
}: {
  signInAction: () => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-10">
      <SamplePreview />
      <HowItWorks />
      <div className="flex flex-col items-start gap-3 border-t border-zinc-200 pt-8">
        <p className="text-sm font-medium">Ready to start your first streak?</p>
        <SignInPrompt
          signInAction={signInAction}
          label="Continue with Google"
        />
      </div>
    </div>
  );
}
