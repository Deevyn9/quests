// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setActiveSync } from "@/features/quests/activeSync";
import { useQuestStore, type QuestApi } from "@/features/quests/store";
import { createSync } from "@/features/quests/sync";
import { AppShell } from "./AppShell";

vi.mock("@/features/quests/useFlipReorder", () => ({ useFlipReorder: () => {} }));
const clearLocalData = vi.hoisted(() => vi.fn());
vi.mock("@/features/quests/cleanup", () => ({ clearLocalData }));

const initialState = useQuestStore.getState();

const server = (): QuestApi => ({
  addQuest: vi.fn().mockResolvedValue(undefined),
  checkIn: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockResolvedValue(undefined),
  restart: vi.fn().mockResolvedValue(undefined),
  hold: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue({ quests: [], restores: 0, trophies: {} }),
});

beforeEach(() => {
  useQuestStore.setState({ ...initialState, ready: true }, true);
  clearLocalData.mockClear();
});
afterEach(() => {
  cleanup();
  setActiveSync(null);
});

function renderApp(signOutAction = vi.fn().mockResolvedValue(undefined)) {
  render(<AppShell user={{ name: "Ada" }} signInAction={async () => {}} signOutAction={signOutAction} />);
  return signOutAction;
}

describe("signing out with unsent changes", () => {
  it("is blocked while offline, so changes aren't wiped before they're saved", async () => {
    setActiveSync(
      createSync({ server: server(), saveOutbox: () => {}, isOnline: () => false, onResync: () => {} }),
    );
    const signOut = renderApp();

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useQuestStore.getState().toast?.message).toMatch(/reconnect before signing out/i);
    expect(signOut).not.toHaveBeenCalled();
  });

  it("is blocked while changes are still being sent", async () => {
    const slow = server();
    slow.checkIn = vi.fn(() => new Promise<void>(() => {}));
    const sync = createSync({ server: slow, saveOutbox: () => {}, isOnline: () => true, onResync: () => {} });
    setActiveSync(sync);
    renderApp();
    await act(async () => {
      await sync.api.checkIn("a", "2026-10-11");
    });

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(useQuestStore.getState().toast?.message).toMatch(/still saving/i);
  });

  it("clears this device's copy, then signs out, once everything is saved", async () => {
    setActiveSync(
      createSync({ server: server(), saveOutbox: () => {}, isOnline: () => true, onResync: () => {} }),
    );
    const signOut = renderApp();

    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await userEvent.click(screen.getAllByRole("button", { name: /sign out/i }).at(-1)!);

    expect(clearLocalData).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
