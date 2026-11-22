import { createMiddleware } from "hono/factory";
import type { Env } from "../env.js";

/** Filled by the recruiter-chat track. Fails closed until then, so it can never let a request through. */
export const requireActiveRecruiterChat = createMiddleware<Env>(async () => {
  throw new Error("requireActiveRecruiterChat is not implemented");
});
