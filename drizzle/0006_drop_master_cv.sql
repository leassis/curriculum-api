ALTER TABLE "curriculum_api"."profile" DROP COLUMN "master_cv";
--> statement-breakpoint
UPDATE "curriculum_api"."tailored_resumes" SET "structured" = NULL, "model" = NULL;
