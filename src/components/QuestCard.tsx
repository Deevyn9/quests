"use client";

import { useQuestStore } from "@/features/quests/store";
import { boxesFor, type BoxState } from "@/lib/domain/boxes";
import { getStatus } from "@/lib/domain/quest";
import type { Quest, QuestStatus } from "@/lib/domain/types";

const BOX_BASE = "grid size-7 place-items-center rounded-md border-2 text-xs";

const BOX_STYLES: Record<BoxState, string> = {
  checked: "border-emerald-500 bg-emerald-500 text-white",
  restored: "border-amber-300 bg-amber-300",
  skipped: "border-dashed border-slate-300 bg-transparent",
  today: "border-slate-900 bg-white",
  upcoming: "border-slate-200 bg-white/40",
  missed: "border-slate-300 bg-slate-200",
};

function statusLabel(status: QuestStatus): string {
  switch (status.state) {
    case "active":
    case "completed":
      return `Streak: ${status.streak}`;
    case "broken":
      return `Streak broken · missed ${status.missedDays} ${status.missedDays === 1 ? "day" : "days"}`;
    case "lapsed":
      return "Too long without a check-in";
  }
}

const actionClass =
  "rounded-full bg-white px-3 py-1 text-xs font-medium shadow-sm transition hover:shadow disabled:cursor-not-allowed disabled:opacity-50";

export function QuestCard({ quest }: { quest: Quest }) {
  const today = useQuestStore((s) => s.today());
  const restores = useQuestStore((s) => s.restores);
  const checkInQuest = useQuestStore((s) => s.checkInQuest);
  const restoreStreak = useQuestStore((s) => s.restoreStreak);
  const restartQuest = useQuestStore((s) => s.restartQuest);
  const deleteQuest = useQuestStore((s) => s.deleteQuest);

  const status = getStatus(quest, today);
  const boxes = boxesFor(quest, today);
  const canCheckIn = status.state === "active";
  const dimmed = status.state === "broken" || status.state === "lapsed";

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-white/70 p-5 shadow-sm">
      <div
        className={`flex flex-col gap-3 ${dimmed ? "opacity-60 grayscale" : ""}`}
      >
        <div>
          <h3 className="text-lg font-medium">{quest.title}</h3>
          <p className="text-sm text-slate-500">{statusLabel(status)}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {boxes.map((box) =>
            box.state === "today" && canCheckIn ? (
              <button
                key={box.date}
                type="button"
                aria-label={`Check in today: ${quest.title}`}
                onClick={() => checkInQuest(quest.id)}
                className={`${BOX_BASE} ${BOX_STYLES.today} transition hover:bg-emerald-100`}
              />
            ) : (
              <span
                key={box.date}
                aria-hidden
                title={box.date}
                className={`${BOX_BASE} ${BOX_STYLES[box.state]}`}
              >
                {box.state === "checked" ? "✓" : null}
              </span>
            ),
          )}
        </div>
      </div>

      {status.state === "broken" && (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={restores < 1}
            onClick={() => restoreStreak(quest.id)}
            className={actionClass}
          >
            Restore streak ({restores} left)
          </button>
          <button
            type="button"
            onClick={() => restartQuest(quest.id)}
            className={actionClass}
          >
            Restart
          </button>
        </div>
      )}

      {status.state === "lapsed" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => restartQuest(quest.id)}
            className={actionClass}
          >
            Restart
          </button>
          <button
            type="button"
            onClick={() => deleteQuest(quest.id)}
            className={actionClass}
          >
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
