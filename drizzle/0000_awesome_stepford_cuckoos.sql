CREATE TYPE "public"."quest_day_kind" AS ENUM('checked', 'restored', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."quest_kind" AS ENUM('fixed', 'infinite');--> statement-breakpoint
CREATE TABLE "quest_days" (
	"quest_id" uuid NOT NULL,
	"date" date NOT NULL,
	"kind" "quest_day_kind" NOT NULL,
	CONSTRAINT "quest_days_quest_id_date_pk" PRIMARY KEY("quest_id","date")
);
--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"kind" "quest_kind" NOT NULL,
	"duration_days" integer,
	"start_date" date NOT NULL,
	"skip_weekdays" integer[] DEFAULT '{}' NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"restores" integer DEFAULT 0 NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "quest_days" ADD CONSTRAINT "quest_days_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quests_user_idx" ON "quests" USING btree ("user_id");