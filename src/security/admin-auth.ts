import bcrypt from "bcryptjs";
import type { ResolvedConfig } from "../config.js";
import type {
  AdminLoginAttemptRepo,
  DashboardCounts,
} from "../repositories/admin-login-attempt.repository.js";
import { hashIp } from "./ip.js";

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILED_LOGINS = 5;
export const FAILED_LOGIN_DELAY_MS = 500;

export type LoginResult = "ok" | "invalid" | "throttled";

export interface AdminAuthOptions {
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/** Password check with a fixed-window throttle per IP hash (AD-004). */
export class AdminAuthService {
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;

  constructor(
    private readonly attempts: AdminLoginAttemptRepo,
    private readonly config: ResolvedConfig,
    opts: AdminAuthOptions = {},
  ) {
    this.sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.now = opts.now ?? Date.now;
  }

  async login(password: string | undefined, ip: string | null): Promise<LoginResult> {
    const ipHash = await hashIp(ip ?? "unknown", this.config.ipHashSalt);
    const windowStart = new Date(Math.floor(this.now() / LOGIN_WINDOW_MS) * LOGIN_WINDOW_MS);
    if ((await this.attempts.failures(ipHash, windowStart)) >= MAX_FAILED_LOGINS) {
      return "throttled";
    }
    if (await this.matches(password)) return "ok";
    await this.sleep(FAILED_LOGIN_DELAY_MS);
    await this.attempts.recordFailure(ipHash, windowStart);
    return "invalid";
  }

  dashboardCounts(): Promise<DashboardCounts> {
    return this.attempts.counts();
  }

  private async matches(password: string | undefined): Promise<boolean> {
    if (!password) return false;
    try {
      return await bcrypt.compare(password, this.config.adminPasswordHash);
    } catch {
      return false;
    }
  }
}
