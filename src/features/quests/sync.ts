import { NotSignedInError, RejectedError } from "./errors";
import type { Op } from "./ops";
import type { QuestApi } from "./store";

export type SyncStatus = {
  pending: number; // changes waiting to be saved
  syncing: boolean;
  offline: boolean;
  needsSignIn: boolean; // the session expired; the changes are kept
};

type Options = {
  server: QuestApi;
  initialOutbox?: Op[];
  saveOutbox: (ops: Op[]) => void;
  isOnline: () => boolean;
  // Called once the queue is empty and the screen should be re-checked against the server.
  // `conflict` is true when a queued change was rejected and dropped.
  onResync: (conflict: boolean) => void | Promise<void>;
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
  retryDelays?: number[];
};

const DEFAULT_DELAYS = [2_000, 5_000, 15_000, 30_000, 60_000];

// A save queue in front of the server. Changes are written to the device first, then
// sent in order. If we're offline (or the network drops mid-way) they wait and are
// retried, so nothing is lost. The store talks to `api`, exactly as it talks to the
// plain server API, so the rest of the app doesn't know the queue exists.
export function createSync(options: Options) {
  const {
    server,
    saveOutbox,
    isOnline,
    onResync,
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    retryDelays = DEFAULT_DELAYS,
  } = options;

  const queue: Op[] = [...(options.initialOutbox ?? [])];
  const listeners = new Set<() => void>();
  let flushing = false;
  let needsSignIn = false;
  let conflicts = 0;
  let resyncWanted = false;
  let attempts = 0;
  let timer: unknown = null;

  const compute = (): SyncStatus => ({
    pending: queue.length,
    syncing: flushing,
    offline: !isOnline(),
    needsSignIn,
  });
  let status = compute();

  function emit() {
    const next = compute();
    const same =
      next.pending === status.pending &&
      next.syncing === status.syncing &&
      next.offline === status.offline &&
      next.needsSignIn === status.needsSignIn;
    if (same) return;
    status = next;
    listeners.forEach((l) => l());
  }

  const persist = () => saveOutbox([...queue]);

  function send(op: Op): Promise<void> {
    switch (op.type) {
      case "addQuest":
        return server.addQuest(op.input, op.id, op.today);
      case "checkIn":
        return server.checkIn(op.id, op.today);
      case "restore":
        return server.restore(op.id, op.today);
      case "restart":
        return server.restart(op.id, op.today);
      case "hold":
        return server.hold(op.id, op.today);
      case "resume":
        return server.resume(op.id, op.today);
      case "edit":
        return server.edit(op.id, op.patch, op.today);
      case "remove":
        return server.remove(op.id);
    }
  }

  function retryLater() {
    if (timer !== null) return;
    const delay = retryDelays[Math.min(attempts, retryDelays.length - 1)];
    attempts++;
    timer = schedule(() => {
      timer = null;
      void flush();
    }, delay);
  }

  async function flush(opts: { resync?: boolean } = {}): Promise<void> {
    if (opts.resync) resyncWanted = true;
    if (flushing) return;
    if (timer !== null) {
      cancel(timer);
      timer = null;
    }
    if (!isOnline()) {
      emit(); // we'll be called again by the "online" event
      return;
    }

    flushing = true;
    emit();
    let networkFailed = false;
    try {
      while (queue.length > 0) {
        try {
          await send(queue[0]);
          needsSignIn = false;
          queue.shift();
          persist();
          attempts = 0;
          emit();
        } catch (e) {
          if (e instanceof NotSignedInError) {
            needsSignIn = true;
            break;
          }
          if (e instanceof RejectedError) {
            queue.shift(); // the server said no: retrying can't help
            persist();
            conflicts++;
            emit();
            continue;
          }
          networkFailed = true; // offline, timeout, server down: try again later
          break;
        }
      }
    } finally {
      flushing = false;
    }

    emit();
    if (networkFailed) {
      retryLater();
      return;
    }
    if (queue.length === 0 && !needsSignIn && (conflicts > 0 || resyncWanted)) {
      const hadConflict = conflicts > 0;
      conflicts = 0;
      resyncWanted = false;
      try {
        await onResync(hadConflict);
      } catch {
        // the screen keeps what it has; the next load will refresh it
      }
    }
  }

  function enqueue(op: Op): Promise<void> {
    queue.push(op);
    persist();
    emit();
    void flush();
    return Promise.resolve();
  }

  const api: QuestApi = {
    addQuest: (input, id, today) => enqueue({ type: "addQuest", input, id, today }),
    checkIn: (id, today) => enqueue({ type: "checkIn", id, today }),
    restore: (id, today) => enqueue({ type: "restore", id, today }),
    restart: (id, today) => enqueue({ type: "restart", id, today }),
    hold: (id, today) => enqueue({ type: "hold", id, today }),
    resume: (id, today) => enqueue({ type: "resume", id, today }),
    edit: (id, patch, today) => enqueue({ type: "edit", id, patch, today }),
    remove: (id) => enqueue({ type: "remove", id }),
    load: () => server.load(),
  };

  return {
    api,
    flush,
    // The browser's online/offline events call this: update the status, and try to save.
    refresh() {
      emit();
      if (isOnline()) void flush();
    },
    getStatus: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (timer !== null) cancel(timer);
      timer = null;
      listeners.clear();
    },
  };
}

export type Sync = ReturnType<typeof createSync>;
