import NextAuth from "next-auth";
import { authEnabled, authOptions } from "@/lib/auth";
import { checkAuthAttemptLimit } from "@/lib/auth-rate-limit";

const handler = NextAuth(authOptions);

function shouldRateLimitAuthAction(action: string) {
  return action === "signin" || action === "callback";
}

function rateLimitResponse(retryAfterSeconds: number) {
  return new Response(
    JSON.stringify({
      error: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.`
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(retryAfterSeconds)
      }
    }
  );
}

export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
  const action = context.params.nextauth?.[0] || "";
  if (shouldRateLimitAuthAction(action)) {
    const limit = checkAuthAttemptLimit(request, action);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }
  }

  if (!authEnabled) {
    return new Response(
      JSON.stringify({
        error: "Authentication is currently disabled. Set AUTH_ENABLED=true to enable NextAuth."
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" }
      }
    );
  }

  return handler(request, context);
}

export async function POST(request: Request, context: { params: { nextauth: string[] } }) {
  const action = context.params.nextauth?.[0] || "";
  if (shouldRateLimitAuthAction(action)) {
    const limit = checkAuthAttemptLimit(request, action);
    if (!limit.allowed) {
      return rateLimitResponse(limit.retryAfterSeconds);
    }
  }

  if (!authEnabled) {
    return new Response(
      JSON.stringify({
        error: "Authentication is currently disabled. Set AUTH_ENABLED=true to enable NextAuth."
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" }
      }
    );
  }

  return handler(request, context);
}
