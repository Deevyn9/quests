import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

// Runs public/sw.js in a sandbox with fake caches and a fake network.
type Res = { status: number; ok: boolean; type: string; redirected: boolean; tag: string; clone: () => Res };
const res = (tag: string, over: Partial<Res> = {}): Res => {
  const r: Res = { status: 200, ok: true, type: "basic", redirected: false, tag, clone: () => r, ...over };
  return r;
};

function load(fetchImpl: (r: unknown) => Promise<unknown>) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const stores = new Map<string, Map<string, unknown>>();
  const bucket = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };
  const keyOf = (req: string | { url: string }) =>
    typeof req === "string" ? req : new URL(req.url).pathname;
  const caches = {
    open: async (name: string) => ({
      add: async (url: string) => void bucket(name).set(url, res("offline-page")),
      put: async (req: string | { url: string }, r: unknown) => void bucket(name).set(keyOf(req), r),
      match: async (req: string | { url: string }) => bucket(name).get(keyOf(req)),
    }),
    keys: async () => ["old-cache", "quests-static-v1", "quests-pages-v1"],
    delete: vi.fn(async (name: string) => stores.delete(name)),
  };
  const self = {
    location: { origin: "https://quests.test" },
    addEventListener: (t: string, h: (e: unknown) => void) => void (handlers[t] = h),
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
  };
  vm.runInNewContext(readFileSync(join(process.cwd(), "public/sw.js"), "utf8"), {
    self, caches, fetch: fetchImpl, URL, Response: { error: () => res("error") },
  });
  return { handlers, stores, bucket, caches };
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
const nav = (url: string) => fetchEvent(url, { mode: "navigate" });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("installing", () => {
  it("precaches only the offline page", async () => {
    const sw = load(async () => res("net"));
    let waited: Promise<unknown> = Promise.resolve();
    sw.handlers.install({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect([...sw.bucket("quests-static-v1").keys()]).toEqual(["/offline.html"]);
    expect(sw.bucket("quests-pages-v1").size).toBe(0);
  });

  it("removes unknown old caches on activate, and keeps its own two", async () => {
    const sw = load(async () => res("net"));
    let waited: Promise<unknown> = Promise.resolve();
    sw.handlers.activate({ waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect(sw.caches.delete).toHaveBeenCalledTimes(1);
    expect(sw.caches.delete).toHaveBeenCalledWith("old-cache");
  });
});

describe("opening the app", () => {
  it("goes to the network first, and keeps a copy of the home page", async () => {
    const home = res("fresh-home");
    const sw = load(async () => home);
    const f = nav("https://quests.test/");
    sw.handlers.fetch(f.event);
    expect(await f.result()).toBe(home);
    await flush();
    expect(sw.bucket("quests-pages-v1").get("/")).toBe(home);
  });

  it("opens the saved home page when offline", async () => {
    const online = load(async () => res("saved-home"));
    const f1 = nav("https://quests.test/");
    online.handlers.fetch(f1.event);
    await f1.result();
    await flush();

    const sw = load(async () => {
      throw new TypeError("Failed to fetch");
    });
    sw.stores.set("quests-pages-v1", online.stores.get("quests-pages-v1")!);
    const f2 = nav("https://quests.test/");
    sw.handlers.fetch(f2.event);
    expect(((await f2.result()) as Res).tag).toBe("saved-home");
  });

  it("shows the offline page when there's no saved home page yet", async () => {
    const sw = load(async () => {
      throw new TypeError("Failed to fetch");
    });
    sw.bucket("quests-static-v1").set("/offline.html", res("offline-page"));
    const f = nav("https://quests.test/");
    sw.handlers.fetch(f.event);
    expect(((await f.result()) as Res).tag).toBe("offline-page");
  });

  it("only offers the offline page, not the home page, for other routes", async () => {
    const sw = load(async () => {
      throw new TypeError("Failed to fetch");
    });
    sw.bucket("quests-pages-v1").set("/", res("saved-home"));
    sw.bucket("quests-static-v1").set("/offline.html", res("offline-page"));
    const f = nav("https://quests.test/anything-else");
    sw.handlers.fetch(f.event);
    expect(((await f.result()) as Res).tag).toBe("offline-page");
  });

  it("doesn't save errors, redirects or other routes as the home page", async () => {
    for (const [url, response] of [
      ["https://quests.test/", res("err", { ok: false, status: 500 })],
      ["https://quests.test/", res("redirected", { redirected: true })],
      ["https://quests.test/", res("opaque", { type: "opaqueredirect" })],
      ["https://quests.test/other", res("other")],
    ] as const) {
      const sw = load(async () => response);
      const f = nav(url);
      sw.handlers.fetch(f.event);
      await f.result();
      await flush();
      expect(sw.bucket("quests-pages-v1").size, response.tag).toBe(0);
    }
  });
});

describe("signing out", () => {
  it("deletes the saved page when the app says CLEAR_PAGES", async () => {
    const sw = load(async () => res("net"));
    sw.bucket("quests-pages-v1").set("/", res("saved-home"));
    let waited: Promise<unknown> = Promise.resolve();
    sw.handlers.message({ data: { type: "CLEAR_PAGES" }, waitUntil: (p: Promise<unknown>) => (waited = p) });
    await waited;
    expect(sw.stores.has("quests-pages-v1")).toBe(false);
  });

  it("ignores other messages", () => {
    const sw = load(async () => res("net"));
    sw.handlers.message({ data: { type: "SOMETHING" }, waitUntil: () => { throw new Error("should not wait"); } });
    expect(sw.caches.delete).not.toHaveBeenCalled();
  });
});

describe("static files", () => {
  it("fetches once, caches, then serves from the cache", async () => {
    const fetchMock = vi.fn(async () => res("script"));
    const sw = load(fetchMock);
    const first = fetchEvent("https://quests.test/_next/static/app.js");
    sw.handlers.fetch(first.event);
    await first.result();
    await flush();

    const second = fetchEvent("https://quests.test/_next/static/app.js");
    sw.handlers.fetch(second.event);
    await second.result();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache failed responses", async () => {
    const sw = load(async () => res("missing", { status: 404, ok: false }));
    const f = fetchEvent("https://quests.test/_next/static/gone.js");
    sw.handlers.fetch(f.event);
    await f.result();
    await flush();
    expect(sw.bucket("quests-static-v1").size).toBe(0);
  });
});

describe("what it never touches", () => {
  it("ignores saves (POST), other websites, the sign-in API and everything else", () => {
    const sw = load(async () => res("net"));
    for (const f of [
      fetchEvent("https://quests.test/", { method: "POST", mode: "navigate" }),
      fetchEvent("https://other.test/_next/static/a.js"),
      fetchEvent("https://quests.test/api/auth/session"),
      fetchEvent("https://quests.test/some-data.json"),
    ]) {
      sw.handlers.fetch(f.event);
      expect(f.result()).toBeUndefined();
    }
  });
});
