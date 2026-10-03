"use client";

import { useState } from "react";
import { useQuestStore } from "@/features/quests/store";
import { boxesFor, type Box } from "@/lib/domain/boxes";
import {
  lengthLabel,
  progressLabel,
  skipLabel,
  toneFor,
  type Tone,
} from "@/lib/domain/describe";
import { getStatus } from "@/lib/domain/quest";
import type { Quest, QuestStatus } from "@/lib/domain/types";
import { ConfirmDialog } from "./ConfirmDialog";

const BOX_BASE =
  "relative flex aspect-square min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border";

const BOX_STYLES: Record<Box["state"], string> = {
  checked: "border-zinc-300 text-zinc-400",
  restored: "border-amber-300 bg-amber-50 text-amber-700",
  skipped: "border-dashed border-zinc-300 text-zinc-300",
  today: "border-2 border-zinc-900 text-zinc-900",
  upcoming: "border-zinc-200 text-zinc-400",
  missed: "border-zinc-200 bg-zinc-100 text-zinc-400",
};

// frozen = blue, recoverable = grey, dead = red
const TONE_CARD: Record<Tone, string> = {
  normal: "border-zinc-200 bg-white",
  frozen: "border-blue-300 bg-blue-50",
  recoverable: "border-zinc-200 bg-zinc-100",
  dead: "border-red-300 bg-red-50",
};

const TONE_TEXT: Record<Tone, string> = {
  normal: "text-zinc-500",
  frozen: "text-blue-700",
  recoverable: "text-zinc-500",
  dead: "text-red-700",
};

const ACTION =
  "rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";

function statusLabel(status: QuestStatus): string {
  switch (status.state) {
    case "active":
    case "paused":
    case "completed":
      return `Streak: ${status.streak}`;
    case "broken":
      return `Streak broken · missed ${status.missedDays} ${status.missedDays === 1 ? "day" : "days"}`;
    case "lapsed":
      return "Too long without a check-in";
  }
}

function BoxFace({
  box,
  crossed,
  animate,
}: {
  box: Box;
  crossed: boolean;
  animate: boolean;
}) {
  return (
    <>
      <span className="text-[10px] font-medium tracking-wider uppercase">
        {box.weekday ?? "–"}
      </span>
      <span className="text-lg leading-none font-semibold tabular-nums">
        {box.day}
      </span>
      {crossed && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={`absolute inset-0 size-full p-2.5 text-zinc-900 ${animate ? "x-draw" : ""}`}
        >
          <path className="x-stroke" pathLength="1" d="M4 4L20 20" />
          <path className="x-stroke" pathLength="1" d="M20 4L4 20" />
        </svg>
      )}
    </>
  );
}

export function QuestCard({ quest }: { quest: Quest }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const today = useQuestStore((s) => s.today());
  const restores = useQuestStore((s) => s.restores);
  const checkInQuest = useQuestStore((s) => s.checkInQuest);
  const restoreStreak = useQuestStore((s) => s.restoreStreak);
  const restartQuest = useQuestStore((s) => s.restartQuest);
  const holdQuest = useQuestStore((s) => s.holdQuest);
  const resumeQuest = useQuestStore((s) => s.resumeQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);

  const status = getStatus(quest, today);
  const tone = toneFor(status, restores);
  const boxes = boxesFor(quest, today);
  const canCheckIn = status.state === "active";
  const onHold = status.state === "paused";
  const noRestoresLeft = status.state === "broken" && restores < 1;
  const description = [lengthLabel(quest), skipLabel(quest)]
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      className={`flex flex-col gap-4 rounded-xl border p-5 ${TONE_CARD[tone]}`}
    >
      <div
        className={`flex flex-col gap-4 ${tone === "recoverable" ? "opacity-60 grayscale" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold break-words">
              {quest.title}
            </h3>
            <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onHold && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                On hold
              </span>
            )}
            <span className="text-sm font-medium tabular-nums">
              {progressLabel(quest, today)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          {boxes.map((box) => {
            const style =
              box.date === null
                ? "border-dashed border-zinc-300 text-zinc-300"
                : BOX_STYLES[box.state];

            if (box.state === "today" && canCheckIn) {
              return (
                <button
                  key={box.day}
                  type="button"
                  aria-label={`Check in today: ${quest.title}`}
                  onClick={() => checkInQuest(quest.id)}
                  className={`${BOX_BASE} ${style} transition hover:bg-zinc-50`}
                >
                  <BoxFace box={box} crossed={false} animate={false} />
                </button>
              );
            }

            return (
              <div
                key={box.day}
                aria-hidden
                title={box.date ?? undefined}
                className={`${BOX_BASE} ${style}`}
              >
                <BoxFace
                  box={box}
                  crossed={box.state === "checked"}
                  animate={box.date === today}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className={`text-sm ${TONE_TEXT[tone]}`}>{statusLabel(status)}</p>
          {noRestoresLeft && (
            <p className="mt-0.5 text-xs text-red-700">
              No streak restores left. Finish a quest to earn one.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {status.state === "broken" && (
            <>
              <button
                type="button"
                disabled={restores < 1}
                onClick={() => restoreStreak(quest.id)}
                className={ACTION}
              >
                Use streak restore ({restores} left)
              </button>
              <button
                type="button"
                onClick={() => restartQuest(quest.id)}
                className={ACTION}
              >
                Restart
              </button>
            </>
          )}
          {status.state === "lapsed" && (
            <button
              type="button"
              onClick={() => restartQuest(quest.id)}
              className={ACTION}
            >
              Restart
            </button>
          )}
          {status.state === "active" && (
            <button
              type="button"
              onClick={() => holdQuest(quest.id)}
              className={ACTION}
            >
              Put on hold
            </button>
          )}
          {status.state === "paused" && (
            <button
              type="button"
              onClick={() => resumeQuest(quest.id)}
              className={ACTION}
            >
              Resume
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={ACTION}
          >
            Delete
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete quest?"
        description={`"${quest.title}" and its progress will be removed. Trophies you've earned stay.`}
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteQuest(quest.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </article>
  );
}
