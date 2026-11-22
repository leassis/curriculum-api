import { describe, expect, it } from "vitest";
import { fetchEndpointFor } from "../../../src/db/client";

describe("fetchEndpointFor", () => {
  it("routes localhost to Neon Local over http", () => {
    expect(fetchEndpointFor("localhost", 5432)).toBe("http://localhost:5432/sql");
    expect(fetchEndpointFor("localhost", 5433)).toBe("http://localhost:5433/sql");
    expect(fetchEndpointFor("localhost", "5433")).toBe("http://localhost:5433/sql");
    expect(fetchEndpointFor("localhost")).toBe("http://localhost:5432/sql");
    expect(fetchEndpointFor("127.0.0.1", 5432)).toBe("http://127.0.0.1:5432/sql");
  });

  it("routes any other host to https", () => {
    expect(fetchEndpointFor("ep-cool-123.eu-central-1.aws.neon.tech", 5432)).toBe(
      "https://ep-cool-123.eu-central-1.aws.neon.tech/sql",
    );
    expect(fetchEndpointFor("db.localtest.me", 5432)).toBe("https://db.localtest.me/sql");
  });
});
