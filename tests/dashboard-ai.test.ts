import { describe, expect, it } from "vitest";
import {
  classifyIntent,
  parseBlockName,
  parseFloorNumber,
  parseOpenAiError,
  parseRoomSearchFilters
} from "@/lib/dashboard-ai";

describe("dashboard-ai parsing helpers", () => {
  it("classifies vacancy intents", () => {
    expect(classifyIntent("What is vacancy in block A?")).toBe("vacancy");
    expect(classifyIntent("show available beds on second floor")).toBe("vacancy");
  });

  it("classifies finance intents", () => {
    expect(classifyIntent("finance summary for hostel")).toBe("finance");
    expect(classifyIntent("payment dues for this month")).toBe("finance");
  });

  it("classifies room search intents", () => {
    expect(classifyIntent("show AC rooms under 12000")).toBe("room_search");
  });

  it("parses floor hints from numeric and ordinal phrases", () => {
    expect(parseFloorNumber("vacancy in floor 2")).toBe(2);
    expect(parseFloorNumber("vacancy in 3rd floor")).toBe(3);
    expect(parseFloorNumber("vacancy in first floor")).toBe(1);
    expect(parseFloorNumber("show rooms")).toBeUndefined();
  });

  it("parses block hints from both forms", () => {
    expect(parseBlockName("vacancy in block A")).toBe("a");
    expect(parseBlockName("vacancy in A block")).toBe("a");
    expect(parseBlockName("vacancy overall")).toBeUndefined();
  });

  it("derives room search filters from question text", () => {
    const params = parseRoomSearchFilters("Show non ac male rooms under 12000");
    expect(params.get("ac")).toBe("false");
    expect(params.get("gender")).toBe("MALE");
    expect(params.get("maxPrice")).toBe("12000");
    expect(params.get("availability")).toBe("vacant");
  });

  it("keeps default room filters for generic room query", () => {
    const params = parseRoomSearchFilters("show rooms");
    expect(params.get("ac")).toBe("any");
    expect(params.get("smoking")).toBe("any");
    expect(params.get("gender")).toBe("ANY");
  });

  it("formats provider error with status and code", () => {
    const message = parseOpenAiError(429, {
      error: {
        code: "rate_limit_exceeded",
        message: "Too many requests"
      }
    });
    expect(message).toContain("429");
    expect(message).toContain("rate_limit_exceeded");
    expect(message).toContain("Too many requests");
  });
});
