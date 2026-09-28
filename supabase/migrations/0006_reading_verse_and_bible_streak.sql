ALTER TABLE "settings" ADD COLUMN "reading_verse" integer;--> statement-breakpoint
CREATE TABLE "bible_read_days" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "bible_read_days_user_id_date_pk" PRIMARY KEY("user_id","date")
);--> statement-breakpoint
ALTER TABLE "bible_read_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bible_read_days" ADD CONSTRAINT "bible_read_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "bible_read_days" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "bible_read_days"."user_id") WITH CHECK (auth.uid() = "bible_read_days"."user_id");
