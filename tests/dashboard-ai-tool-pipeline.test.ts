import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRevenueSummaryForMcp: vi.fn(),
  getVacancyByLocationForMcp: vi.fn(),
  searchRoomsForMcp: vi.fn(),
  searchRooms: vi.fn()
}));

vi.mock("@/lib/mcp/tools/revenue", () => ({
  getRevenueSummaryForMcp: mocks.getRevenueSummaryForMcp
}));

vi.mock("@/lib/mcp/tools/rooms", () => ({
  getVacancyByLocationForMcp: mocks.getVacancyByLocationForMcp,
  searchRoomsForMcp: mocks.searchRoomsForMcp
}));

vi.mock("@/lib/rooms", () => ({
  searchRooms: mocks.searchRooms
}));

function mockGeminiResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text }]
          }
        }
      ]
    })
  };
}

describe("dashboard-ai tool pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();

    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-2.5-flash";
    process.env.MCP_ENABLED = "true";
    process.env.MCP_MAX_ROWS = "100";

    mocks.getRevenueSummaryForMcp.mockResolvedValue({
      invoiced: 120000,
      collected: 90000,
      dues: 30000
    });
    mocks.getVacancyByLocationForMcp.mockResolvedValue({
      totals: {
        totalBeds: 40,
        occupiedBeds: 31,
        vacantBeds: 9
      }
    });
    mocks.searchRoomsForMcp.mockResolvedValue({
      returned: 2,
      rooms: []
    });
    mocks.searchRooms.mockResolvedValue([]);
  });

  it("uses revenue.summary tool for finance intent", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockGeminiResponse("Finance summary ready"));
    vi.stubGlobal("fetch", fetchMock);

    const { answerDashboardQuestion } = await import("@/lib/dashboard-ai");
    const result = await answerDashboardQuestion("Finance summary for hostel");

    expect(result.answer).toContain("Finance summary");
    expect(mocks.getRevenueSummaryForMcp).toHaveBeenCalledTimes(1);
    expect(mocks.getVacancyByLocationForMcp).not.toHaveBeenCalled();
    expect(mocks.searchRoomsForMcp).not.toHaveBeenCalled();

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const promptText = requestBody.contents?.[0]?.parts?.[0]?.text as string;
    expect(promptText).toContain('"source":"tool_pipeline"');
    expect(promptText).toContain('"name":"revenue.summary"');
  });

  it("uses vacancy and room tools for vacancy/room intents", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockGeminiResponse("Vacancy summary"))
      .mockResolvedValueOnce(mockGeminiResponse("Room search summary"));
    vi.stubGlobal("fetch", fetchMock);

    const { answerDashboardQuestion } = await import("@/lib/dashboard-ai");

    await answerDashboardQuestion("What's vacancy in block A first floor?");
    await answerDashboardQuestion("Show AC rooms under 12000");

    expect(mocks.getVacancyByLocationForMcp).toHaveBeenCalledWith(
      { block: "a", floor: 1 },
      100
    );
    expect(mocks.searchRoomsForMcp).toHaveBeenCalledWith(
      expect.objectContaining({ ac: true, maxPrice: 12000, availability: "vacant" }),
      100
    );

    expect(mocks.searchRooms).not.toHaveBeenCalled();
  });
});
