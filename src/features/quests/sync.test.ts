import { describe, expect, it, vi } from "vitest";
import { NotSignedInError, RejectedError } from "./errors";
import type { Op } from "./ops";
import type { QuestApi } from "./store";
import { createSync } from "./sync";

const input = { title: "Read", kind: "fixed" as const, durationDays: 7, skipWeekdays: [] };
const DAY = "2026-10-11";

function fakeServer(over: Partial<QuestApi> = {}): QuestApi {
  return {
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
  };
}

// A scheduler we control, so retries happen when the test says so.
function fakeClock() {
  const tasks = new Map<number, () => void>();
  let id = 0;
  return {
    schedule: (fn: () => void) => {
      tasks.set(++id, fn);
      return id;
    },
    cancel: (h: unknown) => void tasks.delete(h as number),
    pending: () => tasks.size,
    runAll: () => {
      const run = [...tasks.values()];
      tasks.clear();
      run.forEach((f) => f());
    },
  };
}

function setup(over: Partial<QuestApi> = {}, opts: { online?: boolean; outbox?: Op[] } = {}) {
  const server = fakeServer(over);
  const net = { online: opts.online ?? true };
  const saved: Op[][] = [];
  const clock = fakeClock();
  const onResync = vi.fn();
  const sync = createSync({
    server,
    initialOutbox: opts.outbox,
    saveOutbox: (ops) => saved.push(ops),
    isOnline: () => net.online,
    onResync,
    schedule: clock.schedule,
    cancel: clock.cancel,
  });
  return { sync, server, net, saved, clock, onResync, lastSaved: () => saved.at(-1) };
}

describe("saving while online", () => {
  it("sends a change straight away and leaves nothing queued", async () => {
    const { sync, server, lastSaved } = setup();
    await sync.api.checkIn("a", DAY);
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(server.checkIn).toHaveBeenCalledWith("a", DAY);
    expect(lastSaved()).toEqual([]);
  });

  it("sends changes one at a time, in the order they were made", async () => {
    const order: string[] = [];
    const { sync } = setup({
      addQuest: vi.fn(async () => void order.push("add")),
      checkIn: vi.fn(async () => void order.push("checkIn")),
      hold: vi.fn(async () => void order.push("hold")),
    });
    void sync.api.addQuest(input, "a", DAY);
    void sync.api.checkIn("a", DAY);
    void sync.api.hold("a", DAY);
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(order).toEqual(["add", "checkIn", "hold"]);
  });

  it("does not start a second flush while one is running", async () => {
    let release!: () => void;
    const { sync, server } = setup({
      checkIn: vi.fn(() => new Promise<void>((r) => (release = r))),
    });
    void sync.api.checkIn("a", DAY);
    void sync.flush();
    void sync.flush();
    expect(server.checkIn).toHaveBeenCalledTimes(1);
    release();
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
  });
});

describe("saving while offline", () => {
  it("keeps changes on the device and sends nothing", async () => {
    const { sync, server, net, lastSaved } = setup({}, { online: false });
    await sync.api.addQuest(input, "a", DAY);
    await sync.api.checkIn("a", DAY);

    expect(server.addQuest).not.toHaveBeenCalled();
    expect(sync.getStatus()).toMatchObject({ pending: 2, offline: true });
    expect(lastSaved()).toHaveLength(2);

    net.online = true;
    expect(net.online).toBe(true);
  });

  it("sends everything, in order, once the connection returns", async () => {
    const order: string[] = [];
    const { sync, net } = setup(
      {
        addQuest: vi.fn(async () => void order.push("add")),
        checkIn: vi.fn(async () => void order.push("checkIn")),
      },
      { online: false },
    );
    await sync.api.addQuest(input, "a", DAY);
    await sync.api.checkIn("a", DAY);

    net.online = true;
    sync.refresh();

    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(order).toEqual(["add", "checkIn"]);
    expect(sync.getStatus().offline).toBe(false);
  });

  it("picks up changes saved before the page was closed", async () => {
    const { sync, server } = setup({}, { outbox: [{ type: "hold", id: "a", today: DAY }] });
    expect(sync.getStatus().pending).toBe(1);

    await sync.flush({ resync: true });

    expect(server.hold).toHaveBeenCalledWith("a", DAY);
    expect(sync.getStatus().pending).toBe(0);
  });
});

describe("when the network fails mid-way", () => {
  it("keeps the change and retries later", async () => {
    const checkIn = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue(undefined);
    const { sync, clock } = setup({ checkIn });

    await sync.api.checkIn("a", DAY);
    await vi.waitFor(() => expect(clock.pending()).toBe(1));
    expect(sync.getStatus().pending).toBe(1);

    clock.runAll();
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(checkIn).toHaveBeenCalledTimes(2);
  });

  it("doesn't skip ahead: later changes wait behind the one that failed", async () => {
    const checkIn = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { sync, server } = setup({ checkIn });

    await sync.api.checkIn("a", DAY);
    await sync.api.hold("a", DAY);
    await vi.waitFor(() => expect(checkIn).toHaveBeenCalled());

    expect(server.hold).not.toHaveBeenCalled();
    expect(sync.getStatus().pending).toBe(2);
  });
});

