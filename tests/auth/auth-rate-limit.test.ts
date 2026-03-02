import { describe, expect, it } from "vitest";
import {
  authRateLimitStore,
  checkAuthAttemptLimit,
  getClientIpAddress
} from "@/lib/auth-rate-limit";

describe("auth rate limiter", () => {
  it("derives client IP from forwarded headers", () => {
    const request = new Request("http://localhost/api/auth/signin", {
      headers: {
        "x-forwarded-for": "203.0.113.1, 10.0.0.1"
      }
    });
    expect(getClientIpAddress(request)).toBe("203.0.113.1");
  });

  it("blocks after exceeding max attempts in window", () => {
    authRateLimitStore.clear();

    const request = new Request("http://localhost/api/auth/signin");
    const maxAttempts = 2;
    const windowMs = 60_000;

    const first = checkAuthAttemptLimit(request, "signin", {
      maxAttempts,
      windowMs
    });
    const second = checkAuthAttemptLimit(request, "signin", {
      maxAttempts,
      windowMs
    });
    const third = checkAuthAttemptLimit(request, "signin", {
      maxAttempts,
      windowMs
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(false);
    if (!third.allowed) {
      expect(third.retryAfterSeconds).toBeGreaterThan(0);
    }
  });
});
