import { prisma } from "@/lib/prisma";

type VacancyIntent = {
  floorNumber?: number;
  blockName?: string;
};

type FloorVacancyStats = {
  floorId: string;
  floorNumber: number;
  floorLabel: string | null;
  blockName: string;
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
  const blockName = parseBlockName(text);
  return { floorNumber, blockName };
}

async function fetchFloorVacancyStats(
  intent: VacancyIntent
): Promise<FloorVacancyStats[]> {
  const floors = await prisma.floor.findMany({
    where: {
      ...(intent.floorNumber !== undefined
        ? { floorNumber: intent.floorNumber }
        : {}),
      ...(intent.blockName
        ? {
            block: {
              name: {
                contains: intent.blockName,
                mode: "insensitive"
              }
            }
          }
        : {})
    },
    include: {
      block: {
        select: { name: true }
      },
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
    orderBy: [{ block: { name: "asc" } }, { floorNumber: "asc" }]
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
      blockName: floor.block.name,
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
      ? `No floor matched floor ${intent.floorNumber}${intent.blockName ? ` in block ${intent.blockName}` : ""}.`
      : "No floors matched your vacancy query.";
  }

  const totalBeds = stats.reduce((sum, floor) => sum + floor.totalBeds, 0);
  const occupiedBeds = stats.reduce((sum, floor) => sum + floor.occupiedBeds, 0);
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);

  const header =
    stats.length === 1
      ? `Vacancy for Floor ${stats[0].floorNumber} (${stats[0].blockName}): ${stats[0].vacantBeds}/${stats[0].totalBeds} beds vacant.`
      : `Vacancy summary: ${vacantBeds}/${totalBeds} beds vacant across ${stats.length} floor(s).`;

  const lines = stats.map((floor) => {
    const roomInfo =
      floor.vacantRooms.length > 0
        ? floor.vacantRooms
            .map((room) => `${room.roomNumber} (${room.vacantBeds})`)
            .join(", ")
        : "No vacant rooms";
    return `• ${floor.blockName} / Floor ${floor.floorNumber}: Vacant ${floor.vacantBeds}/${floor.totalBeds} | Rooms with vacancy: ${roomInfo}`;
  });

  return [header, ...lines].join("\n");
}

async function maybeRewriteWithAi(question: string, deterministicAnswer: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return deterministicAnswer;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are a hostel operations assistant for Slack. Keep answers short and actionable. Use bullet points when useful. Do not invent data."
          },
          {
            role: "user",
            content: `Question: ${question}\n\nStructured answer:\n${deterministicAnswer}`
          }
        ]
      })
    });

    if (!response.ok) return deterministicAnswer;

    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }>;
    };

    if (payload.output_text?.trim()) {
      return payload.output_text.trim();
    }

    const fallback = (payload.output || [])
      .flatMap((block) => block.content || [])
      .filter((item) => item.type === "output_text" && item.text)
      .map((item) => item.text as string)
      .join("\n")
      .trim();

    return fallback || deterministicAnswer;
  } catch {
    return deterministicAnswer;
  }
}

export async function answerSlackQuery(question: string) {
  const intent = parseVacancyIntent(question);
  if (!intent) {
    return [
      "I can help with vacancy queries.",
      'Try: "vacancy in first floor"',
      'Try: "vacancy in floor 2 block A"'
    ].join("\n");
  }

  const stats = await fetchFloorVacancyStats(intent);
  const deterministicAnswer = buildDeterministicAnswer(stats, intent);
  return maybeRewriteWithAi(question, deterministicAnswer);
}
