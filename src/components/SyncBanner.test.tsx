// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { setActiveSync } from "@/features/quests/activeSync";
import { createSync } from "@/features/quests/sync";
import type { QuestApi } from "@/features/quests/store";
import { SyncBanner } from "./SyncBanner";

const server = (over: Partial<QuestApi> = {}): QuestApi => ({
  addQuest: vi.fn().mockResolvedValue(undefined),
  checkIn: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockResolvedValue(undefined),
  restart: vi.fn().mockResolvedValue(undefined),
  hold: vi.fn().mockResolvedValue(undefined),
  resume: vi.fn().mockResolvedValue(undefined),
  edit: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue({ quests: [], restores: 0, trophies: {} }),
  ...over,
});

function start(online: boolean) {
  const net = { online };
  const sync = createSync({
    server: server(),
    saveOutbox: () => {},
    isOnline: () => net.online,
    onResync: () => {},
  });
  setActiveSync(sync);
  return { sync, net };
}

afterEach(() => {
  cleanup();
  setActiveSync(null);
});

describe("SyncBanner", () => {
  it("shows nothing when everything is saved and we're online", () => {
    start(true);
    render(<SyncBanner />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("explains that changes are kept on the device while offline", () => {
    start(false);
    render(<SyncBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/offline/i);
  });

  it("counts the changes waiting to sync, then goes quiet when they're sent", async () => {
    const { sync, net } = start(false);
    render(<SyncBanner />);

    await act(async () => {
      await sync.api.checkIn("a", "2026-10-11");
      await sync.api.hold("b", "2026-10-11");
    });
    expect(screen.getByRole("status")).toHaveTextContent("2 changes saved on this device");

    net.online = true;
    await act(async () => {
      sync.refresh();
    });
    await vi.waitFor(() => expect(screen.queryByRole("status")).toBeNull());
  });
});
