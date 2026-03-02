import { NextResponse } from "next/server";
import {
  answerDashboardQuestion,
  sanitizeAssistantQuery
} from "@/lib/dashboard-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = (body.query || "").trim();
    const sanitized = sanitizeAssistantQuery(query);
    if (!sanitized.ok) {
      return NextResponse.json(
        { error: sanitized.reason },
        { status: 400 }
      );
    }

    const result = await answerDashboardQuestion(sanitized.value);
    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to process assistant query"
      },
      { status: 500 }
    );
  }
}
