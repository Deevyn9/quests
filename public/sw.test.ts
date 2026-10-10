import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Runs public/sw.js in a sandbox with a fake cache and fake fetch.
function load(fetchImpl: (r: unknown) => Promise<unknown>) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const store = new Map<string, unknown>();
  const cache = {
    add: vi.fn(async (url: string) => void store.set(url, { offline: true })),
    put: vi.fn(async (req: { url: string }, res: unknown) => void store.set(new URL(req.url).pathname, res)),
  };
  const caches = {
    open: async () => cache,
    keys: async () => ["old-cache", "quests-static-v1"],
    delete: vi.fn(async () => true),
    match: async (req: string | { url: string }) =>
      store.get(typeof req === "string" ? req : new URL(req.url).pathname),
  };
  const self = {
    location: { origin: "https://quests.test" },
    addEventListener: (t: string, h: (e: unknown) => void) => void (handlers[t] = h),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  vm.runInNewContext(readFileSync(join(process.cwd(), "public/sw.js"), "utf8"), {
    self, caches, fetch: fetchImpl, URL, Response: { error: () => "error-response" },
  });
  return { handlers, store, cache, caches };
}

function fetchEvent(url: string, init: { method?: string; mode?: string } = {}) {
  let responded: Promise<unknown> | undefined;
  return {
    event: {
      request: { url, method: init.method ?? "GET", mode: init.mode ?? "no-cors" },
      respondWith: (p: Promise<unknown>) => void (responded = p),
    },
    result: () => responded,
  };
}

const okResponse = () => ({ status: 200, clone: () => ({ status: 200 }) });

describe("service worker", () => {
  it("precaches only the offline page on install", async () => {
    const sw = load(async () => okResponse());
    let waited: Promise<unknown> = Promise.resolve();
    sw.handlers.install({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect(sw.cache.add).toHaveBeenCalledWith("/offline.html");
  });

  it("serves the offline page when a navigation fails", async () => {
    const sw = load(async () => { throw new Error("offline"); });
    sw.store.set("/offline.html", { offline: true });
    const f = fetchEvent("https://quests.test/", { mode: "navigate" });
    sw.handlers.fetch(f.event);
    expect(await f.result()).toEqual({ offline: true });
  });

  it("passes navigations through to the network when online, without caching them", async () => {
    const page = okResponse();
    const sw = load(async () => page);
    const f = fetchEvent("https://quests.test/", { mode: "navigate" });
    sw.handlers.fetch(f.event);
    expect(await f.result()).toBe(page);
    expect(sw.cache.put).not.toHaveBeenCalled();
  });

  it("caches static assets after the first fetch and then serves them from cache", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    const sw = load(fetchMock);
    const first = fetchEvent("https://quests.test/_next/static/app.js");
    sw.handlers.fetch(first.event);
    await first.result();
    await Promise.resolve();
    expect(sw.cache.put).toHaveBeenCalledOnce();

    const second = fetchEvent("https://quests.test/_next/static/app.js");
    sw.handlers.fetch(second.event);
    await second.result();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("ignores writes, other origins, the API and anything else", () => {
    const sw = load(async () => okResponse());
    for (const f of [
      fetchEvent("https://quests.test/_next/static/a.js", { method: "POST" }),
      fetchEvent("https://other.test/_next/static/a.js"),
      fetchEvent("https://quests.test/api/auth/session"),
      fetchEvent("https://quests.test/some-data.json"),
    ]) {
      sw.handlers.fetch(f.event);
      expect(f.result()).toBeUndefined();
    }
  });

  it("removes old caches on activate", async () => {
    const sw = load(async () => okResponse());
    let waited: Promise<unknown> = Promise.resolve();
    sw.handlers.activate({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect(sw.caches.delete).toHaveBeenCalledWith("old-cache");
    expect(sw.caches.delete).toHaveBeenCalledTimes(1);
  });
});