import { describe, expect, it } from "vitest";
import { signSession } from "../../../src/security/session";
import { SettingsService } from "../../../src/services/settings.service";
import { resolvedConfig } from "../../support/config";
import { FakeSettingsRepo } from "../../support/fakes/settings.fake";
import { createTestApp } from "../../support/test-app";

const config = resolvedConfig();
const { app } = createTestApp({
  services: { settings: new SettingsService(new FakeSettingsRepo({}), config) },
});
const cookie = async () =>
  `curr_admin=${await signSession({ scope: "admin" }, config.sessionSecret, 60)}`;

describe("admin toasts", () => {
  it("serves the bundled toast script publicly with an immutable cache", async () => {
    const res = await app.request("/admin/static/toast.js");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/javascript");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(await res.text()).toContain("notyf");
  });

  it("loads the script from the layout without inline script", async () => {
    const res = await app.request("/admin/settings", { headers: { cookie: await cookie() } });
    const html = await res.text();
    expect(html).toMatch(/src="\/admin\/static\/toast\.js\?v=[0-9a-f]+"/);
    expect(html).not.toMatch(/<script(?![^>]*\ssrc=)[^>]*>/);
  });

  it("tags the saved line and error fragments for the toast script", async () => {
    const headers = { "content-type": "application/x-www-form-urlencoded", cookie: await cookie() };
    const saved = await app.request("/admin/settings", { method: "POST", headers, body: "" });
    expect(saved.status).toBe(303);
    const page = await app.request("/admin/settings?saved=1", {
      headers: { cookie: headers.cookie },
    });
    expect(await page.text()).toMatch(/role="status"[^>]*data-toast="success"/);
    const bad = await app.request("/admin/settings", {
      method: "POST",
      headers,
      body: new URLSearchParams({ "limits.maxQuestionChars": "nope" }).toString(),
    });
    expect(bad.status).toBe(400);
    expect(await bad.text()).toMatch(/role="alert"[^>]*data-toast="error"/);
  });

  it("positions toasts bottom-right, swaps 400 form fragments and drops the scroll workaround", async () => {
    const js = await (await app.request("/admin/static/toast.js")).text();
    expect(js).toMatch(/position:\s*\{\s*x:\s*"right",\s*y:\s*"bottom"\s*\}/);
    expect(js).toContain("replaceState");
    expect(js).toContain("htmx:beforeSwap");
    expect(js).toContain("data-swap-errors");
    expect(js).not.toContain("sessionStorage");
    expect(js).not.toContain("data-keep-scroll");
    for (const banned of ["insertAdjacentHTML", "outerHTML", "eval(", "document.write"]) {
      expect(js).not.toContain(banned);
    }
    const h = { cookie: await cookie() };
    const html = await (await app.request("/admin/settings", { headers: h })).text();
    expect(html).not.toContain("data-keep-scroll");
    expect(html).toMatch(/<form[^>]*id="settings-form"[^>]*hx-post="\/admin\/settings"/);
    expect(html).toMatch(/<form[^>]*hx-target="#settings-form"[^>]*hx-swap="outerHTML"/);
    expect(html).toMatch(/<form[^>]*hx-disabled-elt="find button\[type=submit\]"/);
    expect(html).toMatch(/<form[^>]*data-swap-errors/);
  });

  it("answers an htmx save with only the form fragment and the Saved marker", async () => {
    const headers = {
      "content-type": "application/x-www-form-urlencoded",
      cookie: await cookie(),
      "HX-Request": "true",
    };
    const ok = await app.request("/admin/settings", { method: "POST", headers, body: "" });
    expect(ok.status).toBe(200);
    const html = await ok.text();
    expect(html).not.toContain("<html");
    expect(html).toContain('id="settings-form"');
    expect(html).toMatch(/role="status"[^>]*data-toast="success"/);
    const bad = await app.request("/admin/settings", {
      method: "POST",
      headers,
      body: new URLSearchParams({ "limits.maxQuestionChars": "nope" }).toString(),
    });
    expect(bad.status).toBe(400);
    const err = await bad.text();
    expect(err).not.toContain("<html");
    expect(err).toContain('id="settings-form"');
    expect(err).toMatch(/role="alert"[^>]*data-toast="error"/);
    expect(err).not.toContain('data-toast="success"');
  });
});
