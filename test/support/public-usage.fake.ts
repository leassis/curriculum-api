import type { PublicUsageRepo, UsageGrant } from "../../src/repositories/public-usage.repository";

export class FakePublicUsageRepo implements PublicUsageRepo {
  /** `${ipHash}|${day}` -> used. */
  rows = new Map<string, number>();
  day = "2026-01-01";
  acquires = 0;

  key(ipHash: string, day = this.day): string {
    return `${ipHash}|${day}`;
  }

  usedBy(ipHash: string): number {
    return this.rows.get(this.key(ipHash)) ?? 0;
  }

  async acquire(ipHash: string, limit: number): Promise<UsageGrant | null> {
    this.acquires++;
    const used = this.usedBy(ipHash);
    if (used >= limit) return null;
    this.rows.set(this.key(ipHash), used + 1);
    return { used: used + 1, day: this.day };
  }

  async release(ipHash: string, day: string): Promise<void> {
    const k = this.key(ipHash, day);
    this.rows.set(k, Math.max((this.rows.get(k) ?? 0) - 1, 0));
  }
}
