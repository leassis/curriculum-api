CREATE SCHEMA IF NOT EXISTS "curriculum_api";
--> statement-breakpoint
CREATE TABLE "curriculum_api"."admin_login_attempts" (
	"ip_hash" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "admin_login_attempts_ip_hash_window_start_pk" PRIMARY KEY("ip_hash","window_start")
);
--> statement-breakpoint
CREATE TABLE "curriculum_api"."personal_info" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"value_encrypted" text NOT NULL,
	"visibility" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personal_info_visibility" CHECK ("curriculum_api"."personal_info"."visibility" in ('public', 'recruiter', 'print'))
);
--> statement-breakpoint
CREATE TABLE "curriculum_api"."profile" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"full_name" text NOT NULL,
	"headline" text NOT NULL,
	"master_cv" text NOT NULL,
	"public_system_prompt" text NOT NULL,
	"recruiter_system_prompt" text NOT NULL,
	"tailor_system_prompt" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_singleton" CHECK ("curriculum_api"."profile"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "curriculum_api"."public_usage" (
	"ip_hash" text NOT NULL,
	"day" date NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "public_usage_ip_hash_day_pk" PRIMARY KEY("ip_hash","day")
);
--> statement-breakpoint
CREATE TABLE "curriculum_api"."recruiter_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"recruiter_name" text NOT NULL,
	"company" text,
	"job_description_short" text,
	"tailored_resume_id" uuid,
	"max_questions" integer DEFAULT 10 NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	CONSTRAINT "recruiter_chats_token_unique" UNIQUE("token"),
	CONSTRAINT "recruiter_chats_status" CHECK ("curriculum_api"."recruiter_chats"."status" in ('active', 'revoked'))
);
--> statement-breakpoint
CREATE TABLE "curriculum_api"."settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curriculum_api"."tailored_resumes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"company" text,
	"job_description" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"header_fields" text[],
	"model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "curriculum_api"."recruiter_chats" ADD CONSTRAINT "recruiter_chats_tailored_resume_id_tailored_resumes_id_fk" FOREIGN KEY ("tailored_resume_id") REFERENCES "curriculum_api"."tailored_resumes"("id") ON DELETE set null ON UPDATE no action;