import { afterEach, describe, expect, it, vi } from "vitest";
import { createContainer } from "../../src/container";
import { AdminAuthService } from "../../src/security/admin-auth";
import { CareerService } from "../../src/services/career.service";
import { LlmService } from "../../src/services/llm.service";
import { PersonalInfoService } from "../../src/services/personal-info.service";
import { ProfileService } from "../../src/services/profile.service";
import { PublicChatService } from "../../src/services/public-chat.service";
import { RecruiterChatService } from "../../src/services/recruiter-chat.service";
import { ResumeService } from "../../src/services/resume.service";
import { SettingsService } from "../../src/services/settings.service";
import { resolvedConfig } from "../support/config";

afterEach(() => vi.unstubAllGlobals());

describe("container", () => {
  it("constructs every repository and service without io", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network access during construction");
    });
    vi.stubGlobal("fetch", fetchSpy);

    const config = resolvedConfig({ databaseUrl: "postgres://u:p@unreachable.invalid:5432/db" });
    const services = createContainer(config);

    expect(services.config).toBe(config);
    expect(services.profile).toBeInstanceOf(ProfileService);
    expect(services.career).toBeInstanceOf(CareerService);
    expect(services.settings).toBeInstanceOf(SettingsService);
    expect(services.personalInfo).toBeInstanceOf(PersonalInfoService);
    expect(services.llm).toBeInstanceOf(LlmService);
    expect(services.publicChat).toBeInstanceOf(PublicChatService);
    expect(services.recruiterChat).toBeInstanceOf(RecruiterChatService);
    expect(services.resumes).toBeInstanceOf(ResumeService);
    expect(services.adminAuth).toBeInstanceOf(AdminAuthService);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
