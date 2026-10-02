CREATE TABLE "trophies" (
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"earned_on" date NOT NULL,
	CONSTRAINT "trophies_user_id_key_pk" PRIMARY KEY("user_id","key")
);
--> statement-breakpoint
ALTER TABLE "trophies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "trophies" ADD CONSTRAINT "trophies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;