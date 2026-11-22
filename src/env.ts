import type { ResolvedConfig } from "./config.js";
import type { Services } from "./container.js";
import type { SessionPayload } from "./security/session.js";

/** Hono environment shared by every router; services are set by the app factory. */
export interface Env {
  Variables: {
    config: ResolvedConfig;
    services: Services;
    session?: SessionPayload;
  };
}
