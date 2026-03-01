import { createHmac, timingSafeEqual } from "crypto";

const MAX_REQUEST_AGE_SECONDS = 60 * 5;

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function verifySlackRequest(headers: Headers, rawBody: string) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return {
      ok: false,
      error: "SLACK_SIGNING_SECRET is not configured"
    } as const;
  }

  const timestamp = headers.get("x-slack-request-timestamp");
  const signature = headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return {
      ok: false,
      error: "Missing Slack signature headers"
    } as const;
  }

  const requestTs = Number(timestamp);
  if (!Number.isFinite(requestTs)) {
    return {
      ok: false,
      error: "Invalid Slack signature timestamp"
    } as const;
  }

  const nowTs = Math.floor(Date.now() / 1000);
  if (Math.abs(nowTs - requestTs) > MAX_REQUEST_AGE_SECONDS) {
    return {
      ok: false,
      error: "Slack request timestamp is too old"
    } as const;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex")}`;

  if (!safeCompare(expected, signature)) {
    return {
      ok: false,
      error: "Slack signature verification failed"
    } as const;
  }

  return { ok: true } as const;
}
