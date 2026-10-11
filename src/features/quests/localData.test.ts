// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalData } from "./localData";
import type { Op } from "./ops";

const state = { quests: [], restores: 2, trophies: {} };
const op: Op = { type: "checkIn", id: "a", today: "2026-10-11" };

let data = createLocalData(() => window.localStorage);
beforeEach(() => {
  window.localStorage.clear();
  data = createLocalData(() => window.localStorage);
});

describe("local data", () => {
  it("starts empty", () => {
    expect(data.load("u1")).toEqual({ state: null, outbox: [] });
  });

  it("keeps the state and the outbox together, and separate per user", () => {
    data.saveState("u1", state);
    data.saveOutbox("u1", [op]);
    expect(data.load("u1")).toEqual({ state, outbox: [op] });
    expect(data.load("u2")).toEqual({ state: null, outbox: [] });
  });

  it("starts fresh from corrupt or wrong-shaped data instead of crashing", () => {
    window.localStorage.setItem("quests:v1:u1", "{not json");
    expect(data.load("u1")).toEqual({ state: null, outbox: [] });

    window.localStorage.setItem("quests:v1:u1", JSON.stringify({ state: { quests: "nope" }, outbox: 5 }));
    expect(data.load("u1")).toEqual({ state: null, outbox: [] });
  });

  it("clearAll removes every user's quests, leaves other keys, and blocks later writes", () => {
    data.saveState("u1", state);
    data.saveState("u2", state);
    window.localStorage.setItem("something-else", "keep");

    data.clearAll();
    data.saveState("u1", state); // e.g. a late store update after sign-out

    expect(data.load("u1").state).toBeNull();
    expect(data.load("u2").state).toBeNull();
    expect(window.localStorage.getItem("something-else")).toBe("keep");
  });

  it("never throws when storage is unavailable or full", () => {
    const broken = createLocalData(() => {
      throw new Error("blocked");
    });
    expect(() => broken.saveState("u1", state)).not.toThrow();
    expect(broken.load("u1")).toEqual({ state: null, outbox: [] });

    const full = createLocalData(() => ({
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
      key: () => null,
      length: 0,
    }));
    expect(() => full.saveOutbox("u1", [op])).not.toThrow();
  });
});
