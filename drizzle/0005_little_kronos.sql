CREATE TABLE "curriculum_api"."career_library" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"document" jsonb DEFAULT '{"version":1,"items":[]}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_library_singleton" CHECK ("curriculum_api"."career_library"."id" = 1)
);
--> statement-breakpoint
ALTER TABLE "curriculum_api"."profile" ADD COLUMN "summary" text DEFAULT '' NOT NULL;