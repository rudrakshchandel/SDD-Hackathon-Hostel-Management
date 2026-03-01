import { prisma } from "@/lib/prisma";
import { searchRooms } from "@/lib/rooms";

export type AssistantIntent = "vacancy" | "finance" | "room_search" | "general";

type AiResponsePayload = {
  output_text?: string;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

type OpenAiRequestBody = {
  model: string;
  input: Array<{
    role: "system" | "user";
    content: string;
  }>;
  stream?: boolean;
};

const ORDINAL_MAP: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10
};

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function parseFloorNumber(text: string) {
  const normalized = text.toLowerCase();

  const numericMatches = [
    /(\d+)(?:st|nd|rd|th)?\s*floor/i,
    /floor\s*(\d+)(?:st|nd|rd|th)?/i
  ];
  for (const pattern of numericMatches) {
    const match = normalized.match(pattern);
    if (match?.[1]) return Number(match[1]);
  }

  for (const [word, number] of Object.entries(ORDINAL_MAP)) {
    const patternA = new RegExp(`\\b${word}\\s+floor\\b`, "i");
    const patternB = new RegExp(`\\bfloor\\s+${word}\\b`, "i");
    if (patternA.test(normalized) || patternB.test(normalized)) return number;
  }

  return undefined;
}

function parseBlockName(text: string) {
  const normalized = text.toLowerCase();
  const matchA = normalized.match(/\bblock\s+([a-z0-9-]+)/i);
  if (matchA?.[1]) return matchA[1];

  const matchB = normalized.match(/\b([a-z0-9-]+)\s+block\b/i);
  if (matchB?.[1]) return matchB[1];

  return undefined;
}

function classifyIntent(question: string): AssistantIntent {
  const normalized = question.toLowerCase();
  if (
    normalized.includes("vacancy") ||
    normalized.includes("vacant") ||
    normalized.includes("occupancy") ||
    normalized.includes("available bed")
  ) {
    return "vacancy";
  }

  if (
    normalized.includes("finance") ||
    normalized.includes("revenue") ||
    normalized.includes("dues") ||
    normalized.includes("invoice") ||
    normalized.includes("payment")
  ) {
    return "finance";
  }

  if (
    normalized.includes("room") ||
    normalized.includes("price") ||
    normalized.includes("ac") ||
    normalized.includes("search")
  ) {
    return "room_search";
  }

  return "general";
}

function parseRoomSearchFilters(question: string) {
  const normalized = question.toLowerCase();
  const params = new URLSearchParams();
  params.set("availability", "vacant");
  params.set("ac", "any");
  params.set("smoking", "any");
  params.set("gender", "ANY");

  if (normalized.includes("non ac") || normalized.includes("non-ac")) {
    params.set("ac", "false");
  } else if (normalized.includes("ac")) {
    params.set("ac", "true");
  }

  if (normalized.includes("non smoking") || normalized.includes("no smoking")) {
    params.set("smoking", "false");
  } else if (normalized.includes("smoking")) {
    params.set("smoking", "true");
  }

  if (normalized.includes("male")) params.set("gender", "MALE");
  if (normalized.includes("female")) params.set("gender", "FEMALE");

  const maxBudget = normalized.match(
    /(?:under|below|less than|max(?:imum)?|<=?)\s*₹?\s*(\d{3,6})/i
  );
  if (maxBudget?.[1]) params.set("maxPrice", maxBudget[1]);

  const minBudget = normalized.match(
    /(?:above|over|more than|min(?:imum)?|>=?)\s*₹?\s*(\d{3,6})/i
  );
  if (minBudget?.[1]) params.set("minPrice", minBudget[1]);

  return params;
}

