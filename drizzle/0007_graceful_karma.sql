ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "score_rationale" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "missing_skills" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "omissions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD CONSTRAINT "tailored_resumes_score" CHECK ("curriculum_api"."tailored_resumes"."score" between 0 and 100);