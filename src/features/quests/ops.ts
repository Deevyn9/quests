import type { NewQuestInput } from "@/lib/domain/create";
import type { DateKey } from "@/lib/domain/types";

// One change waiting to be saved. Stored as plain data so it survives a reload.
export type Op =
  | { type: "addQuest"; input: NewQuestInput; id: string; today: DateKey }
  | { type: "checkIn"; id: string; today: DateKey }
  | { type: "restore"; id: string; today: DateKey }
  | { type: "restart"; id: string; today: DateKey }
  | { type: "hold"; id: string; today: DateKey }
  | { type: "resume"; id: string; today: DateKey }
  | { type: "remove"; id: string };
