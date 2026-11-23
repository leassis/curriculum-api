import { eq, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { careerLibrary } from "../db/schema.js";

const EMPTY = { version: 1, items: [] };

export interface CareerRepo {
  get(): Promise<unknown>;
  update(fn: (current: unknown) => unknown | Promise<unknown>): Promise<unknown>;
}

export class CareerRepository implements CareerRepo {
  constructor(private readonly db: Db) {}

  async get(): Promise<unknown> {
    const [row] = await this.db.select().from(careerLibrary).where(eq(careerLibrary.id, 1));
    return row?.document ?? EMPTY;
  }

  update(fn: (current: unknown) => unknown | Promise<unknown>): Promise<unknown> {
    return this.db.transaction(async (tx) => {
      await tx.insert(careerLibrary).values({ id: 1 }).onConflictDoNothing();
      const [row] = await tx
        .select()
        .from(careerLibrary)
        .where(eq(careerLibrary.id, 1))
        .for("update");
      const next = await fn(row?.document);
      await tx
        .update(careerLibrary)
        .set({ document: next, updatedAt: sql`now()` })
        .where(eq(careerLibrary.id, 1));
      return next;
    });
  }
}
