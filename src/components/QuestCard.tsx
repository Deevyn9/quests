"use client";

import { useState, type MouseEvent } from "react";
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
import { FrostOverlay } from "./FrostOverlay";
import { FlameIcon, RestoreIcon, SnowflakeIcon } from "./Icons";

const BOX_BASE =
  "relative grid aspect-square w-full min-w-0 place-items-center rounded-lg border transition-colors duration-500";

// A crossed-off day fades its weekday so the X reads cleanly on top of it.
const BOX_STYLES: Record<Box["state"], string> = {
  checked: "border-zinc-300 bg-white text-zinc-300",
  restored: "border-amber-300 bg-amber-50 text-amber-700",
  skipped: "box-skipped border-dashed border-zinc-300 text-zinc-300",
  today: "border-2 border-zinc-900 bg-white text-zinc-900",
  upcoming: "border-zinc-300 bg-white text-zinc-700",
  missed: "border-zinc-300 bg-zinc-200 text-zinc-500",
};

// On a frozen (blue) card, crossed-off days pick up the blue too.
const FROZEN_CHECKED = "border-blue-300 bg-white text-blue-200";

const NUMBER_STYLES: Record<Box["state"], string> = {
  checked: "text-zinc-500",
  restored: "text-amber-700",
  skipped: "text-zinc-300",
  today: "font-semibold text-zinc-900",
  upcoming: "text-zinc-600",
  missed: "text-zinc-500",
};

// frozen = blue, recoverable = grey, dead = red
const TONE_CARD: Record<Tone, string> = {
  normal: "border-zinc-200 bg-white",
  frozen: "border-blue-400 bg-blue-200",
  recoverable: "border-zinc-200 bg-zinc-100",
  dead: "border-red-300 bg-red-50",
};

const TONE_TEXT: Record<Tone, string> = {
  normal: "text-zinc-500",
  frozen: "text-blue-800",
  recoverable: "text-zinc-500",
  dead: "text-red-700",
};

const ACTION =
  "inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium transition hover:bg-zinc-50 disabled:opacity-50";

const DELETE =
  "inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50";

function statusLabel(status: QuestStatus): string {
  switch (status.state) {
    case "active":
    case "completed":
      return `Streak: ${status.streak}`;
    case "paused":
      return `Streak frozen at ${status.streak}`;
    case "broken":
      return `Streak broken · missed ${status.missedDays} ${status.missedDays === 1 ? "day" : "days"}`;
    case "lapsed":
      return "Too long without a check-in";
  }
}

function StreakIcon({ status, tone }: { status: QuestStatus; tone: Tone }) {
  if (status.state === "paused")
    return <SnowflakeIcon className="size-4 text-blue-600" />;
  const lit =
    (status.state === "active" || status.state === "completed") &&
    status.streak > 0;
  const colour = lit
    ? "text-orange-500"
    : tone === "dead"
      ? "text-red-400"
      : "text-zinc-400";
  return <FlameIcon className={`size-4 ${colour}`} />;
}

