CREATE TABLE "habit_days" (
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"sleep" boolean DEFAULT false NOT NULL,
	"water" boolean DEFAULT false NOT NULL,
	"meals" boolean DEFAULT false NOT NULL,
	"nophone" boolean DEFAULT false NOT NULL,
	CONSTRAINT "habit_days_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
ALTER TABLE "habit_days" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "moure_weeks" (
	"user_id" uuid NOT NULL,
	"week" integer NOT NULL,
	"date" date NOT NULL,
	"topic" text DEFAULT '' NOT NULL,
	"hours" real,
	"project" text DEFAULT '' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	CONSTRAINT "moure_weeks_user_id_week_pk" PRIMARY KEY("user_id","week")
);
--> statement-breakpoint
ALTER TABLE "moure_weeks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_verses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"abbrev" text NOT NULL,
	"book_name" text NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"text" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_verses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"day" text NOT NULL,
	"exercise" text NOT NULL,
	"set_index" integer NOT NULL,
	"weight" real,
	"reps" integer,
	"to_failure" boolean,
	"rpe" real,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"unit" text DEFAULT 'kg' NOT NULL,
	"weekly_goal_kg" real DEFAULT 0.5 NOT NULL,
	"default_rest_sec" integer DEFAULT 120 NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"no_phone_time" text DEFAULT '21:30' NOT NULL,
	"sleep_time" text DEFAULT '22:00' NOT NULL,
	"seeded" boolean DEFAULT false NOT NULL,
	"display_name" text DEFAULT '' NOT NULL,
	"avatar_data_url" text
);
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sleep" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"hours" real,
	"bed_time" text DEFAULT '' NOT NULL,
	"wake_time" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sleep" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"weight_kg" real,
	"pecho_cm" real,
	"brazo_cm" real,
	"note" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weights" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "habit_days" ADD CONSTRAINT "habit_days_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moure_weeks" ADD CONSTRAINT "moure_weeks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_verses" ADD CONSTRAINT "saved_verses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep" ADD CONSTRAINT "sleep_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weights" ADD CONSTRAINT "weights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "habit_days" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "habit_days"."user_id") WITH CHECK (auth.uid() = "habit_days"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "moure_weeks" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "moure_weeks"."user_id") WITH CHECK (auth.uid() = "moure_weeks"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "saved_verses" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "saved_verses"."user_id") WITH CHECK (auth.uid() = "saved_verses"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "sets" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "sets"."user_id") WITH CHECK (auth.uid() = "sets"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "settings"."user_id") WITH CHECK (auth.uid() = "settings"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "sleep" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "sleep"."user_id") WITH CHECK (auth.uid() = "sleep"."user_id");--> statement-breakpoint
CREATE POLICY "owner_full_access" ON "weights" AS PERMISSIVE FOR ALL TO "authenticated" USING (auth.uid() = "weights"."user_id") WITH CHECK (auth.uid() = "weights"."user_id");