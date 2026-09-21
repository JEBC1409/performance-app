CREATE TABLE "focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"task" text NOT NULL,
	"minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "focus_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "focus_sessions" ADD CONSTRAINT "focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "focus_sessions" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "focus_sessions"."user_id") WITH CHECK (auth.uid() = "focus_sessions"."user_id");
