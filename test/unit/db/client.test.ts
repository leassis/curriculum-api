import { describe, expect, it } from "vitest";
import { fetchEndpointFor } from "../../../src/db/client";

describe("db client", () => {
  it("routes db.localtest.me to the local proxy", () => {
    expect(fetchEndpointFor("db.localtest.me")).toBe("http://db.localtest.me:4444/sql");
    expect(fetchEndpointFor("ep-cool-123.eu-central-1.aws.neon.tech")).toBe(
      "https://ep-cool-123.eu-central-1.aws.neon.tech/sql",
    );
  });
});
