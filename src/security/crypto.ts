import { DecryptionError } from "../services/errors.js";

const IV_BYTES = 12;

async function importKey(keyB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", Buffer.from(keyB64, "base64"), "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/** AES-256-GCM; returns base64(iv(12) || ciphertext+tag). */
export async function encrypt(plain: string, keyB64: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await importKey(keyB64),
    new TextEncoder().encode(plain),
  );
  return Buffer.concat([iv, new Uint8Array(cipher)]).toString("base64");
}

export async function decrypt(payloadB64: string, keyB64: string): Promise<string> {
  try {
    const bytes = Buffer.from(payloadB64, "base64");
    const iv = bytes.subarray(0, IV_BYTES);
    const data = bytes.subarray(IV_BYTES);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await importKey(keyB64),
      data,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new DecryptionError();
  }
}
