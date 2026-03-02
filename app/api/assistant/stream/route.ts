import { NextResponse } from "next/server";
import {
  buildDashboardAiRequest,
  parseOpenAiError
} from "@/lib/dashboard-ai";

export const runtime = "nodejs";

type OpenAiStreamEvent = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function extractDelta(event: OpenAiStreamEvent) {
  const text = (event.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("");
  return text || null;
}

function sse(data: unknown) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = (body.query || "").trim();
    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const aiRequest = await buildDashboardAiRequest(query, true);

    const upstream = await fetch(aiRequest.url, {
      method: "POST",
      headers: aiRequest.headers,
      body: JSON.stringify(aiRequest.body)
    });

    if (!upstream.ok) {
      const payload = (await upstream.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
        error?: { message?: string; code?: string };
      };
      return NextResponse.json(
        { error: parseOpenAiError(upstream.status, payload) },
        { status: upstream.status }
      );
    }

    if (!upstream.body) {
      return NextResponse.json(
        { error: "Gemini stream was empty." },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = upstream.body.getReader();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const push = (payload: unknown) => {
          controller.enqueue(encoder.encode(sse(payload)));
        };

        push({
          type: "meta",
          intent: aiRequest.intent
        });

        let buffer = "";

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line.startsWith("data:")) continue;

                const jsonText = line.slice(5).trim();
                if (!jsonText || jsonText === "[DONE]") {
                  continue;
                }

                let event: OpenAiStreamEvent | null = null;
                try {
                  event = JSON.parse(jsonText) as OpenAiStreamEvent;
                } catch {
                  continue;
                }

                if (event.error?.message) {
                  push({ type: "error", error: event.error.message });
                  continue;
                }

                const delta = extractDelta(event);
                if (delta) {
                  push({ type: "delta", text: delta });
                }
              }
            }

            push({ type: "done" });
            controller.close();
          } catch (error) {
            push({
              type: "error",
              error:
                error instanceof Error
                  ? error.message
                  : "Streaming failed unexpectedly."
            });
            controller.close();
          } finally {
            reader.releaseLock();
          }
        };

        void pump();
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start assistant stream"
      },
      { status: 500 }
    );
  }
}
