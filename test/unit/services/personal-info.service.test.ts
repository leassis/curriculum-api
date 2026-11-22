import { describe, expect, it } from "vitest";
import { ValidationError } from "../../../src/services/errors";
import { PersonalInfoService } from "../../../src/services/personal-info.service";
import { TEST_PII_KEY } from "../../support/config";
import { FakePersonalInfoRepo } from "../../support/fakes/personal-info.fake";

function setup() {
  const repo = new FakePersonalInfoRepo();
  return { repo, service: new PersonalInfoService(repo, TEST_PII_KEY) };
}

const base = { key: "PHONE", label: "Phone", value: "+55 11 91234-5678", visibility: "public" };

async function fieldsOf(promise: Promise<unknown>): Promise<string[]> {
  const error = await promise.then(
    () => null,
    (e) => e,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return Object.keys((error as ValidationError).fields ?? {});
}

describe("PersonalInfoService", () => {
  it("create rejects invalid input", async () => {
    const { service } = setup();
    await service.create(base);

    expect(await fieldsOf(service.create({ ...base, key: "phone" }))).toEqual(["key"]);
    expect(await fieldsOf(service.create({ ...base, key: "1ABC" }))).toEqual(["key"]);
    expect(await fieldsOf(service.create({ ...base, key: `A${"B".repeat(32)}` }))).toEqual(["key"]);
    expect(await fieldsOf(service.create(base))).toEqual(["key"]);
    expect(await fieldsOf(service.create({ ...base, key: "EMAIL", label: "  " }))).toEqual([
      "label",
    ]);
    expect(await fieldsOf(service.create({ ...base, key: "EMAIL", value: "" }))).toEqual(["value"]);
    expect(
      await fieldsOf(service.create({ ...base, key: "EMAIL", visibility: "everyone" })),
    ).toEqual(["visibility"]);
    await expect(service.create({ ...base, key: "A" })).resolves.toMatchObject({ key: "A" });
  });

  it("contactFor filters by channel and orders", async () => {
    const { service } = setup();
    await service.create({
      key: "Z_PUBLIC",
      label: "Z",
      value: "zzz-public",
      visibility: "public",
      sortOrder: 1,
    });
    await service.create({
      key: "A_PUBLIC",
      label: "A",
      value: "aaa-public",
      visibility: "public",
      sortOrder: 1,
    });
    await service.create({
      key: "RECRUITER",
      label: "R",
      value: "rrr-recruiter",
      visibility: "recruiter",
      sortOrder: 0,
    });
    await service.create({
      key: "PRINT",
      label: "P",
      value: "ppp-print",
      visibility: "print",
      sortOrder: 2,
    });

    const keys = async (channel: "public" | "recruiter" | "print") =>
      (await service.contactFor(channel)).map((c) => c.key);
    expect(await keys("public")).toEqual(["A_PUBLIC", "Z_PUBLIC"]);
    expect(await keys("recruiter")).toEqual(["RECRUITER", "A_PUBLIC", "Z_PUBLIC"]);
    expect(await keys("print")).toEqual(["RECRUITER", "A_PUBLIC", "Z_PUBLIC", "PRINT"]);
    expect((await service.contactFor("public"))[0]).toEqual({
      key: "A_PUBLIC",
      label: "A",
      value: "aaa-public",
    });
  });

  it("allValues decrypts every field", async () => {
    const { service } = setup();
    await service.create({ ...base, visibility: "print" });
    await service.create({
      key: "EMAIL",
      label: "Email",
      value: "ada@example.com",
      visibility: "recruiter",
    });
    expect(await service.allValues()).toEqual([
      { key: "EMAIL", label: "Email", value: "ada@example.com" },
      { key: "PHONE", label: "Phone", value: "+55 11 91234-5678" },
    ]);
    expect(await service.reveal("PHONE")).toBe("+55 11 91234-5678");
    const listed = await service.list();
    expect(JSON.stringify(listed)).not.toContain("ada@example.com");
  });
});
