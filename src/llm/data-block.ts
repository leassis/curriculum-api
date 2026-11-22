/** Delimits untrusted text as data. The rule that tells the model so lives in the default prompts. */

// Strips every maximal run of 3+ angle brackets. A narrower `<<<|>>>` pass is forgeable:
// removing `>>>` from `<<>>><` would join the neighbours into a new `<<<`.
const MARKER_RUN = /[<>]{3,}/g;

export function sanitizeMarkers(value: string): string {
  return value.replace(MARKER_RUN, "");
}

/** `<<<NAME_START>>>`, the sanitized value, `<<<NAME_END>>>`. */
export function dataBlock(name: string, value: string): string {
  return `<<<${name}_START>>>\n${sanitizeMarkers(value).trim()}\n<<<${name}_END>>>`;
}

/**
 * Wraps each user message as a data block. Assistant turns come from the client too, so they are
 * sanitized (never wrapped), which keeps a forged turn from carrying a marker.
 */
export function wrapUserMessages<M extends { role: string; content: string }>(
  messages: M[],
  name: string,
): M[] {
  return messages.map((m) =>
    m.role === "user"
      ? { ...m, content: dataBlock(name, m.content) }
      : { ...m, content: sanitizeMarkers(m.content) },
  );
}
