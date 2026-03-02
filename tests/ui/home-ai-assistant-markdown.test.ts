import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AssistantAnswerMarkdown } from "@/app/dashboard/home-ai-assistant";

describe("assistant markdown renderer", () => {
  it("renders markdown formatting", () => {
    const html = renderToStaticMarkup(
      React.createElement(AssistantAnswerMarkdown, {
        answer: "## Summary\n\n- **Paid**: 10\n- `Due`: 2"
      })
    );

    expect(html).toContain("<h4");
    expect(html).toContain("<strong>Paid</strong>");
    expect(html).toContain("<code");
  });
});

