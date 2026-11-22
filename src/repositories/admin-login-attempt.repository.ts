import type { Db } from "../db/client.js";

/** Filled by the admin-core track. */
export class AdminLoginAttemptRepository {
  constructor(protected readonly db: Db) {}
}
