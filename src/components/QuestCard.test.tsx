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

const frozen = { pausedFrom: "2026-09-02" };

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
    show("2026-09-03", 0, frozen);
    expect(screen.getByRole("article")).toHaveClass(
      "border-blue-400",
      "bg-blue-200",
    );
    expect(screen.getByText("On hold")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
  });

  it("is blue straight away when the hold starts tomorrow", () => {
    show("2026-09-01", 0, frozen);
    expect(screen.getByRole("article")).toHaveClass(
      "border-blue-400",
      "bg-blue-200",
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
    show("2026-09-03", 0, frozen);
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

    show("2026-09-03", 0, frozen);
    expect(screen.getByRole("button", { name: "Resume" })).toHaveClass(
      "bg-blue-600",
    );
    expect(
      screen.queryByRole("button", { name: "Put on hold" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the hold button the same width in both states", () => {
    show("2026-09-01", 0);
    expect(screen.getByRole("button", { name: "Put on hold" })).toHaveClass(
      "min-w-[7.25rem]",
    );
    cleanup();

    show("2026-09-03", 0, frozen);
    expect(screen.getByRole("button", { name: "Resume" })).toHaveClass(
      "min-w-[7.25rem]",
    );
  });
});

describe("QuestCard frost", () => {
  it("covers a frozen card with big snowflakes spread out across it", () => {
    show("2026-09-03", 0, frozen);
    const flakes = Array.from(
      screen
        .getByRole("article")
        .querySelectorAll<HTMLElement>("[data-snow] .snowflake"),
    );

    expect(flakes.length).toBeGreaterThanOrEqual(10);
    for (const flake of flakes) {
      expect(parseInt(flake.style.width)).toBeGreaterThanOrEqual(20);
    }
    const lefts = new Set(flakes.map((f) => f.style.left));
    expect(lefts.size).toBeGreaterThanOrEqual(8);
  });

  it("draws white cracks across a frozen card", () => {
    show("2026-09-03", 0, frozen);
    const ice = screen.getByRole("article").querySelector("[data-ice]");
    expect(ice).not.toBeNull();
    expect(ice?.querySelectorAll(".ice-crack").length).toBeGreaterThan(0);
  });

  it("fades the frost in rather than popping it in", () => {
    show("2026-09-03", 0, frozen);
    expect(
      screen.getByRole("article").querySelector("[data-frost]"),
    ).toHaveClass("frost-in");
  });

  it("has no frost on a normal card", () => {
    show("2026-09-01", 0);
    expect(
      screen.getByRole("article").querySelector("[data-frost]"),
    ).toBeNull();
  });

  it("keeps the frost behind the card's content", () => {
    show("2026-09-03", 0, frozen);
    expect(
      screen.getByRole("article").querySelector("[data-frost]"),
    ).toHaveClass("z-0");
  });

  it("makes the frost form again when a frozen card is clicked", async () => {
    const user = userEvent.setup();
    show("2026-09-03", 0, frozen);
    const flake = () =>
      screen.getByRole("article").querySelector("[data-snow] .snowflake");
    const before = flake();

    await user.click(screen.getByRole("heading", { name: "Read" }));

    expect(flake()).not.toBeNull();
    expect(flake()).not.toBe(before);
  });
});
