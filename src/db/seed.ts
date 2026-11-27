import { sql } from "drizzle-orm";
import {
  DEFAULT_PUBLIC_SYSTEM_PROMPT,
  DEFAULT_RECRUITER_SYSTEM_PROMPT,
  DEFAULT_TAILOR_SYSTEM_PROMPT,
} from "../llm/default-prompts.js";
import { closeDb, createDb } from "./client.js";
import { careerLibrary, profile } from "./schema.js";

/**
 * Upserts the profile row with the default prompts and creates the empty career library.
 * An existing row gets the current default prompts (prompts edited in the admin are overwritten);
 * its name, headline and summary are left alone.
 */
export async function seed(databaseUrl: string): Promise<"created" | "updated"> {
  const db = createDb(databaseUrl);
  try {
    const inserted = await db
      .insert(profile)
      .values({
        id: 1,
        fullName: "",
        headline: "",
        summary: "",
        publicSystemPrompt: DEFAULT_PUBLIC_SYSTEM_PROMPT,
        recruiterSystemPrompt: DEFAULT_RECRUITER_SYSTEM_PROMPT,
        tailorSystemPrompt: DEFAULT_TAILOR_SYSTEM_PROMPT,
      })
      .onConflictDoUpdate({
        target: profile.id,
        set: {
          publicSystemPrompt: DEFAULT_PUBLIC_SYSTEM_PROMPT,
          recruiterSystemPrompt: DEFAULT_RECRUITER_SYSTEM_PROMPT,
          tailorSystemPrompt: DEFAULT_TAILOR_SYSTEM_PROMPT,
          updatedAt: sql`now()`,
        },
      })
      .returning({ inserted: sql<boolean>`(xmax = 0)` });
    await db
      .insert(careerLibrary)
      .values({ id: 1 })
      .onConflictDoNothing({ target: careerLibrary.id });
    return inserted[0]?.inserted ? "created" : "updated";
  } finally {
    await closeDb(db);
  }
}
