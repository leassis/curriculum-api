import type { Context } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { jwtVerify, SignJWT } from "jose";
import type { ResolvedConfig } from "../config.js";

export type SessionScope = "public" | "recruiter" | "admin";

export interface SessionPayload {
  scope: SessionScope;
  /** Recruiter chat id, for the recruiter scope. */
  cid?: string;
}

export const SESSION_COOKIE = "curr_session";
export const ADMIN_COOKIE = "curr_admin";
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;

type CookieConfig = Pick<ResolvedConfig, "basePath" | "secureCookies">;

const key = (secret: string) => new TextEncoder().encode(secret);
const SCOPES: readonly string[] = ["public", "recruiter", "admin"];

export async function signSession(
  payload: SessionPayload,
  secret: string,
  ttlSeconds: number,
): Promise<string> {
  const claims: Record<string, unknown> = { scope: payload.scope };
  if (payload.cid !== undefined) claims.cid = payload.cid;
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(key(secret));
}

/** Returns the payload, or null for an expired, foreign-secret or altered token. */
export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    const scope = payload.scope;
    if (typeof scope !== "string" || !SCOPES.includes(scope)) return null;
    const session: SessionPayload = { scope: scope as SessionScope };
    if (typeof payload.cid === "string") session.cid = payload.cid;
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(
  c: Context,
  token: string,
  cfg: CookieConfig & Pick<ResolvedConfig, "limits">,
): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: cfg.secureCookies,
    path: `${cfg.basePath}/api`,
    maxAge: cfg.limits.sessionTtlMinutes * 60,
  });
}

export function setAdminCookie(c: Context, token: string, cfg: CookieConfig): void {
  setCookie(c, ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "Strict",
    secure: cfg.secureCookies,
    path: `${cfg.basePath}/admin`,
    maxAge: ADMIN_SESSION_SECONDS,
  });
}

export function clearAdminCookie(c: Context, cfg: CookieConfig): void {
  deleteCookie(c, ADMIN_COOKIE, {
    httpOnly: true,
    sameSite: "Strict",
    secure: cfg.secureCookies,
    path: `${cfg.basePath}/admin`,
  });
}
