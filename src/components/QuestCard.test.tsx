// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  return render(<QuestCard quest={makeQuest({ ...base, ...over })} />);
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
      "border-blue-400",
      "bg-blue-100",
    );
    expect(screen.getByText("On hold")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("is blue straight away when the hold starts tomorrow", () => {
    show("2026-09-01", 0, { pausedFrom: "2026-09-02" });
    expect(screen.getByRole("article")).toHaveClass(
      "border-blue-400",
      "bg-blue-100",
    );
    expect(screen.getByText("On hold from tomorrow")).toBeInTheDocument();
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

describe("QuestCard details", () => {
  it("has a red delete button", () => {
    show("2026-09-01", 0);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "border-red-300",
      "text-red-600",
    );
  });

  it("fades the weekday on a crossed-off day", () => {
    show("2026-09-01", 0);
    const firstDay = screen.getAllByText("Tue")[0].parentElement;
    expect(firstDay).toHaveClass("text-zinc-300");
  });

  it("tints crossed-off days blue while on hold", () => {
    show("2026-09-03", 0, { pausedFrom: "2026-09-02" });
    const firstDay = screen.getAllByText("Tue")[0].parentElement;
    expect(firstDay).toHaveClass("border-blue-300", "text-blue-200");
  });
});

describe("QuestCard transitions", () => {
  it("fades its colours instead of snapping", () => {
    show("2026-09-01", 0);
    expect(screen.getByRole("article")).toHaveClass(
      "transition-colors",
      "duration-500",
    );
  });

  it("uses one hold button that changes into Resume", () => {
    show("2026-09-01", 0);
    expect(screen.getByRole("button", { name: "Put on hold" })).toHaveClass(
      "transition-colors",
    );
    cleanup();

    show("2026-09-03", 0, { pausedFrom: "2026-09-02" });
    expect(screen.getByRole("button", { name: "Resume" })).toHaveClass(
      "bg-blue-600",
    );
    expect(
      screen.queryByRole("button", { name: "Put on hold" }),
    ).not.toBeInTheDocument();
  });
});

describe("QuestCard snow", () => {
  it("forms snowflakes on a frozen card", () => {
    show("2026-09-03", 0, { pausedFrom: "2026-09-02" });
    expect(
      screen.getByRole("article").querySelector("[data-snow]"),
    ).not.toBeNull();
  });

  it("has no snow on a normal card", () => {
    show("2026-09-01", 0);
    expect(screen.getByRole("article").querySelector("[data-snow]")).toBeNull();
  });

  it("replays the snow when a frozen card is clicked", async () => {
    const user = userEvent.setup();
    show("2026-09-03", 0, { pausedFrom: "2026-09-02" });
    const flake = () =>
      screen.getByRole("article").querySelector("[data-snow] .snowflake");
    const before = flake();

    await user.click(screen.getByRole("heading", { name: "Read" }));

    expect(flake()).not.toBeNull();
    expect(flake()).not.toBe(before);
  });
});
