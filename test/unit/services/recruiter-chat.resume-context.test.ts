import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../../src/services/errors";
import { recruiterSetup } from "../../support/recruiter-chat";

const ID = "00000000-0000-4000-8000-000000000042";

describe("recruiter chat service resume context", () => {
  it("returns the company and short job description of a resume", async () => {
    const { repo, recruiterChat } = await recruiterSetup();
    repo.resumes.set(ID, { title: "T", company: "Acme", jobDescriptionShort: "- Postgres" });
    repo.resumes.set("00000000-0000-4000-8000-000000000043", { title: "Bare" });

    expect(await recruiterChat.resumeContext(ID)).toEqual({
      company: "Acme",
      jobDescriptionShort: "- Postgres",
    });
    expect(await recruiterChat.resumeContext("00000000-0000-4000-8000-000000000043")).toEqual({
      company: null,
      jobDescriptionShort: null,
    });
  });

  it("answers not found for a missing or malformed id", async () => {
    const { recruiterChat } = await recruiterSetup();
    for (const id of ["00000000-0000-4000-8000-00000000ffff", "not-a-uuid", ""]) {
      const error = await recruiterChat.resumeContext(id).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(NotFoundError);
      expect((error as NotFoundError).message).toBe("Tailored Resume not found");
    }
  });
});
