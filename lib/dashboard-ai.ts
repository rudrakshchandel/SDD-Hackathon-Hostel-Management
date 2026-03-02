import { prisma } from "@/lib/prisma";
import { searchRooms } from "@/lib/rooms";

export type AssistantIntent = "vacancy" | "finance" | "room_search" | "general";

type GeminiResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    status?: string;
    code?: string | number;
  };
};

type GeminiRequestBody = {
  systemInstruction: {
    parts: Array<{
      text: string;
    }>;
  };
  contents: Array<{
    role: "user";
    parts: Array<{
      text: string;
    }>;
  }>;
};

type TableSnapshot<T> = {
  total: number;
  returned: number;
  truncated: boolean;
  rows: T[];
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

const DB_CONTEXT_ROW_LIMIT = Number(process.env.AI_CONTEXT_ROW_LIMIT || 80);
const DB_CONTEXT_CACHE_TTL_MS = 20_000;

type CachedDbSnapshot = {
  at: number;
  data: Awaited<ReturnType<typeof buildDatabaseSnapshot>>;
};

let cachedDbSnapshot: CachedDbSnapshot | null = null;

export function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function tableSnapshot<T>(rows: T[], total: number): TableSnapshot<T> {
  return {
    total,
    returned: rows.length,
    truncated: rows.length < total,
    rows
  };
}

export function parseFloorNumber(text: string) {
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

export function parseBlockName(text: string) {
  const normalized = text.toLowerCase();
  const matchA = normalized.match(/\bblock\s+([a-z0-9-]+)/i);
  if (matchA?.[1]) return matchA[1];

  const matchB = normalized.match(/\b([a-z0-9-]+)\s+block\b/i);
  if (matchB?.[1]) return matchB[1];

  return undefined;
}

export function classifyIntent(question: string): AssistantIntent {
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

export function parseRoomSearchFilters(question: string) {
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

async function buildDatabaseSnapshot() {
  const limit = Math.max(20, Math.min(250, DB_CONTEXT_ROW_LIMIT));

  const [
    hostelTotal,
    blockTotal,
    floorTotal,
    roomTotal,
    bedTotal,
    residentTotal,
    allocationTotal,
    invoiceTotal,
    paymentTotal,
    complaintTotal,
    noticeTotal,
    hostels,
    blocks,
    floors,
    rooms,
    beds,
    residents,
    allocations,
    invoices,
    payments,
    complaints,
    notices
  ] = await Promise.all([
    prisma.hostel.count(),
    prisma.block.count(),
    prisma.floor.count(),
    prisma.room.count(),
    prisma.bed.count(),
    prisma.resident.count(),
    prisma.allocation.count(),
    prisma.invoice.count(),
    prisma.payment.count(),
    prisma.complaint.count(),
    prisma.notice.count(),
    prisma.hostel.findMany({
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        name: true,
        address: true,
        contactNumber: true,
        timezone: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    }),
    prisma.block.findMany({
      orderBy: [{ name: "asc" }],
      take: limit,
      select: {
        id: true,
        hostelId: true,
        name: true,
        description: true,
        createdAt: true
      }
    }),
    prisma.floor.findMany({
      orderBy: [{ floorNumber: "asc" }],
      take: limit,
      select: {
        id: true,
        blockId: true,
        floorNumber: true,
        label: true,
        createdAt: true
      }
    }),
    prisma.room.findMany({
      where: { status: { not: "INACTIVE" } },
      orderBy: [{ roomNumber: "asc" }],
      take: limit,
      select: {
        id: true,
        floorId: true,
        roomNumber: true,
        sharingType: true,
        genderRestriction: true,
        status: true,
        basePrice: true,
        attributes: true,
        createdAt: true
      }
    }),
    prisma.bed.findMany({
      orderBy: [{ bedNumber: "asc" }],
      take: limit,
      select: {
        id: true,
        roomId: true,
        bedNumber: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.resident.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        fullName: true,
        gender: true,
        status: true,
        contact: true,
        email: true,
        idProofType: true,
        idProofNumber: true,
        createdAt: true
      }
    }),
    prisma.allocation.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        residentId: true,
        bedId: true,
        status: true,
        startDate: true,
        endDate: true,
        notes: true,
        createdAt: true
      }
    }),
    prisma.invoice.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        residentId: true,
        allocationId: true,
        periodStart: true,
        periodEnd: true,
        totalAmount: true,
        dueDate: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.payment.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        invoiceId: true,
        residentId: true,
        amount: true,
        method: true,
        status: true,
        reference: true,
        receivedAt: true,
        createdAt: true
      }
    }),
    prisma.complaint.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        residentId: true,
        hostelId: true,
        roomId: true,
        category: true,
        title: true,
        description: true,
        status: true,
        resolutionNotes: true,
        createdAt: true,
        closedAt: true
      }
    }),
    prisma.notice.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        hostelId: true,
        title: true,
        body: true,
        audience: true,
        status: true,
        publishedAt: true,
        createdAt: true
      }
    })
  ]);

  const schema = {
    hostel: [
      "id",
      "name",
      "address",
      "contactNumber",
      "timezone",
      "status",
      "createdAt",
      "updatedAt"
    ],
    block: ["id", "hostelId", "name", "description", "createdAt"],
    floor: ["id", "blockId", "floorNumber", "label", "createdAt"],
    room: [
      "id",
      "floorId",
      "roomNumber",
      "sharingType",
      "genderRestriction",
      "status",
      "basePrice",
      "attributes",
      "createdAt"
    ],
    bed: ["id", "roomId", "bedNumber", "status", "createdAt"],
    resident: [
      "id",
      "fullName",
      "gender",
      "status",
      "contact",
      "email",
      "idProofType",
      "idProofNumber",
      "createdAt"
    ],
    allocation: [
      "id",
      "residentId",
      "bedId",
      "status",
      "startDate",
      "endDate",
      "notes",
      "createdAt"
    ],
    invoice: [
      "id",
      "residentId",
      "allocationId",
      "periodStart",
      "periodEnd",
      "totalAmount",
      "dueDate",
      "status",
      "createdAt"
    ],
    payment: [
      "id",
      "invoiceId",
      "residentId",
      "amount",
      "method",
      "status",
      "reference",
      "receivedAt",
      "createdAt"
    ],
    complaint: [
      "id",
      "residentId",
      "hostelId",
      "roomId",
      "category",
      "title",
      "description",
      "status",
      "resolutionNotes",
      "createdAt",
      "closedAt"
    ],
    notice: [
      "id",
      "hostelId",
      "title",
      "body",
      "audience",
      "status",
      "publishedAt",
      "createdAt"
    ]
  };

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      rowLimitPerTable: limit
    },
    schema,
    tables: {
      hostel: tableSnapshot(hostels, hostelTotal),
      block: tableSnapshot(blocks, blockTotal),
      floor: tableSnapshot(floors, floorTotal),
      room: tableSnapshot(rooms, roomTotal),
      bed: tableSnapshot(beds, bedTotal),
      resident: tableSnapshot(residents, residentTotal),
      allocation: tableSnapshot(allocations, allocationTotal),
      invoice: tableSnapshot(invoices, invoiceTotal),
      payment: tableSnapshot(payments, paymentTotal),
      complaint: tableSnapshot(complaints, complaintTotal),
      notice: tableSnapshot(notices, noticeTotal)
    }
  };
}

