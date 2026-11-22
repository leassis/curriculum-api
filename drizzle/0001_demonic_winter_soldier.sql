CREATE TABLE "curriculum_api"."recruiter_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"seq" bigint GENERATED ALWAYS AS IDENTITY (sequence name "curriculum_api"."recruiter_chat_messages_seq_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recruiter_chat_messages_role" CHECK ("curriculum_api"."recruiter_chat_messages"."role" in ('user', 'assistant'))
);
--> statement-breakpoint
ALTER TABLE "curriculum_api"."recruiter_chat_messages" ADD CONSTRAINT "recruiter_chat_messages_chat_id_recruiter_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "curriculum_api"."recruiter_chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recruiter_chat_messages_chat_seq" ON "curriculum_api"."recruiter_chat_messages" USING btree ("chat_id","seq");