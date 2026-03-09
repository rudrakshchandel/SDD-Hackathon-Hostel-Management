import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isWhatsAppEnabled } from "@/lib/feature-flags";
import { parseWhatsAppAllowlist, normalizeWhatsAppNumber, isWhatsAppNumberAllowed, formatWhatsAppText } from "@/lib/whatsapp";
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
const ACKNOWLEDGE_MESSAGE = "Got your message. I am checking this now.";
const ASSISTANT_FAILURE_MESSAGE =
  "I could not process that right now. Please try again in a moment.";

function maskPhoneNumber(number: string) {
  const compact = number.replace(/[^\d+]/g, "");
  if (compact.length <= 4) return compact;
  return `${compact.slice(0, 3)}***${compact.slice(-2)}`;
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function createWebhookHit(params: {
  method: string;
  url: string;
  hasSignature: boolean;
  payloadText: string | null;
}) {
  try {
    const record = await prisma.whatsappWebhookHit.create({
      data: {
        method: params.method,
        url: params.url,
        hasSignature: params.hasSignature,
        payloadText: params.payloadText
      }
    });
    return record.id;
  } catch (error) {
    console.error("[wa-webhook] failed to persist webhook hit create", {
      method: params.method,
      error: toErrorMessage(error)
    });
    return null;
  }
}

async function finalizeWebhookHit(
  hitId: string | null,
  params: {
    statusCode: number;
    outcome: string;
    messageCount?: number;
    processedCount?: number;
    error?: string;
  }
) {
  if (!hitId) return;
  try {
    await prisma.whatsappWebhookHit.update({
      where: { id: hitId },
      data: {
        statusCode: params.statusCode,
        outcome: params.outcome,
        messageCount: params.messageCount,
        processedCount: params.processedCount,
        error: params.error || null
      }
    });
  } catch (error) {
    console.error("[wa-webhook] failed to persist webhook hit update", {
      hitId,
      error: toErrorMessage(error)
    });
  }
}

function extractInboundTextMessages(payload: WhatsAppWebhookPayload) {
  return (payload.entry || [])
    .flatMap((entry) => entry.changes || [])
    .flatMap((change) => change.value?.messages || [])
    .filter((message) => message.type === "text" && Boolean(message.id && message.from));
}

export async function GET(request: Request) {
  const hitId = await createWebhookHit({
    method: "GET",
    url: request.url,
    hasSignature: false,
    payloadText: null
  });

  if (!isWhatsAppEnabled()) {
    console.info("[wa-webhook] GET ignored because integration is disabled");
    await finalizeWebhookHit(hitId, {
      statusCode: 200,
      outcome: "disabled"
    });
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

  console.info("[wa-webhook] GET verification attempt", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge)
  });

  if (mode === "subscribe" && challenge && token && token === expectedToken) {
    console.info("[wa-webhook] GET verification success");
    await finalizeWebhookHit(hitId, {
      statusCode: 200,
      outcome: "verification_success"
    });
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  console.warn("[wa-webhook] GET verification failed", {
    mode,
    hasToken: Boolean(token),
    hasChallenge: Boolean(challenge)
  });
  await finalizeWebhookHit(hitId, {
    statusCode: 403,
    outcome: "verification_failed"
  });
  return NextResponse.json({ error: "Webhook verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const hasSignature = Boolean(request.headers.get("x-hub-signature-256"));
  const hitId = await createWebhookHit({
    method: "POST",
    url: request.url,
    hasSignature,
    payloadText: rawBody
  });

  console.info("[wa-webhook] POST received", {
    bodyLength: rawBody.length,
    hasSignature
  });

  if (!isWhatsAppEnabled()) {
    console.info("[wa-webhook] POST ignored because integration is disabled");
    await finalizeWebhookHit(hitId, {
      statusCode: 200,
      outcome: "disabled"
    });
    return NextResponse.json({
      ok: true,
      disabled: true,
      message: "WhatsApp integration is disabled. Set WHATSAPP_ENABLED=true to enable it."
    });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    console.warn("[wa-webhook] invalid JSON payload");
    await finalizeWebhookHit(hitId, {
      statusCode: 400,
      outcome: "invalid_json",
      error: "Invalid WhatsApp webhook payload"
    });
    return NextResponse.json({ error: "Invalid WhatsApp webhook payload" }, { status: 400 });
  }

  const allowlist = parseWhatsAppAllowlist();
  const messages = extractInboundTextMessages(payload);
  console.info("[wa-webhook] parsed inbound text messages", {
    messageCount: messages.length
  });

  if (messages.length === 0) {
    console.warn("[wa-webhook] no inbound text messages in payload");
    await finalizeWebhookHit(hitId, {
      statusCode: 200,
      outcome: "empty_payload",
      messageCount: 0,
      processedCount: 0,
      error: "Webhook payload is empty or has no supported inbound text messages"
    });
    return NextResponse.json({
      ok: true,
      processed: 0,
      ack: "Webhook received, but payload is empty for inbound text messages."
    });
  }

  let processedCount = 0;

  for (const message of messages) {
    processedCount += 1;
    const fromNumber = normalizeWhatsAppNumber(message.from || "");
    if (!fromNumber || !message.id) continue;

    console.info("[wa-webhook] processing inbound message", {
      providerMessageId: message.id,
      fromNumber: maskPhoneNumber(fromNumber)
    });

    if (!isWhatsAppNumberAllowed(fromNumber, allowlist)) {
      console.warn("[wa-webhook] sender not allowlisted", {
        providerMessageId: message.id,
        fromNumber: maskPhoneNumber(fromNumber)
      });
      await sendWhatsAppTextMessage(fromNumber, ACCESS_DENIED_MESSAGE);
      continue;
    }

    const rate = checkRateLimitByKey(`whatsapp:${fromNumber}`, {
      maxAttempts: 10,
      windowMs: 60_000
    });

    if (!rate.allowed) {
      console.warn("[wa-webhook] rate limit hit", {
        providerMessageId: message.id,
        fromNumber: maskPhoneNumber(fromNumber),
        retryAfterSeconds: rate.retryAfterSeconds
      });
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
        console.info("[wa-webhook] duplicate provider message ignored", {
          providerMessageId: message.id
        });
        continue;
      }
      throw error;
    }

    await sendWhatsAppTextMessage(fromNumber, ACKNOWLEDGE_MESSAGE);
    console.info("[wa-webhook] ack sent", {
      providerMessageId: message.id,
      to: maskPhoneNumber(fromNumber)
    });

    const queryText = (message.text?.body || "").trim();
    const sanitized = sanitizeAssistantQuery(queryText);

    if (!sanitized.ok) {
      console.warn("[wa-webhook] query rejected by sanitizer", {
        providerMessageId: message.id,
        reason: sanitized.reason
      });
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
      console.info("[wa-webhook] final response sent", {
        providerMessageId: message.id,
        responseMessageId: outbound.messageId
      });
    } catch {
      console.error("[wa-webhook] assistant pipeline failed", {
        providerMessageId: message.id
      });
      await sendWhatsAppTextMessage(fromNumber, ASSISTANT_FAILURE_MESSAGE);
    }
  }

  console.info("[wa-webhook] request completed", { processed: processedCount });
  await finalizeWebhookHit(hitId, {
    statusCode: 200,
    outcome: "processed",
    messageCount: messages.length,
    processedCount
  });
  return NextResponse.json({ ok: true, processed: processedCount });
}
