// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuestStore } from "@/features/quests/store";
import { makeQuest } from "@/lib/domain/fixtures";
import { EditQuestModal } from "./EditQuestModal";

const initialState = useQuestStore.getState();

function show(today: string, over: Parameters<typeof makeQuest>[0] = {}) {
  // The store's actions read the real clock, so pin it to the day under test.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${today}T12:00:00Z`));
  const quest = makeQuest({ checkIns: ["2026-09-01", "2026-09-02"], ...over });
  useQuestStore.setState({ ...initialState, ready: true, quests: [quest], today: () => today }, true);
  const onClose = vi.fn();
  render(<EditQuestModal quest={quest} open onClose={onClose} />);
  return { quest, onClose };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EditQuestModal", () => {
  it("starts with the quest's own values", () => {
    show("2026-09-02", { title: "Read", durationDays: 7, skipWeekdays: [0] });
    expect(screen.getByLabelText("Quest name")).toHaveValue("Read");
    expect(screen.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Sunday" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "false");
  });

  it("opens on Custom, with the days filled in, for an odd length", () => {
    show("2026-09-02", { durationDays: 21 });
    expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Number of days")).toHaveValue("21");
  });

  it("closes without saving when nothing changed", async () => {
    const { onClose, quest } = show("2026-09-02");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onClose).toHaveBeenCalled();
    expect(useQuestStore.getState().quests[0]).toBe(quest);
    expect(useQuestStore.getState().toast).toBeNull();
  });

  it("saves a new name and closes", async () => {
    const { onClose } = show("2026-09-02");
    const name = screen.getByLabelText("Quest name");
    await userEvent.clear(name);
    await userEvent.type(name, "Read more");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(useQuestStore.getState().quests[0].title).toBe("Read more");
    expect(onClose).toHaveBeenCalled();
  });

  it("changes the length and the skipped days together", async () => {
    show("2026-09-02");
    await userEvent.click(screen.getByRole("button", { name: "Month" }));
    await userEvent.click(screen.getByRole("button", { name: "Saturday" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(useQuestStore.getState().quests[0]).toMatchObject({
      durationDays: 30,
      skipWeekdays: [6],
    });
  });

  it("shows the reason and stays open when the change isn't allowed", async () => {
    const { onClose } = show("2026-09-05", {
      durationDays: 10,
      checkIns: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"],
    });
    await userEvent.click(screen.getByRole("button", { name: "Custom" }));
    const days = screen.getByLabelText("Number of days");
    await userEvent.clear(days);
    await userEvent.type(days, "3");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/already 5 days in/i);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("only offers lengths that aren't already used up", () => {
    show("2026-09-05", {
      durationDays: 30,
      checkIns: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"],
    });
    expect(screen.getByRole("button", { name: "Day" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Week" })).toBeEnabled();
  });

  it("only lets the name change on a completed quest", async () => {
    show("2026-09-02", { durationDays: 2 });
    expect(screen.getByText(/only its name can change/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Monday" })).toBeDisabled();
    expect(screen.getByLabelText("Quest name")).toBeEnabled();
  });

  it("closes on Escape and on Cancel", async () => {
    const { onClose } = show("2026-09-02");
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
