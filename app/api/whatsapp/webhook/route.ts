import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWhatsAppEnabled } from "@/lib/feature-flags";
import { verifyWhatsAppRequest, parseWhatsAppAllowlist, normalizeWhatsAppNumber, isWhatsAppNumberAllowed, formatWhatsAppText } from "@/lib/whatsapp";
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-client";
import { answerDashboardQuestion, sanitizeAssistantQuery } from "@/lib/dashboard-ai";
import { checkRateLimitByKey } from "@/lib/auth-rate-limit";

export const runtime = "nodejs";

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          id?: string;
          from?: string;
          type?: string;
          text?: {
            body?: string;
          };
        }>;
      };
    }>;
  }>;
};

const ACCESS_DENIED_MESSAGE =
  "Access denied. This WhatsApp assistant is restricted to authorized staff numbers.";
const ASSISTANT_FAILURE_MESSAGE =
  "I could not process that right now. Please try again in a moment.";

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
  );
}

function extractInboundTextMessages(payload: WhatsAppWebhookPayload) {
  return (payload.entry || [])
    .flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.messages || [])
    .filter((message) => message.type === "text" && Boolean(message.id && message.from));
}

export async function GET(request: Request) {
  if (!isWhatsAppEnabled()) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      message: "WhatsApp integration is disabled. Set WHATSAPP_ENABLED=true to enable it."
    });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "";

  if (mode === "subscribe" && challenge && token && token === expectedToken) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isWhatsAppEnabled()) {
    return NextResponse.json({
      ok: true,
      disabled: true,
      message: "WhatsApp integration is disabled. Set WHATSAPP_ENABLED=true to enable it."
    });
  }

  const verification = verifyWhatsAppRequest(request.headers, rawBody);
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid WhatsApp webhook payload" }, { status: 400 });
  }

  const allowlist = parseWhatsAppAllowlist();
  const messages = extractInboundTextMessages(payload);

  for (const message of messages) {
    const fromNumber = normalizeWhatsAppNumber(message.from || "");
    if (!fromNumber || !message.id) continue;

    if (!isWhatsAppNumberAllowed(fromNumber, allowlist)) {
      await sendWhatsAppTextMessage(fromNumber, ACCESS_DENIED_MESSAGE);
      continue;
    }

    const rate = checkRateLimitByKey(`whatsapp:${fromNumber}`, {
      maxAttempts: 10,
      windowMs: 60_000
    });

    if (!rate.allowed) {
      await sendWhatsAppTextMessage(
        fromNumber,
        `Too many requests. Please retry in about ${rate.retryAfterSeconds} seconds.`
      );
      continue;
    }

    try {
      await prisma.whatsappInboundMessage.create({
        data: {
          providerMessageId: message.id,
          fromNumber,
          inboundText: message.text?.body || null
        }
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }

    const queryText = (message.text?.body || "").trim();
    const sanitized = sanitizeAssistantQuery(queryText);

    if (!sanitized.ok) {
      await sendWhatsAppTextMessage(fromNumber, formatWhatsAppText(sanitized.reason));
      continue;
    }

    try {
      const answer = await answerDashboardQuestion(sanitized.value);
      const text = formatWhatsAppText(answer.answer);
      const outbound = await sendWhatsAppTextMessage(fromNumber, text);

      await prisma.whatsappInboundMessage.update({
        where: { providerMessageId: message.id },
        data: {
          responseMessageId: outbound.messageId,
          responseSentAt: new Date()
        }
      });
    } catch {
      await sendWhatsAppTextMessage(fromNumber, ASSISTANT_FAILURE_MESSAGE);
    }
  }

  return NextResponse.json({ ok: true, processed: messages.length });
}
