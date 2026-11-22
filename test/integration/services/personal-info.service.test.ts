import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { personalInfo } from "../../../src/db/schema";
import { PersonalInfoRepository } from "../../../src/repositories/personal-info.repository";
import { PersonalInfoService } from "../../../src/services/personal-info.service";
import { TEST_PII_KEY } from "../../support/config";
import { resetDb, testDb } from "../../support/db";

const db = testDb();

describe("PersonalInfoService", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  it("stores ciphertext only", async () => {
    const service = new PersonalInfoService(new PersonalInfoRepository(db), TEST_PII_KEY);
    await service.create({
      key: "PHONE",
      label: "Phone",
      value: "+55 11 91234-5678",
      visibility: "public",
    });

    const stored = async () =>
      (await db.select().from(personalInfo).where(eq(personalInfo.key, "PHONE")))[0]
        ?.valueEncrypted;

    expect(await stored()).toBeTruthy();
    expect(await stored()).not.toContain("91234");
    expect(await service.reveal("PHONE")).toBe("+55 11 91234-5678");

    await service.update("PHONE", { value: "+1 555 000 1111" });
    expect(await stored()).not.toContain("555 000 1111");
    expect(await service.reveal("PHONE")).toBe("+1 555 000 1111");
  });
});
