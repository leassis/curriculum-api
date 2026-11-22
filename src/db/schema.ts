import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const curriculum = pgSchema("curriculum_api");

export const profile = curriculum.table(
  "profile",
  {
    id: integer().primaryKey().default(1),
    fullName: text().notNull(),
    headline: text().notNull(),
    masterCv: text().notNull(),
    publicSystemPrompt: text().notNull(),
    recruiterSystemPrompt: text().notNull(),
    tailorSystemPrompt: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check("profile_singleton", sql`${t.id} = 1`)],
);

export const settings = curriculum.table("settings", {
  key: text().primaryKey(),
  value: text().notNull(),
});

export const personalInfo = curriculum.table(
  "personal_info",
  {
    key: text().primaryKey(),
    label: text().notNull(),
    sortOrder: integer().notNull().default(0),
    valueEncrypted: text().notNull(),
    visibility: text().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("personal_info_visibility", sql`${t.visibility} in ('public', 'recruiter', 'print')`),
  ],
);

export const tailoredResumes = curriculum.table("tailored_resumes", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  title: text().notNull(),
  company: text(),
  jobDescription: text().notNull(),
  content: text().notNull().default(""),
  headerFields: text().array(),
  model: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const recruiterChats = curriculum.table(
  "recruiter_chats",
  {
    id: uuid().primaryKey().default(sql`gen_random_uuid()`),
    token: text().notNull().unique(),
    recruiterName: text().notNull(),
    company: text(),
    jobDescriptionShort: text(),
    tailoredResumeId: uuid().references(() => tailoredResumes.id, { onDelete: "set null" }),
    maxQuestions: integer().notNull().default(10),
    used: integer().notNull().default(0),
    status: text().notNull().default("active"),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }),
  },
  (t) => [check("recruiter_chats_status", sql`${t.status} in ('active', 'revoked')`)],
);

export const recruiterChatMessages = curriculum.table(
  "recruiter_chat_messages",
  {
    id: uuid().primaryKey().default(sql`gen_random_uuid()`),
    chatId: uuid()
      .notNull()
      .references(() => recruiterChats.id, { onDelete: "cascade" }),
    seq: bigint({ mode: "number" }).generatedAlwaysAsIdentity().notNull(),
    role: text().notNull(),
    content: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("recruiter_chat_messages_role", sql`${t.role} in ('user', 'assistant')`),
    index("recruiter_chat_messages_chat_seq").on(t.chatId, t.seq),
  ],
);

export const publicUsage = curriculum.table(
  "public_usage",
  {
    ipHash: text().notNull(),
    day: date().notNull(),
    used: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.ipHash, t.day] })],
);

export const adminLoginAttempts = curriculum.table(
  "admin_login_attempts",
  {
    ipHash: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    count: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.ipHash, t.windowStart] })],
);
