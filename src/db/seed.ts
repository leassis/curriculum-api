import {
  DEFAULT_PUBLIC_SYSTEM_PROMPT,
  DEFAULT_RECRUITER_SYSTEM_PROMPT,
  DEFAULT_TAILOR_SYSTEM_PROMPT,
} from "../llm/default-prompts.js";
import { closeDb, createDb } from "./client.js";
import { profile } from "./schema.js";

/** Creates the profile row with empty CV fields and the default prompts; leaves an existing row alone. */
export async function seed(databaseUrl: string): Promise<"created" | "exists"> {
  const db = createDb(databaseUrl);
  try {
    const inserted = await db
      .insert(profile)
      .values({
        id: 1,
        fullName: "",
        headline: "",
        masterCv: "",
        publicSystemPrompt: DEFAULT_PUBLIC_SYSTEM_PROMPT,
        recruiterSystemPrompt: DEFAULT_RECRUITER_SYSTEM_PROMPT,
        tailorSystemPrompt: DEFAULT_TAILOR_SYSTEM_PROMPT,
      })
      .onConflictDoNothing({ target: profile.id })
      .returning({ id: profile.id });
    return inserted.length > 0 ? "created" : "exists";
  } finally {
    await closeDb(db);
  }
}
