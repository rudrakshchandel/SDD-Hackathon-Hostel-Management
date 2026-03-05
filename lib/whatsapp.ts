import { createHmac, timingSafeEqual } from "crypto";

const WHATSAPP_MAX_TEXT_LENGTH = 4096;

function safeCompare(a: string, b: string) {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function verifyWhatsAppRequest(headers: Headers, rawBody: string) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    return {
      ok: false as const,
      error: "WHATSAPP_APP_SECRET is not configured"
    };
  }

  const signature = headers.get("x-hub-signature-256");
  if (!signature || !signature.startsWith("sha256=")) {
    return {
      ok: false as const,
      error: "Missing or invalid WhatsApp signature header"
    };
  }

  const expected = `sha256=${createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex")}`;

  if (!safeCompare(expected, signature)) {
    return {
      ok: false as const,
      error: "WhatsApp signature verification failed"
    };
  }

  return { ok: true as const };
}

export function normalizeWhatsAppNumber(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const compact = trimmed.replace(/[\s\-()]/g, "");
  const withoutInternationalPrefix = compact.startsWith("00")
    ? `+${compact.slice(2)}`
    : compact;

  const normalized = withoutInternationalPrefix.startsWith("+")
    ? `+${withoutInternationalPrefix.slice(1).replace(/\D/g, "")}`
    : `+${withoutInternationalPrefix.replace(/\D/g, "")}`;

  if (!/^\+\d{8,15}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function parseWhatsAppAllowlist(raw = process.env.WHATSAPP_ALLOWED_NUMBERS || "") {
  const normalized = raw
    .split(",")
    .map((part) => normalizeWhatsAppNumber(part))
    .filter((value): value is string => Boolean(value));

  return [...new Set(normalized)];
}

export function isWhatsAppNumberAllowed(number: string, allowlist: string[]) {
  if (allowlist.length === 0) return false;
  return allowlist.includes(number);
}

export function formatWhatsAppText(text: string) {
  const normalizedLines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^#{1,6}\s*/, ""))
    .map((line) => line.replace(/^(?:-|\*)\s+/, "• "))
    .map((line) => line.replace(/^>\s*/, ""))
    .map((line) => line.replace(/\*\*(.*?)\*\*/g, "$1"))
    .map((line) => line.replace(/__(.*?)__/g, "$1"))
    .map((line) => line.replace(/`([^`]+)`/g, "$1"));

  const compact = normalizedLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (compact.length <= WHATSAPP_MAX_TEXT_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, WHATSAPP_MAX_TEXT_LENGTH - 3)}...`;
}
