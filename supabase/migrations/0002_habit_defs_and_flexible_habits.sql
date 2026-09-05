ALTER TABLE "habit_days" ADD COLUMN "done" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
UPDATE "habit_days" SET "done" = array_remove(ARRAY[
	CASE WHEN "sleep" THEN 'sleep' END,
	CASE WHEN "water" THEN 'water' END,
	CASE WHEN "meals" THEN 'meals' END,
	CASE WHEN "nophone" THEN 'nophone' END
], NULL);--> statement-breakpoint
ALTER TABLE "habit_days" DROP COLUMN "sleep";--> statement-breakpoint
ALTER TABLE "habit_days" DROP COLUMN "water";--> statement-breakpoint
ALTER TABLE "habit_days" DROP COLUMN "meals";--> statement-breakpoint
ALTER TABLE "habit_days" DROP COLUMN "nophone";--> statement-breakpoint
CREATE TABLE "habit_defs" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "habit_defs_user_id_key_pk" PRIMARY KEY("user_id","key")
);--> statement-breakpoint
ALTER TABLE "habit_defs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_defs" ADD CONSTRAINT "habit_defs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "habit_defs" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "habit_defs"."user_id") WITH CHECK (auth.uid() = "habit_defs"."user_id");--> statement-breakpoint
-- Seed the four original habits into habit_defs for every user who already
-- has habit_days rows, so existing accounts keep their labels/order instead
-- of landing on an empty habit list (mirrors the local Dexie v3 upgrade's
-- own seeding of the same four habits).
INSERT INTO "habit_defs" ("user_id", "key", "label", "icon", "sort_order")
SELECT DISTINCT "user_id", 'sleep', 'Dormir 7h+', 'circle', 0 FROM "habit_days"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "habit_defs" ("user_id", "key", "label", "icon", "sort_order")
SELECT DISTINCT "user_id", 'water', 'Agua 2L+', 'bars', 1 FROM "habit_days"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "habit_defs" ("user_id", "key", "label", "icon", "sort_order")
SELECT DISTINCT "user_id", 'meals', 'Comidas OK', 'square', 2 FROM "habit_days"
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "habit_defs" ("user_id", "key", "label", "icon", "sort_order")
SELECT DISTINCT "user_id", 'nophone', 'Sin cel 21:30', 'diamond', 3 FROM "habit_days"
ON CONFLICT DO NOTHING;
