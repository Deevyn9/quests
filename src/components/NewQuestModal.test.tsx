// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuestStore } from "@/features/quests/store";
import { NewQuestModal } from "./NewQuestModal";

const initialState = useQuestStore.getState();

function open() {
  // The store's actions read the real clock, so pin it.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
  useQuestStore.setState({ ...initialState, ready: true, today: () => "2026-11-07" }, true);
  const onClose = vi.fn();
  render(<NewQuestModal open onClose={onClose} />);
  return { onClose };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NewQuestModal start date", () => {
  it("starts today by default", async () => {
    const { onClose } = open();
    await userEvent.type(screen.getByLabelText("Quest name"), "Read");
    await userEvent.click(screen.getByRole("button", { name: "Create quest" }));

    expect(useQuestStore.getState().quests[0].startDate).toBe("2026-11-07");
    expect(onClose).toHaveBeenCalled();
  });

  it("starts tomorrow when switched off", async () => {
    open();
    await userEvent.type(screen.getByLabelText("Quest name"), "Read");
    await userEvent.click(screen.getByRole("switch", { name: "Start immediately" }));
    await userEvent.click(screen.getByRole("button", { name: "Create quest" }));

    expect(useQuestStore.getState().quests[0].startDate).toBe("2026-11-08");
  });

  it("starts on a day picked from the calendar", async () => {
    open();
    await userEvent.type(screen.getByLabelText("Quest name"), "Read");
    await userEvent.click(screen.getByRole("switch", { name: "Start immediately" }));
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    await userEvent.click(screen.getByRole("button", { name: "Fri 20 Nov 2026" }));
    await userEvent.click(screen.getByRole("button", { name: "Create quest" }));

    expect(useQuestStore.getState().quests[0].startDate).toBe("2026-11-20");
  });

  it("asks for a date instead of creating when the calendar is open but empty", async () => {
    const { onClose } = open();
    await userEvent.type(screen.getByLabelText("Quest name"), "Read");
    await userEvent.click(screen.getByRole("switch", { name: "Start immediately" }));
    await userEvent.click(screen.getByRole("button", { name: /pick a date/i }));
    await userEvent.click(screen.getByRole("button", { name: "Create quest" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/pick a start date/i);
    expect(useQuestStore.getState().quests).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
  });
});
