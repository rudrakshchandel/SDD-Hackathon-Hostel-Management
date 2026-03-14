import { prisma } from "@/lib/prisma";

type VacancyIntent = {
  floorNumber?: number;
};

type FloorVacancyStats = {
  floorId: string;
  floorNumber: number;
  floorLabel: string | null;
  roomsCount: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  vacantRooms: Array<{
    roomNumber: string;
    vacantBeds: number;
  }>;
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
  tenth: 10,
  eleventh: 11,
  twelfth: 12
};

function parseFloorNumber(text: string) {
  const normalized = text.toLowerCase();

  const numericMatches = [
    /(\d+)(?:st|nd|rd|th)?\s*floor/i,
    /floor\s*(\d+)(?:st|nd|rd|th)?/i
  ];
  for (const pattern of numericMatches) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }

  for (const [word, number] of Object.entries(ORDINAL_MAP)) {
    const patternA = new RegExp(`\\b${word}\\s+floor\\b`, "i");
    const patternB = new RegExp(`\\bfloor\\s+${word}\\b`, "i");
    if (patternA.test(normalized) || patternB.test(normalized)) {
      return number;
    }
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

function parseVacancyIntent(text: string): VacancyIntent | null {
  const normalized = text.toLowerCase();
  const asksVacancy =
    normalized.includes("vacancy") ||
    normalized.includes("vacant") ||
    normalized.includes("available bed") ||
    normalized.includes("beds available") ||
    normalized.includes("occupancy");

  if (!asksVacancy) return null;

  const floorNumber = parseFloorNumber(text);
  return { floorNumber };
}

function isFinanceIntent(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("finance") ||
    normalized.includes("revenue") ||
    normalized.includes("dues") ||
    normalized.includes("payment")
  );
}

function isOccupancyIntent(text: string) {
  const normalized = text.toLowerCase();
  return normalized.includes("occupancy") || normalized.includes("occupied");
}

async function fetchFloorVacancyStats(
  intent: VacancyIntent
): Promise<FloorVacancyStats[]> {
  const floors = await prisma.floor.findMany({
    where: {
      ...(intent.floorNumber !== undefined
        ? { floorNumber: intent.floorNumber }
        : {})
    },
    include: {
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
    orderBy: [{ floorNumber: "asc" }]
  });

  return floors.map((floor) => {
    const perRoom = floor.rooms.map((room) => {
      const totalBeds = room.beds.length;
      const occupiedBeds = room.beds.filter(
        (bed) => bed.allocations.length > 0
      ).length;
      return {
        roomNumber: room.roomNumber,
        totalBeds,
        occupiedBeds,
        vacantBeds: Math.max(0, totalBeds - occupiedBeds)
      };
    });

    const totalBeds = perRoom.reduce((sum, room) => sum + room.totalBeds, 0);
    const occupiedBeds = perRoom.reduce(
      (sum, room) => sum + room.occupiedBeds,
      0
    );
    const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

    return {
      floorId: floor.id,
      floorNumber: floor.floorNumber,
      floorLabel: floor.label,
      roomsCount: floor.rooms.length,
      totalBeds,
      occupiedBeds,
      vacantBeds,
      vacantRooms: perRoom
        .filter((room) => room.vacantBeds > 0)
        .map((room) => ({
          roomNumber: room.roomNumber,
          vacantBeds: room.vacantBeds
        }))
    };
  });
}

function buildDeterministicAnswer(
  stats: FloorVacancyStats[],
  intent: VacancyIntent
) {
  if (stats.length === 0) {
    return intent.floorNumber !== undefined
      ? `No floor matched floor ${intent.floorNumber}.`
      : "No floors matched your vacancy query.";
  }

  const totalBeds = stats.reduce((sum, floor) => sum + floor.totalBeds, 0);
  const occupiedBeds = stats.reduce((sum, floor) => sum + floor.occupiedBeds, 0);
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

  const header =
    stats.length === 1
      ? `Vacancy for Floor ${stats[0].floorNumber}: ${stats[0].vacantBeds}/${stats[0].totalBeds} beds vacant.`
      : `Vacancy summary: ${vacantBeds}/${totalBeds} beds vacant across ${stats.length} floor(s).`;

  const lines = stats.map((floor) => {
    const roomInfo =
      floor.vacantRooms.length > 0
        ? floor.vacantRooms
            .map((room) => `${room.roomNumber} (${room.vacantBeds})`)
            .join(", ")
        : "No vacant rooms";
    return `• Floor ${floor.floorNumber}: Vacant ${floor.vacantBeds}/${floor.totalBeds} | Rooms with vacancy: ${roomInfo}`;
  });

  return [header, ...lines].join("\n");
}

async function maybeRewriteWithAi(question: string, deterministicAnswer: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return deterministicAnswer;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: "You are a hostel operations assistant for Slack. Keep answers short and actionable. Use bullet points when useful. Do not invent data."
            }
          ]
        },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Question: ${question}\n\nStructured answer:\n${deterministicAnswer}`
              }
            ]
          }
        ]
      })
      }
    );

    if (!response.ok) return deterministicAnswer;

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const fallback = (payload.candidates || [])
      .flatMap((candidate) => candidate.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    return fallback || deterministicAnswer;
  } catch {
    return deterministicAnswer;
  }
}

async function buildFinanceAnswer() {
  const [invoiceAggregate, paymentAggregate, openInvoices] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { totalAmount: true }
    }),
    prisma.payment.aggregate({
      where: { status: "COMPLETED" },
      _sum: { amount: true }
    }),
    prisma.invoice.count({
      where: {
        status: { in: ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"] }
      }
    })
  ]);

  const invoiced = Number(invoiceAggregate._sum.totalAmount || 0);
  const collected = Number(paymentAggregate._sum.amount || 0);
  const due = Math.max(0, invoiced - collected);

  return [
    `Finance snapshot: Invoiced ₹${invoiced.toLocaleString("en-IN")}, Collected ₹${collected.toLocaleString("en-IN")}, Due ₹${due.toLocaleString("en-IN")}.`,
    `Open invoices: ${openInvoices}`
  ].join("\n");
}

async function buildOccupancyAnswer() {
  const [totalBeds, occupiedBedRows] = await Promise.all([
    prisma.bed.count(),
    prisma.allocation.findMany({
      where: {
        status: "ACTIVE",
        resident: { status: "ACTIVE" }
      },
      select: { bedId: true },
      distinct: ["bedId"]
    })
  ]);

  const occupiedBeds = occupiedBedRows.length;
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  return `Occupancy snapshot: ${occupiedBeds}/${totalBeds} beds occupied, ${vacantBeds} vacant.`;
}

export async function answerSlackQuery(question: string) {
  if (isFinanceIntent(question)) {
    const deterministicAnswer = await buildFinanceAnswer();
    return maybeRewriteWithAi(question, deterministicAnswer);
  }

  if (isOccupancyIntent(question)) {
    const deterministicAnswer = await buildOccupancyAnswer();
    return maybeRewriteWithAi(question, deterministicAnswer);
  }

  const intent = parseVacancyIntent(question);
  if (!intent) {
    return [
      "I can help with vacancy, occupancy, and finance queries.",
      'Try: "vacancy in first floor"',
      'Try: "occupancy summary"',
      'Try: "finance summary"',
      'Try: "vacancy in floor 2 block A"'
    ].join("\n");
  }

  const stats = await fetchFloorVacancyStats(intent);
  const deterministicAnswer = buildDeterministicAnswer(stats, intent);
  return maybeRewriteWithAi(question, deterministicAnswer);
}
