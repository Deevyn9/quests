ALTER TABLE "quests" ADD COLUMN "paused_from" date;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "paused_dates" date[] DEFAULT '{}' NOT NULL;