import * as actions from "./actions";
import { NotSignedInError, RejectedError } from "./errors";
import type { QuestApi } from "./store";

function unwrap(result: { ok: true } | { ok: false; error: string }) {
  if (result.ok) return;
  if (result.error === "Not signed in") throw new NotSignedInError();
  throw new RejectedError(result.error);
}

export const serverApi: QuestApi = {
  addQuest: async (input, id, today) => unwrap(await actions.addQuestAction(input, id, today)),
  checkIn: async (id, today) => unwrap(await actions.checkInAction(id, today)),
  restore: async (id, today) => unwrap(await actions.restoreAction(id, today)),
  restart: async (id, today) => unwrap(await actions.restartAction(id, today)),
  hold: async (id, today) => unwrap(await actions.holdAction(id, today)),
  resume: async (id, today) => unwrap(await actions.resumeAction(id, today)),
  edit: async (id, patch, today) => unwrap(await actions.editAction(id, patch, today)),
  remove: async (id) => unwrap(await actions.deleteAction(id)),
  load: () => actions.loadAction(),
};
