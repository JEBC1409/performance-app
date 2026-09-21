CREATE TABLE "app_config" (
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_config_user_id_key_pk" PRIMARY KEY("user_id","key")
);--> statement-breakpoint
CREATE TABLE "exercise_photos" (
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"data_url" text NOT NULL,
	"caption" text,
	CONSTRAINT "exercise_photos_user_id_name_pk" PRIMARY KEY("user_id","name")
);--> statement-breakpoint
ALTER TABLE "app_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "exercise_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_config" ADD CONSTRAINT "app_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_photos" ADD CONSTRAINT "exercise_photos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "app_config" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "app_config"."user_id") WITH CHECK (auth.uid() = "app_config"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "exercise_photos" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "exercise_photos"."user_id") WITH CHECK (auth.uid() = "exercise_photos"."user_id");