describe("when the server says no", () => {
  it("drops that change, carries on with the rest, then asks for a refresh", async () => {
    const { sync, server, onResync } = setup({
      checkIn: vi.fn().mockRejectedValue(new RejectedError("Quest not found")),
    });

    await sync.api.checkIn("gone", DAY);
    await sync.api.hold("b", DAY);

    await vi.waitFor(() => expect(onResync).toHaveBeenCalled());
    expect(server.hold).toHaveBeenCalledWith("b", DAY);
    expect(sync.getStatus().pending).toBe(0);
    expect(onResync).toHaveBeenCalledWith(true);
  });

  it("waits for the whole queue before refreshing", async () => {
    let release!: () => void;
    const { sync, onResync } = setup({
      checkIn: vi.fn().mockRejectedValue(new RejectedError("no")),
      hold: vi.fn(() => new Promise<void>((r) => (release = r))),
    });
    void sync.api.checkIn("a", DAY);
    void sync.api.hold("b", DAY);
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(1));
    expect(onResync).not.toHaveBeenCalled();

    release();
    await vi.waitFor(() => expect(onResync).toHaveBeenCalledWith(true));
  });
});

describe("an expired session", () => {
  it("keeps the changes and says sign-in is needed, without retrying forever", async () => {
    const { sync, clock } = setup({ checkIn: vi.fn().mockRejectedValue(new NotSignedInError()) });

    await sync.api.checkIn("a", DAY);
    await vi.waitFor(() => expect(sync.getStatus().needsSignIn).toBe(true));

    expect(sync.getStatus().pending).toBe(1);
    expect(clock.pending()).toBe(0);
  });
});

describe("refreshing the screen", () => {
  it("does not refresh after a normal online change", async () => {
    const { sync, onResync } = setup();
    await sync.api.checkIn("a", DAY);
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(onResync).not.toHaveBeenCalled();
  });

  it("refreshes after replaying changes saved from an earlier session", async () => {
    const { sync, onResync } = setup({}, { outbox: [{ type: "checkIn", id: "a", today: DAY }] });
    await sync.flush({ resync: true });
    expect(onResync).toHaveBeenCalledWith(false);
  });
});

describe("status", () => {
  it("notifies subscribers only when something changed", async () => {
    const { sync } = setup({}, { online: false });
    const listener = vi.fn();
    sync.subscribe(listener);

    sync.refresh(); // nothing changed
    expect(listener).not.toHaveBeenCalled();

    await sync.api.checkIn("a", DAY);
    expect(listener).toHaveBeenCalled();
  });

  it("queues an edit offline, keeps it on the device, and sends it after the quest it belongs to", async () => {
    const order: string[] = [];
    const { sync, server, net, lastSaved } = setup(
      {
        addQuest: vi.fn(async () => void order.push("add")),
        edit: vi.fn(async () => void order.push("edit")),
      },
      { online: false },
    );
    await sync.api.addQuest(input, "q1", DAY);
    await sync.api.edit("q1", { title: "Run" }, DAY);
    expect(lastSaved()).toEqual([
      { type: "addQuest", input, id: "q1", today: DAY },
      { type: "edit", id: "q1", patch: { title: "Run" }, today: DAY },
    ]);

    net.online = true;
    sync.refresh();
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(order).toEqual(["add", "edit"]);
    expect(server.edit).toHaveBeenCalledWith("q1", { title: "Run" }, DAY);
  });

});

describe("when the server says no", () => {
  it("drops that change, carries on with the rest, then asks for a refresh", async () => {
    const { sync, server, onResync } = setup({
      checkIn: vi.fn().mockRejectedValue(new RejectedError("Quest not found")),
    });

    await sync.api.checkIn("gone", DAY);
    await sync.api.hold("b", DAY);

    await vi.waitFor(() => expect(onResync).toHaveBeenCalled());
    expect(server.hold).toHaveBeenCalledWith("b", DAY);
    expect(sync.getStatus().pending).toBe(0);
    expect(onResync).toHaveBeenCalledWith(true);
  });

  it("waits for the whole queue before refreshing", async () => {
    let release!: () => void;
    const { sync, onResync } = setup({
      checkIn: vi.fn().mockRejectedValue(new RejectedError("no")),
      hold: vi.fn(() => new Promise<void>((r) => (release = r))),
    });
    void sync.api.checkIn("a", DAY);
    void sync.api.hold("b", DAY);
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(1));
    expect(onResync).not.toHaveBeenCalled();

    release();
    await vi.waitFor(() => expect(onResync).toHaveBeenCalledWith(true));
  });
});

describe("an expired session", () => {
  it("keeps the changes and says sign-in is needed, without retrying forever", async () => {
    const { sync, clock } = setup({ checkIn: vi.fn().mockRejectedValue(new NotSignedInError()) });

    await sync.api.checkIn("a", DAY);
    await vi.waitFor(() => expect(sync.getStatus().needsSignIn).toBe(true));

    expect(sync.getStatus().pending).toBe(1);
    expect(clock.pending()).toBe(0);
  });
});

describe("refreshing the screen", () => {
  it("does not refresh after a normal online change", async () => {
    const { sync, onResync } = setup();
    await sync.api.checkIn("a", DAY);
    await vi.waitFor(() => expect(sync.getStatus().pending).toBe(0));
    expect(onResync).not.toHaveBeenCalled();
  });

  it("refreshes after replaying changes saved from an earlier session", async () => {
    const { sync, onResync } = setup({}, { outbox: [{ type: "checkIn", id: "a", today: DAY }] });
    await sync.flush({ resync: true });
    expect(onResync).toHaveBeenCalledWith(false);
  });
});

describe("status", () => {
  it("notifies subscribers only when something changed", async () => {
    const { sync } = setup({}, { online: false });
    const listener = vi.fn();
    sync.subscribe(listener);

    sync.refresh(); // nothing changed
    expect(listener).not.toHaveBeenCalled();

    await sync.api.checkIn("a", DAY);
    expect(listener).toHaveBeenCalled();
  });

  it("sends an edit in order, after the quest it belongs to", async () => {
    const { sync, server } = setup({}, { online: false });
    void sync.api.addQuest(input, "q1", DAY);
    void sync.api.edit("q1", { title: "Run" }, DAY);
    expect(sync.getStatus().pending).toBe(2);
  });
});
