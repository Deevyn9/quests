import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const questKind = pgEnum("quest_kind", ["fixed", "infinite"]);
export const dayKind = pgEnum("quest_day_kind", ["checked", "restored", "skipped"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(), // the Google account id
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  restores: integer("restores").notNull().default(0),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}).enableRLS();

export const quests = pgTable(
  "quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: questKind("kind").notNull(),
    durationDays: integer("duration_days"), // null when infinite
    startDate: date("start_date", { mode: "string" }).notNull(),
    skipWeekdays: integer("skip_weekdays").array().notNull().default([]),
    lastActivityAt: timestamp("last_activity_at").notNull().defaultNow(), // drives list order
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("quests_user_idx").on(t.userId)],
).enableRLS();

// One row per day that has something recorded on it.
export const questDays = pgTable(
  "quest_days",
  {
    questId: uuid("quest_id")
      .notNull()
      .references(() => quests.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    kind: dayKind("kind").notNull(),
  },
  (t) => [primaryKey({ columns: [t.questId, t.date] })],
).enableRLS();