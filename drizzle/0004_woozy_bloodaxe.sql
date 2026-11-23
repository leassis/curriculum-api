UPDATE "curriculum_api"."tailored_resumes" SET "model" = NULL;--> statement-breakpoint
ALTER TABLE "curriculum_api"."tailored_resumes" DROP COLUMN "content";
