import type { ResolvedConfig } from "../config.js";
import type { AdminLoginAttemptRepository } from "../repositories/admin-login-attempt.repository.js";

/** Filled by the admin-core track. */
export class AdminAuthService {
  constructor(
    protected readonly attempts: AdminLoginAttemptRepository,
    protected readonly config: ResolvedConfig,
  ) {}
}
