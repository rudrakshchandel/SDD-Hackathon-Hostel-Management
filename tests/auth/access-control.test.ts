import { describe, expect, it } from "vitest";
import { authOptions } from "@/lib/auth";
import { config as middlewareConfig } from "@/middleware";

describe("auth access control", () => {
  it("uses login page as auth entry point", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });

  it("protects all dashboard modules including revenue", () => {
    const matcher = middlewareConfig.matcher as string[];
    expect(matcher).toContain("/dashboard/:path*");
    expect(matcher).toContain("/rooms/:path*");
    expect(matcher).toContain("/hostel/:path*");
    expect(matcher).toContain("/tenants/:path*");
    expect(matcher).toContain("/revenue/:path*");
  });
});

