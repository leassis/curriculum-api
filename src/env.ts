import type { ResolvedConfig } from "./config.js";
import type { SessionPayload } from "./security/session.js";

/** Hono environment shared by every router; the container is added to Variables with the app factory. */
export interface Env {
  Variables: {
    config: ResolvedConfig;
    session?: SessionPayload;
  };
}
