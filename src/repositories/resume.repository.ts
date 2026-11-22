import type { Db } from "../db/client.js";

/** Filled by the tailored-resumes track. */
export class ResumeRepository {
  constructor(protected readonly db: Db) {}
}
