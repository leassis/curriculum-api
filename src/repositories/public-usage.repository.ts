import type { Db } from "../db/client.js";

/** Filled by the public-chat track. */
export class PublicUsageRepository {
  constructor(protected readonly db: Db) {}
}
