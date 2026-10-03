// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { useQuestStore } from "@/features/quests/store";
import { makeQuest } from "@/lib/domain/fixtures";
import { QuestCard } from "./QuestCard";

const initialState = useQuestStore.getState();
const base = {
  durationDays: 30,
  startDate: "2026-09-01",
  checkIns: ["2026-09-01"],
};

function show(
  today: string,
  restores: number,
  over: Parameters<typeof makeQuest>[0] = {},
) {
  useQuestStore.setState(
    { ...initialState, ready: true, restores, today: () => today },
    true,
  );
  render(<QuestCard quest={makeQuest({ ...base, ...over })} />);
}

afterEach(cleanup);

describe("QuestCard colours", () => {
  it("is plain white for an active quest", () => {
    show("2026-09-01", 0);
    expect(screen.getByRole("article")).toHaveClass(
      "border-zinc-200",
      "bg-white",
    );
  });

  it("is blue while on hold", () => {
    show("2026-09-03", 0, { pausedFrom: "2026-09-02" });
    expect(screen.getByRole("article")).toHaveClass(
      "border-blue-300",
      "bg-blue-50",
    );
    expect(screen.getByText("On hold")).toBeInTheDocument();
  });

  it("is grey when the streak is broken and a restore is available", () => {
    show("2026-09-03", 1);
    expect(screen.getByRole("article")).toHaveClass("bg-zinc-100");
    expect(
      screen.getByRole("button", { name: /use streak restore/i }),
    ).toBeEnabled();
  });

  it("is red when the streak is broken and there are no restores", () => {
    show("2026-09-03", 0);
    expect(screen.getByRole("article")).toHaveClass(
      "border-red-300",
      "bg-red-50",
    );
    expect(
      screen.getByRole("button", { name: /use streak restore/i }),
    ).toBeDisabled();
    expect(screen.getByText(/no streak restores left/i)).toBeInTheDocument();
  });

  it("is red once the restore window has passed, whatever the balance", () => {
    show("2026-09-10", 5);
    expect(screen.getByRole("article")).toHaveClass(
      "border-red-300",
      "bg-red-50",
    );
    expect(
      screen.queryByRole("button", { name: /use streak restore/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restart" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
  });
});
