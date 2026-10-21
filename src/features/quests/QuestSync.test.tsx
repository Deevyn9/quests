// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { todayIn } from "@/lib/domain/dates";
import { makeQuest } from "@/lib/domain/fixtures";
import type { AppState } from "@/lib/domain/transitions";

const server = vi.hoisted(() => ({
  addQuest: vi.fn().mockResolvedValue(undefined),
  checkIn: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockResolvedValue(undefined),
  restart: vi.fn().mockResolvedValue(undefined),
  hold: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  edit: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  load: vi.fn(),
}));
vi.mock("./api", () => ({ serverApi: server }));

import { localData } from "./localData";
import { QuestSync } from "./QuestSync";
import { useQuestStore } from "./store";

// The store uses the real clock, so the quest must start today to be checkable.
const TODAY = todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

const fromServer: AppState = { quests: [makeQuest({ id: "s", title: "Server copy", startDate: TODAY })], restores: 1, trophies: {} };
const onDevice: AppState = { quests: [makeQuest({ id: "d", title: "Device copy" })], restores: 4, trophies: {} };
const initial = useQuestStore.getState();

function setOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", { value: online, configurable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  setOnline(true);
  useQuestStore.setState({ ...initial, ready: false }, true);
  Object.values(server).forEach((f) => f.mockClear());
  server.load.mockResolvedValue(fromServer);
});
afterEach(cleanup);

describe("QuestSync", () => {
  it("shows what the server sent when nothing is waiting to be saved", () => {
    render(<QuestSync userId="u1" initialState={fromServer} />);
    expect(useQuestStore.getState().quests[0].title).toBe("Server copy");
    expect(useQuestStore.getState().ready).toBe(true);
  });

  it("keeps a copy of every change on the device", () => {
    render(<QuestSync userId="u1" initialState={fromServer} />);
    setOnline(false);
    useQuestStore.getState().checkInQuest("s");
    const saved = localData.load("u1");
    expect(saved.state?.quests[0].checkIns).toHaveLength(1);
    expect(saved.outbox).toHaveLength(1);
  });

  it("opens from the device's copy when offline", () => {
    localData.saveState("u1", onDevice);
    setOnline(false);
    render(<QuestSync userId="u1" initialState={fromServer} />);
    expect(useQuestStore.getState().quests[0].title).toBe("Device copy");
  });

  it("opens offline from the page's own data when the device has no copy yet", () => {
    setOnline(false);
    render(<QuestSync userId="u1" initialState={fromServer} />);
    expect(useQuestStore.getState().quests[0].title).toBe("Server copy");
  });

  it("prefers the device's copy when it has unsent changes, then sends them and refreshes", async () => {
    localData.saveState("u1", onDevice);
    localData.saveOutbox("u1", [{ type: "hold", id: "d", today: "2026-10-11" }]);

    render(<QuestSync userId="u1" initialState={fromServer} />);
    expect(useQuestStore.getState().quests[0].title).toBe("Device copy");

    await vi.waitFor(() => expect(server.hold).toHaveBeenCalledWith("d", "2026-10-11"));
    await vi.waitFor(() => expect(useQuestStore.getState().quests[0].title).toBe("Server copy"));
    expect(localData.load("u1").outbox).toEqual([]);
  });

  it("sends the queued changes when the connection comes back", async () => {
    render(<QuestSync userId="u1" initialState={fromServer} />);
    setOnline(false);
    window.dispatchEvent(new Event("offline"));
    useQuestStore.getState().checkInQuest("s");
    expect(server.checkIn).not.toHaveBeenCalled();

    setOnline(true);
    window.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(server.checkIn).toHaveBeenCalledTimes(1));
  });

  it("never mixes up two users on one device", () => {
    localData.saveState("u1", onDevice);
    setOnline(false);
    render(<QuestSync userId="u2" initialState={fromServer} />);
    expect(useQuestStore.getState().quests[0].title).toBe("Server copy");
  });
});
