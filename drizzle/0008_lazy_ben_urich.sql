ALTER TABLE "curriculum_api"."profile" ADD COLUMN "additional_information" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."profile" ADD COLUMN "looking_forward_next" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "job_link" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "recruiter_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" ADD COLUMN "notes" text DEFAULT '' NOT NULL;