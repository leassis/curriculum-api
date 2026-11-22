import type {
  AdminLoginAttemptRepo,
  DashboardCounts,
} from "../../src/repositories/admin-login-attempt.repository";

export class FakeAdminLoginAttemptRepo implements AdminLoginAttemptRepo {
  rows = new Map<string, number>();
  dashboard: DashboardCounts = { activeChats: 0, resumes: 0, publicQuestionsToday: 0 };

  private key = (ipHash: string, windowStart: Date) => `${ipHash}|${windowStart.toISOString()}`;

  async failures(ipHash: string, windowStart: Date): Promise<number> {
    return this.rows.get(this.key(ipHash, windowStart)) ?? 0;
  }

  async recordFailure(ipHash: string, windowStart: Date): Promise<number> {
    const k = this.key(ipHash, windowStart);
    const next = (this.rows.get(k) ?? 0) + 1;
    this.rows.set(k, next);
    return next;
  }

  async counts(): Promise<DashboardCounts> {
    return this.dashboard;
  }

  total(): number {
    return [...this.rows.values()].reduce((a, b) => a + b, 0);
  }
}
