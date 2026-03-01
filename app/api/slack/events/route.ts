import { NextResponse } from "next/server";
import { answerSlackQuery } from "@/lib/slack-assistant";
import { verifySlackRequest } from "@/lib/slack";
import { isSlackEnabled } from "@/lib/feature-flags";

export const runtime = "nodejs";

type SlackEventsPayload = {
  type: string;
  challenge?: string;
  event?: {
    type?: string;
    text?: string;
    channel?: string;
    bot_id?: string;
    subtype?: string;
  };
};

async function postMessageToSlack(channel: string, text: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is not configured");
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      channel,
      text
    })
  });

  const payload = (await response.json()) as { ok?: boolean; error?: string };
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Failed to post message to Slack");
  }
}

function normalizeMentionText(text: string) {
  return text.replace(/<@[^>]+>\s*/g, "").trim();
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!isSlackEnabled()) {
    try {
      const payload = JSON.parse(rawBody) as SlackEventsPayload;
      if (payload.type === "url_verification" && payload.challenge) {
        return NextResponse.json({ challenge: payload.challenge });
      }
    } catch {
      // No-op: non-JSON requests should still receive a successful disabled response.
    }

    return NextResponse.json({
      ok: true,
      disabled: true,
      message: "Slack integration is disabled. Set SLACK_ENABLED=true to enable it."
    });
  }

  const verification = verifySlackRequest(request.headers, rawBody);

  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as SlackEventsPayload;

  if (payload.type === "url_verification" && payload.challenge) {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback") {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  if (!event || event.type !== "app_mention") {
    return NextResponse.json({ ok: true });
  }

  if (event.bot_id || event.subtype === "bot_message") {
    return NextResponse.json({ ok: true });
  }

  const channel = event.channel;
  if (!channel) {
    return NextResponse.json({ ok: true });
  }

  const query = normalizeMentionText(event.text || "");
  const answer = query
    ? await answerSlackQuery(query)
    : 'Ask me a vacancy question, for example: "vacancy in first floor".';

  await postMessageToSlack(channel, answer);
  return NextResponse.json({ ok: true });
}
