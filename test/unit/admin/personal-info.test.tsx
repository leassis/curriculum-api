import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { PersonalInfoService } from "../../../src/services/personal-info.service";
import { resolvedConfig } from "../../support/config";
import { FakePersonalInfoRepo } from "../../support/fakes/personal-info.fake";
import { createTestApp } from "../../support/test-app";

const EMAIL = "ada@example.com";

function setup() {
  const config = resolvedConfig();
  const personalInfo = new PersonalInfoService(new FakePersonalInfoRepo(), config.piiEncryptionKey);
  const { app } = createTestApp({ services: { personalInfo } });
  const cookie = signSession({ scope: "admin" }, config.sessionSecret, 60).then(
    (t) => `curr_admin=${t}`,
  );
  const call = async (method: string, path: string, fields?: Record<string, string>) =>
    app.request(`/admin/personal-info${path}`, {
      method,
      headers: {
        cookie: await cookie,
        ...(fields ? { "content-type": "application/x-www-form-urlencoded" } : {}),
        "hx-request": "true",
      },
      body: fields ? new URLSearchParams(fields).toString() : undefined,
    });
  const seed = () =>
    personalInfo.create({
      key: "EMAIL",
      label: "Email",
      value: EMAIL,
      visibility: "recruiter",
      sortOrder: 2,
    });
  return { personalInfo, call, seed };
}

const valid = {
  key: "PHONE",
  label: "Phone",
  value: "+55 11 91234-5678",
  visibility: "print",
  sortOrder: "1",
};

describe("admin personal info", () => {
  it("lists fields with a masked value", async () => {
    const { call, seed } = setup();
    await seed();
    const html = await (await call("GET", "")).text();
    expect(html).toContain("EMAIL");
    expect(html).toContain('value="Email"');
    expect(html).toContain('<option value="recruiter" selected');
    expect(html).toContain('value="2"');
    expect(html).toContain("••••••");
  });

  it("never renders a decrypted value in the list", async () => {
    const { call, seed } = setup();
    await seed();
    expect(await (await call("GET", "")).text()).not.toContain(EMAIL);
    const created = await call("POST", "", valid);
    expect(await created.text()).not.toContain(EMAIL);
    expect(await (await call("GET", "")).text()).not.toContain("91234");
  });

  it("shows an empty state", async () => {
    const { call } = setup();
    expect(await (await call("GET", "")).text()).toContain("No personal info yet");
  });

  it("creates a field and returns the list", async () => {
    const { call, personalInfo } = setup();
    const res = await call("POST", "", valid);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="pi-list"');
    expect(html).toContain("PHONE");
    expect(html).not.toContain("<html");
    expect(await personalInfo.reveal("PHONE")).toBe(valid.value);
    expect((await personalInfo.list())[0]?.sortOrder).toBe(1);
  });

  it("rejects invalid input naming the field", async () => {
    const { call, personalInfo } = setup();
    const badKey = await call("POST", "", { ...valid, key: "bad key" });
    expect(badKey.status).toBe(400);
    expect(await badKey.text()).toContain("key");
    const badVis = await call("POST", "", { ...valid, visibility: "nobody" });
    expect(badVis.status).toBe(400);
    expect(await badVis.text()).toContain("visibility");
    const badOrder = await call("POST", "", { ...valid, sortOrder: "1.5" });
    expect(badOrder.status).toBe(400);
    expect(await badOrder.text()).toContain("sortOrder");
    expect(await personalInfo.list()).toEqual([]);
  });

  it("updates a field and keeps the value when empty", async () => {
    const { call, seed, personalInfo } = setup();
    await seed();
    const res = await call("PUT", "/EMAIL", {
      label: "Work email",
      visibility: "public",
      sortOrder: "5",
      value: "",
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('id="row-EMAIL"');
    expect(html).toContain('value="Work email"');
    expect(html).not.toContain(EMAIL);
    expect(await personalInfo.reveal("EMAIL")).toBe(EMAIL);
    expect((await personalInfo.list())[0]).toMatchObject({ visibility: "public", sortOrder: 5 });
    await call("PUT", "/EMAIL", {
      label: "Work email",
      visibility: "public",
      sortOrder: "5",
      value: "new@example.com",
    });
    expect(await personalInfo.reveal("EMAIL")).toBe("new@example.com");
  });

  it("deletes a field after confirmation", async () => {
    const { call, seed, personalInfo } = setup();
    await seed();
    expect(await (await call("GET", "")).text()).toContain('hx-confirm="Delete Email?"');
    const res = await call("DELETE", "/EMAIL");
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("");
    expect(await personalInfo.list()).toEqual([]);
  });

  it("reveals the value with no-store", async () => {
    const { call, seed } = setup();
    await seed();
    const res = await call("GET", "/EMAIL/reveal");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toContain(EMAIL);
  });

  it("answers 404 for a missing key", async () => {
    const { call } = setup();
    const fields = { label: "x", visibility: "public", sortOrder: "0", value: "" };
    for (const res of [
      await call("PUT", "/NOPE", fields),
      await call("DELETE", "/NOPE"),
      await call("GET", "/NOPE/reveal"),
    ]) {
      expect(res.status).toBe(404);
      const html = await res.text();
      expect(html).toContain('role="alert"');
      expect(html).not.toContain("<html");
    }
  });
});
