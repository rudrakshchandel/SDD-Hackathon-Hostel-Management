import { describe, expect, it } from "vitest";
import { buildPrismaDatasourceUrl } from "@/lib/prisma";

describe("prisma datasource url pooling config", () => {
  it("appends connection_limit and pool_timeout params", () => {
    const url = buildPrismaDatasourceUrl(
      "postgresql://user:pass@host/db?sslmode=require",
      {
        connectionLimit: 2,
        poolTimeout: 10
      }
    );

    expect(url).toContain("connection_limit=2");
    expect(url).toContain("pool_timeout=10");
    expect(url).toContain("sslmode=require");
  });

  it("returns original url when parsing fails", () => {
    const invalid = buildPrismaDatasourceUrl("not-a-valid-url", {
      connectionLimit: 2,
      poolTimeout: 10
    });
    expect(invalid).toBe("not-a-valid-url");
  });
});
