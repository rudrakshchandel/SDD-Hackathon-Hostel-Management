"use client";

import { FormEvent, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type AssistantResponse = {
  intent: "vacancy" | "finance" | "room_search" | "general";
  answer: string;
};

type StreamEvent =
  | { type: "meta"; intent: AssistantResponse["intent"] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; error: string };

const quickPrompts = [
  "What's vacancy in first floor?",
  "Show AC rooms under 12000",
  "Finance summary for hostel",
  "Vacancy in block A floor 2"
];

export default function HomeAiAssistant() {
  const [query, setQuery] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AssistantResponse | null>(null);
  const answerText = result?.answer?.trim() ?? "";

  const lastQuestion = useMemo(() => askedQuestion.trim(), [askedQuestion]);

  async function askAssistant(question: string) {
    setLoading(true);
    setError(null);
    setResult({ intent: "general", answer: "" });

    try {
      const response = await fetch("/api/assistant/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: question })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Assistant request failed");
      }

      if (!response.body) {
        throw new Error("No stream returned from assistant.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let intent: AssistantResponse["intent"] = "general";
      let answer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const rawEvent of events) {
          const dataLines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trim());

          if (dataLines.length === 0) continue;
          const data = dataLines.join("\n");

          let event: StreamEvent | null = null;
          try {
            event = JSON.parse(data) as StreamEvent;
          } catch {
            continue;
          }

          if (event.type === "meta") {
            intent = event.intent;
            setResult({ intent, answer });
            continue;
          }

          if (event.type === "delta") {
            answer += event.text;
            setResult({ intent, answer });
            continue;
          }

          if (event.type === "error") {
            setError(event.error);
            continue;
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = query.trim();
    if (!text) return;
    setAskedQuestion(text);
    setQuery("");
    await askAssistant(text);
  }

  return (
    <section className="glass-panel space-y-4 p-4">
      <div>
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <p className="text-sm text-slate-600">
          Ask in natural language for room search, vacancy, or finance details.
        </p>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. What's vacancy in first floor?"
          className="flex-1"
        />
        <button
          type="submit"
          className="glass-btn-primary rounded-xl px-4 py-2 disabled:opacity-60"
          disabled={loading || !query.trim()}
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span>Thinking</span>
              <span className="inline-flex gap-1">
                <span className="glass-loader-dot" style={{ animationDelay: "0ms" }} />
                <span className="glass-loader-dot" style={{ animationDelay: "140ms" }} />
                <span className="glass-loader-dot" style={{ animationDelay: "280ms" }} />
              </span>
            </span>
          ) : (
            "Ask AI"
          )}
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            className="glass-card rounded-lg px-3 py-1.5 text-xs text-slate-700"
            onClick={() => {
              setAskedQuestion(prompt);
              setQuery(prompt);
              void askAssistant(prompt);
            }}
            disabled={loading}
          >
            {prompt}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !answerText ? (
        <div className="glass-loader space-y-3 p-3">
          <div className="glass-loader-line w-2/5" />
          <div className="glass-loader-line w-full" />
          <div className="glass-loader-line w-5/6" />
          <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex gap-1">
              <span className="glass-loader-dot" style={{ animationDelay: "0ms" }} />
              <span className="glass-loader-dot" style={{ animationDelay: "120ms" }} />
              <span className="glass-loader-dot" style={{ animationDelay: "240ms" }} />
            </span>
            Generating response...
          </div>
        </div>
      ) : null}

      {result && answerText ? (
        <div className="glass-card whitespace-pre-line rounded-xl p-3 text-sm text-slate-800">
          {lastQuestion ? (
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              Question: {lastQuestion}
            </p>
          ) : null}
          {answerText}
          {loading ? (
            <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-slate-400 align-middle" />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