async function buildDashboardContext(question: string) {
  const [hostel, totalBeds, occupiedBedRows, invoiceAggregate, paymentAggregate] =
    await Promise.all([
      prisma.hostel.findFirst({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          address: true,
          contactNumber: true,
          timezone: true,
          status: true
        }
      }),
      prisma.bed.count(),
      prisma.allocation.findMany({
        where: {
          status: "ACTIVE",
          resident: { status: "ACTIVE" }
        },
        select: { bedId: true },
        distinct: ["bedId"]
      }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true }
      })
    ]);

  const occupiedBeds = occupiedBedRows.length;
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const invoiced = toNumber(invoiceAggregate._sum.totalAmount);
  const collected = toNumber(paymentAggregate._sum.amount);
  const dues = Math.max(0, invoiced - collected);

  const floorHint = parseFloorNumber(question);
  const blockHint = parseBlockName(question);
  const floors = await prisma.floor.findMany({
    where: {
      ...(floorHint !== undefined ? { floorNumber: floorHint } : {}),
      ...(blockHint
        ? {
            block: {
              name: {
                contains: blockHint,
                mode: "insensitive"
              }
            }
          }
        : {})
    },
    include: {
      block: { select: { name: true } },
      rooms: {
        include: {
          beds: {
            include: {
              allocations: {
                where: {
                  status: "ACTIVE",
                  resident: { status: "ACTIVE" }
                },
                select: { id: true }
              }
            }
          }
        }
      }
    },
    orderBy: [{ block: { name: "asc" } }, { floorNumber: "asc" }],
    take: 6
  });

  const floorVacancy = floors.map((floor) => {
    const totalBedsForFloor = floor.rooms.reduce(
      (sum, room) => sum + room.beds.length,
      0
    );
    const occupiedBedsForFloor = floor.rooms.reduce(
      (sum, room) =>
        sum + room.beds.filter((bed) => bed.allocations.length > 0).length,
      0
    );
    return {
      block: floor.block.name,
      floorNumber: floor.floorNumber,
      totalBeds: totalBedsForFloor,
      occupiedBeds: occupiedBedsForFloor,
      vacantBeds: Math.max(0, totalBedsForFloor - occupiedBedsForFloor)
    };
  });

  const roomFilters = parseRoomSearchFilters(question);
  const roomMatches = (await searchRooms(roomFilters)).slice(0, 8).map((room) => ({
    roomNumber: room.roomNumber,
    block: room.block.name,
    floorNumber: room.floor.floorNumber,
    sharingType: room.sharingType,
    vacantBeds: room.counts.vacantBeds,
    basePrice: room.basePrice
  }));

  return {
    hostel,
    occupancy: {
      totalBeds,
      occupiedBeds,
      vacantBeds
    },
    finance: {
      invoiced,
      collected,
      dues
    },
    floorVacancy,
    roomMatches
  };
}

async function askChatGpt(question: string, intent: AssistantIntent, context: unknown) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: openAiHeaders(),
    body: JSON.stringify(
      buildOpenAiRequestBody({
        question,
        intent,
        context
      })
    )
  });

  const payload = (await response.json()) as AiResponsePayload;

  if (!response.ok) {
    throw new Error(parseOpenAiError(response.status, payload));
  }

  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const fallback = (payload.output || [])
    .flatMap((entry) => entry.content || [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text as string)
    .join("\n")
    .trim();

  if (!fallback) {
    throw new Error("OpenAI returned an empty response.");
  }

  return fallback;
}

export async function answerDashboardQuestion(question: string) {
  const intent = classifyIntent(question);
  const context = await buildDashboardContext(question);
  const answer = await askChatGpt(question, intent, context);

  return {
    intent,
    answer,
    source: "ai"
  };
}

function getRequiredApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to .env and restart the dev server."
    );
  }
  return apiKey;
}

function openAiHeaders() {
  return {
    Authorization: `Bearer ${getRequiredApiKey()}`,
    "Content-Type": "application/json"
  };
}

function buildOpenAiRequestBody({
  question,
  intent,
  context,
  stream = false
}: {
  question: string;
  intent: AssistantIntent;
  context: unknown;
  stream?: boolean;
}): OpenAiRequestBody {
  return {
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    stream,
    input: [
      {
        role: "system",
        content:
          "You are the hostel management AI assistant. Answer only from provided context data. Be concise, practical, and clear. Mention INR as ₹. If data is missing, explicitly say what is missing."
      },
      {
        role: "user",
        content: [
          `Intent guess: ${intent}`,
          `Question: ${question}`,
          `Context JSON: ${JSON.stringify(context)}`
        ].join("\n\n")
      }
    ]
  };
}

export function parseOpenAiError(status: number, payload: AiResponsePayload) {
  const errText =
    payload.error?.message || payload.output_text || "OpenAI request failed";
  const errCode = payload.error?.code ? ` [${payload.error.code}]` : "";
  return `OpenAI error (${status})${errCode}: ${errText}`;
}

export async function buildDashboardAiRequest(question: string, stream = false) {
  const intent = classifyIntent(question);
  const context = await buildDashboardContext(question);
  return {
    intent,
    headers: openAiHeaders(),
    body: buildOpenAiRequestBody({
      question,
      intent,
      context,
      stream
    })
  };
}
