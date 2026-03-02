type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export const authRateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const DEFAULT_MAX_ATTEMPTS = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 10);

export function getClientIpAddress(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function checkAuthAttemptLimit(
  request: Request,
  action: string,
  options?: {
    windowMs?: number;
    maxAttempts?: number;
  }
) {
  const windowMs = Math.max(1_000, options?.windowMs ?? DEFAULT_WINDOW_MS);
  const maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const now = Date.now();
  const ip = getClientIpAddress(request);
  const key = `${action}:${ip}`;

  const existing = authRateLimitStore.get(key);
  if (!existing || existing.resetAt <= now) {
    authRateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true as const,
      retryAfterSeconds: 0,
      remainingAttempts: maxAttempts - 1
    };
  }

  const nextCount = existing.count + 1;
  if (nextCount > maxAttempts) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remainingAttempts: 0
    };
  }

  authRateLimitStore.set(key, {
    ...existing,
    count: nextCount
  });

  return {
    allowed: true as const,
    retryAfterSeconds: 0,
    remainingAttempts: Math.max(0, maxAttempts - nextCount)
  };
}