// One button that morphs between "Put on hold" and "Resume" instead of swapping two buttons.
function HoldToggle({
  held,
  onHold,
  onResume,
}: {
  held: boolean;
  onHold: () => void;
  onResume: () => void;
}) {
  return (
    <button
      type="button"
      onClick={held ? onResume : onHold}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-500 ${
        held
          ? "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
          : "border-zinc-300 bg-white hover:bg-zinc-50"
      }`}
    >
      <SnowflakeIcon className="size-3.5" />
      <span key={held ? "resume" : "hold"} className="fade-in">
        {held ? "Resume" : "Put on hold"}
      </span>
    </button>
  );
}

function CrossOut({ animate, colour }: { animate: boolean; colour: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={`pointer-events-none absolute inset-0 size-full p-3 ${colour} ${animate ? "x-draw" : ""}`}
    >
      <path className="x-stroke" pathLength="1" d="M4 4L20 20" />
      <path className="x-stroke" pathLength="1" d="M20 4L4 20" />
    </svg>
  );
}

type DayCellProps = {
  box: Box;
  today: string;
  tone: Tone;
  canCheckIn: boolean;
  title: string;
  onCheckIn: () => void;
};

// The weekday sits centered in the box; the day number sits underneath it.
function DayCell({
  box,
  today,
  tone,
  canCheckIn,
  title,
  onCheckIn,
}: DayCellProps) {
  const placeholder = box.date === null;
  const frozenChecked = tone === "frozen" && box.state === "checked";
  const style = placeholder
    ? "border-dashed border-zinc-300 text-zinc-300"
    : frozenChecked
      ? FROZEN_CHECKED
      : BOX_STYLES[box.state];
  const numberStyle = placeholder ? "text-zinc-300" : NUMBER_STYLES[box.state];

  const face = (
    <>
      <span className="text-sm font-medium">{box.weekday ?? "–"}</span>
      {box.state === "checked" && (
        <CrossOut
          animate={box.date === today}
          colour={tone === "frozen" ? "text-blue-900" : "text-zinc-800"}
        />
      )}
    </>
  );

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      {box.state === "today" && canCheckIn ? (
        <button
          type="button"
          aria-label={`Check in today: ${title}`}
          onClick={onCheckIn}
          className={`${BOX_BASE} ${style} hover:bg-zinc-50`}
        >
          {face}
        </button>
      ) : (
        <div
          aria-hidden
          title={box.date ?? undefined}
          className={`${BOX_BASE} ${style}`}
        >
          {face}
        </div>
      )}
      <span aria-hidden className={`text-xs tabular-nums ${numberStyle}`}>
        {box.day}
      </span>
    </div>
  );
}

export function QuestCard({ quest }: { quest: Quest }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [burst, setBurst] = useState(0);

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
  const canHold = status.state === "active" || onHold;
  const holdStartsLater = quest.pausedFrom !== null && quest.pausedFrom > today;
  const noRestoresLeft = status.state === "broken" && restores < 1;
  const description = [lengthLabel(quest), skipLabel(quest)]
    .filter(Boolean)
    .join(" · ");

  // Clicking the card itself (not one of its buttons) makes the frost form again.
  function handleCardClick(e: MouseEvent<HTMLElement>) {
    if (!onHold) return;
    if ((e.target as HTMLElement).closest("button")) return;
    setBurst((b) => b + 1);
  }

  return (
    <article
      onClick={handleCardClick}
      className={`relative flex flex-col gap-4 rounded-xl border p-5 transition-colors duration-500 ${TONE_CARD[tone]}`}
    >
      {onHold && <FrostOverlay burst={burst} />}

      <div
        className={`relative z-10 flex flex-col gap-4 transition-[opacity,filter] duration-500 ${
          tone === "recoverable" ? "opacity-60 grayscale" : ""
        }`}
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
              <span className="fade-in rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                {holdStartsLater ? "On hold from tomorrow" : "On hold"}
              </span>
            )}
            <span className="text-sm font-medium tabular-nums">
              {progressLabel(quest, today)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-x-2 gap-y-3 sm:grid-cols-7">
          {boxes.map((box) => (
            <DayCell
              key={box.day}
              box={box}
              today={today}
              tone={tone}
              canCheckIn={canCheckIn}
              title={quest.title}
              onCheckIn={() => checkInQuest(quest.id)}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p
            className={`text-sm transition-colors duration-500 ${TONE_TEXT[tone]}`}
          >
            <span
              key={onHold ? "frozen" : "live"}
              className="fade-in inline-flex items-center gap-1.5"
            >
              <StreakIcon status={status} tone={tone} />
              {statusLabel(status)}
            </span>
          </p>
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
                <RestoreIcon className="size-3.5" />
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
          {canHold && (
            <HoldToggle
              held={onHold}
              onHold={() => holdQuest(quest.id)}
              onResume={() => resumeQuest(quest.id)}
            />
          )}
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className={DELETE}
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
        destructive
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteQuest(quest.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </article>
  );
}
