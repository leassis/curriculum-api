import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../../src/services/errors";
import { ProfileService } from "../../../src/services/profile.service";
import { FakeProfileRepo, profileInput } from "../../support/fakes/profile.fake";

describe("ProfileService", () => {
  it("get returns the row or throws NotFoundError", async () => {
    const repo = new FakeProfileRepo();
    const service = new ProfileService(repo);
    await expect(service.get()).rejects.toBeInstanceOf(NotFoundError);

    await service.update(profileInput);
    expect(await service.get()).toMatchObject({ id: 1, fullName: "Ada" });
  });

  it("update upserts row 1", async () => {
    const repo = new FakeProfileRepo();
    const service = new ProfileService(repo);
    const stored = await service.update({ ...profileInput, summary: "new summary" });
    expect(repo.upserts).toEqual([{ ...profileInput, summary: "new summary" }]);
    expect(stored).toMatchObject({ id: 1, summary: "new summary" });
    expect(repo.row).toEqual(stored);
  });

  it("update stores the summary", async () => {
    const repo = new FakeProfileRepo();
    const service = new ProfileService(repo);
    const stored = await service.update({ ...profileInput, summary: "Ten years of backend work." });
    expect(stored.summary).toBe("Ten years of backend work.");
    expect((await service.get()).summary).toBe("Ten years of backend work.");
  });
});
