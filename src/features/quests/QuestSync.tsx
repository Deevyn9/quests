"use client";

import { useEffect } from "react";
import type { AppState } from "@/lib/domain/transitions";
import { setActiveSync } from "./activeSync";
import { serverApi } from "./api";
import { localData } from "./localData";
import { useQuestStore } from "./store";
import { createSync } from "./sync";

// Renders nothing. It runs once on the client and:
//  1. keeps a copy of the quests on this device, so the app works without a connection
//  2. puts a save queue between the store and the server, so changes made offline wait
//     and are sent when the connection returns
//  3. chooses what to show first: the device's copy if it has unsent changes (or we're
//     offline), otherwise what the server just sent
export function QuestSync({ userId, initialState }: { userId: string; initialState: AppState }) {
  useEffect(() => {
    const store = useQuestStore;
    const local = localData.load(userId);
    const hasUnsent = local.outbox.length > 0;
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;

    const sync = createSync({
      server: serverApi,
      initialOutbox: local.outbox,
      saveOutbox: (ops) => localData.saveOutbox(userId, ops),
      isOnline: () => navigator.onLine !== false,
      onResync: (conflict) => store.getState().resync(conflict),
    });
    setActiveSync(sync);
    store.getState().connect(sync.api);

    // Keep the device's copy up to date after every change.
    const stopSaving = store.subscribe((s, prev) => {
      if (s.quests === prev.quests && s.restores === prev.restores && s.trophies === prev.trophies) return;
      localData.saveState(userId, { quests: s.quests, restores: s.restores, trophies: s.trophies });
    });

    const useDeviceCopy = (hasUnsent || offline) && local.state !== null;
    store.getState().hydrate(useDeviceCopy ? local.state! : initialState);

    // Changes from an earlier visit are sent now, then the screen is refreshed from the server.
    if (hasUnsent) void sync.flush({ resync: true });

    const onNetwork = () => sync.refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") sync.refresh();
    };
    window.addEventListener("online", onNetwork);
    window.addEventListener("offline", onNetwork);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("online", onNetwork);
      window.removeEventListener("offline", onNetwork);
      document.removeEventListener("visibilitychange", onVisible);
      stopSaving();
      sync.dispose();
      setActiveSync(null);
    };
  }, [userId, initialState]);

  return null;
}
