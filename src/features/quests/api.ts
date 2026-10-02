import * as actions from "./actions";
import type { QuestApi } from "./store";

function unwrap(result: { ok: true } | { ok: false; error: string }) {
  if (!result.ok) throw new Error(result.error);
}

export const serverApi: QuestApi = {
  addQuest: async (input, id, today) => unwrap(await actions.addQuestAction(input, id, today)),
  checkIn: async (id, today) => unwrap(await actions.checkInAction(id, today)),
  restore: async (id, today) => unwrap(await actions.restoreAction(id, today)),
  restart: async (id, today) => unwrap(await actions.restartAction(id, today)),
  remove: async (id) => unwrap(await actions.deleteAction(id)),
  load: () => actions.loadAction(),
};