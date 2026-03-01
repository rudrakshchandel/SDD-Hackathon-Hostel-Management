import NextAuth from "next-auth";
import { authEnabled, authOptions, googleOAuthConfigured } from "@/lib/auth";

const handler = NextAuth(authOptions);

export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
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

  if (!googleOAuthConfigured) {
    return new Response(
      JSON.stringify({
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
  return handler(request, context);
}

export async function POST(request: Request, context: { params: { nextauth: string[] } }) {
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

  if (!googleOAuthConfigured) {
    return new Response(
      JSON.stringify({
        error:
          "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
  return handler(request, context);
}
