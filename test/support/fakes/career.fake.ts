import type { CareerRepo } from "../../../src/repositories/career.repository";

export class FakeCareerRepo implements CareerRepo {
  constructor(public document: unknown = { version: 1, items: [] }) {}

  writes = 0;

  async get(): Promise<unknown> {
    return this.document;
  }

  async update(fn: (current: unknown) => unknown | Promise<unknown>): Promise<unknown> {
    const next = await fn(this.document);
    this.document = next;
    this.writes += 1;
    return next;
  }
}
