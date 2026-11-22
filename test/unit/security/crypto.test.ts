import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../../../src/security/crypto";
import { DecryptionError } from "../../../src/services/errors";
import { TEST_PII_KEY } from "../../support/config";

const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

describe("crypto", () => {
  it("round trips with a random iv", async () => {
    const a = await encrypt("+55 11 91234-5678", TEST_PII_KEY);
    const b = await encrypt("+55 11 91234-5678", TEST_PII_KEY);
    expect(await decrypt(a, TEST_PII_KEY)).toBe("+55 11 91234-5678");
    expect(await decrypt(b, TEST_PII_KEY)).toBe("+55 11 91234-5678");
    expect(a).not.toBe(b);
    expect(a).not.toContain("91234");
  });

  it("throws DecryptionError on wrong key or tampering", async () => {
    const token = await encrypt("secret value", TEST_PII_KEY);
    await expect(decrypt(token, OTHER_KEY)).rejects.toBeInstanceOf(DecryptionError);

    const bytes = Buffer.from(token, "base64");
    bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) ^ 0xff;
    await expect(decrypt(bytes.toString("base64"), TEST_PII_KEY)).rejects.toBeInstanceOf(
      DecryptionError,
    );
    await expect(decrypt("short", TEST_PII_KEY)).rejects.toBeInstanceOf(DecryptionError);
  });
});
