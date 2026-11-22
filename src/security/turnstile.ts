const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Fails closed: anything other than `success: true` from Cloudflare resolves false. */
export async function verifyTurnstile(
  token: string,
  ip: string | null,
  secret: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetchFn(VERIFY_URL, { method: "POST", body });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: unknown };
    return json.success === true;
  } catch {
    return false;
  }
}
