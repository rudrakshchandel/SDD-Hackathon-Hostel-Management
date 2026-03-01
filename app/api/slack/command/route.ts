import { NextResponse } from "next/server";
import { answerSlackQuery } from "@/lib/slack-assistant";
import { verifySlackRequest } from "@/lib/slack";
import { isSlackEnabled } from "@/lib/feature-flags";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSlackEnabled()) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Slack integration is currently disabled. Set SLACK_ENABLED=true to enable it."
    });
  }

  const rawBody = await request.text();
  const verification = verifySlackRequest(request.headers, rawBody);

  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const text = (params.get("text") || "").trim();
  const command = params.get("command") || "/hostel";

  if (!text) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: [
        "Please add a question after the command.",
        `Example: ${command} vacancy in first floor`
      ].join("\n")
    });
  }

  try {
    const answer = await answerSlackQuery(text);
    return NextResponse.json({
      response_type: "ephemeral",
      text: answer
    });
  } catch {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "I could not process that right now. Please try again."
    });
  }
}
