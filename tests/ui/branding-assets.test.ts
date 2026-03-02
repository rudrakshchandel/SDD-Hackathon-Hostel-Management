import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("branding assets", () => {
  it("uses png logo in top navbar brand", () => {
    const topNav = read("app/components/top-nav.tsx");
    expect(topNav).toContain('from "next/image"');
    expect(topNav).toContain('src="/hostel-management-logo.png"');
  });

  it("ships ico favicon for app router", () => {
    expect(existsSync(path.resolve(process.cwd(), "app/favicon.ico"))).toBe(true);
  });
});

