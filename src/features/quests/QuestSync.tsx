"use client";

import { useEffect, useRef } from "react";
import type { AppState } from "@/lib/domain/transitions";
import { serverApi } from "./api";
import { useQuestStore } from "./store";

// Renders nothing. It runs once on the client: connects the store to the server
// and fills it with the user's saved quests.
export function QuestSync({ initialState }: { initialState: AppState }) {
  const hydrate = useQuestStore((s) => s.hydrate);
  const connect = useQuestStore((s) => s.connect);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    connect(serverApi);
    hydrate(initialState);
  }, [connect, hydrate, initialState]);

  return null;
}