async function getDatabaseSnapshotCached() {
  const now = Date.now();
  if (cachedDbSnapshot && now - cachedDbSnapshot.at <= DB_CONTEXT_CACHE_TTL_MS) {
    return cachedDbSnapshot.data;
  }
  const data = await buildDatabaseSnapshot();
  cachedDbSnapshot = { at: now, data };
  return data;
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
  const roomMatches = (await searchRooms(roomFilters)).slice(0, 20).map((room) => ({
    roomNumber: room.roomNumber,
    block: room.block.name,
    floorNumber: room.floor.floorNumber,
    sharingType: room.sharingType,
    vacantBeds: room.counts.vacantBeds,
    basePrice: room.basePrice,
    attributes: room.attributes
  }));

  const database = await getDatabaseSnapshotCached();

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
    roomMatches,
    database
  };
}

async function askModel(question: string, intent: AssistantIntent, context: unknown) {
  const response = await fetch(getGeminiEndpoint(false), {
    method: "POST",
    headers: geminiHeaders(),
    body: JSON.stringify(
      buildGeminiRequestBody({
        question,
        intent,
        context
      })
    )
  });

  const payload = (await response.json()) as GeminiResponsePayload;

  if (!response.ok) {
    throw new Error(parseOpenAiError(response.status, payload));
  }

  const text = extractGeminiText(payload);
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

export async function answerDashboardQuestion(question: string) {
  const intent = classifyIntent(question);
  const context = await buildDashboardContext(question);
  const answer = await askModel(question, intent, context);

  return {
    intent,
    answer,
    source: "ai"
  };
}

function getRequiredApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env and restart the dev server."
    );
  }
  return apiKey;
}

function geminiHeaders() {
  return {
    "x-goog-api-key": getRequiredApiKey(),
    "Content-Type": "application/json"
  };
}

function getGeminiEndpoint(stream: boolean) {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:${action}`;
}

function buildGeminiRequestBody({
  question,
  intent,
  context
}: {
  question: string;
  intent: AssistantIntent;
  context: unknown;
}): GeminiRequestBody {
  return {
    systemInstruction: {
      parts: [
        {
          text: "You are the hostel management AI assistant. Answer only from provided context data. Be concise, practical, and clear. Mention INR as ₹. If data is missing, explicitly say what is missing."
        }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              `Intent guess: ${intent}`,
              `Question: ${question}`,
              `Context JSON: ${JSON.stringify(context)}`
            ].join("\n\n")
          }
        ]
      }
    ]
  };
}

function extractGeminiText(payload: GeminiResponsePayload) {
  return (payload.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
}

export function parseOpenAiError(status: number, payload: GeminiResponsePayload) {
  const errText =
    payload.error?.message || extractGeminiText(payload) || "Gemini request failed";
  const errCode = payload.error?.code ? ` [${payload.error.code}]` : "";
  return `Gemini error (${status})${errCode}: ${errText}`;
}

export async function buildDashboardAiRequest(question: string, stream = false) {
  const intent = classifyIntent(question);
  const context = await buildDashboardContext(question);
  return {
    url: getGeminiEndpoint(stream),
    intent,
    headers: geminiHeaders(),
    body: buildGeminiRequestBody({
      question,
      intent,
      context
    })
  };
}
