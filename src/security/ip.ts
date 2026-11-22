/** First `x-forwarded-for` entry, else `x-real-ip`, else null. */
export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real || null;
}

/** Lowercase hex SHA-256 of `salt + ip`. */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + ip));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
