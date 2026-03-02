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

type SchemaColumn = {
  name: string;
  dataType: string;
  nullable: boolean;
};

type SchemaMetadata = {
  generatedAt: string;
  tableNames: string[];
  tables: Record<string, SchemaColumn[]>;
};

type SqlPipelineResult = {
  sql: string;
  rowCount: number;
  rows: Array<Record<string, unknown>>;
  hints: {
    floorNumber?: number;
    blockName?: string;
  };
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

const ALLOWED_TABLES = [
  "hostel",
  "block",
  "floor",
  "room",
  "bed",
  "resident",
  "allocation",
  "invoice",
  "payment",
  "complaint",
  "notice"
] as const;

const SQL_CONTEXT_ROW_LIMIT = Number(process.env.AI_SQL_ROW_LIMIT || 60);
const SQL_MAX_ROW_LIMIT = Math.max(10, Math.min(200, SQL_CONTEXT_ROW_LIMIT));
const SCHEMA_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSchema: { at: number; data: SchemaMetadata } | null = null;

export function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
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

function extractReferencedTables(sql: string) {
  const referenced = new Set<string>();
  const regex = /\b(?:from|join)\s+([a-zA-Z0-9_."`]+)/gi;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    const raw = match[1]
      .replace(/["`]/g, "")
      .trim()
      .toLowerCase();
    const table = raw.includes(".") ? raw.split(".").pop() || raw : raw;
    if (table) {
      referenced.add(table);
    }
  }

  return [...referenced];
}

function stripSqlFence(text: string) {
  const fenced = text.match(/```(?:json|sql)?\s*([\s\S]*?)```/i)?.[1];
  return (fenced || text).trim();
}

function parseSqlDraft(text: string) {
  const raw = stripSqlFence(text);

  try {
    const parsed = JSON.parse(raw) as { sql?: string };
    if (parsed?.sql) return parsed.sql;
  } catch {
    // Continue with heuristics below.
  }

  const objectStart = raw.indexOf("{");
  const objectEnd = raw.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    const maybeJson = raw.slice(objectStart, objectEnd + 1);
    try {
      const parsed = JSON.parse(maybeJson) as { sql?: string };
      if (parsed?.sql) return parsed.sql;
    } catch {
      // Fall through.
    }
  }

  const sqlMatch = raw.match(/\b(with|select)\b[\s\S]*/i);
  return (sqlMatch ? sqlMatch[0] : raw).trim();
}

function normalizeSql(sql: string) {
  return sql.replace(/\s+/g, " ").trim().replace(/;+\s*$/g, "");
}

function ensureSqlLimit(sql: string, limit = SQL_MAX_ROW_LIMIT) {
  const normalized = normalizeSql(sql);
  if (/\blimit\s+\d+\b/i.test(normalized)) {
    return normalized.replace(/\blimit\s+(\d+)\b/i, (_, value) => {
      const parsed = Number(value);
      const bounded = Number.isFinite(parsed)
        ? Math.max(1, Math.min(limit, parsed))
        : limit;
      return `LIMIT ${bounded}`;
    });
  }
  return `${normalized} LIMIT ${limit}`;
}

export function validateReadOnlySql(
  sql: string,
  allowedTables: ReadonlyArray<string> = ALLOWED_TABLES
) {
  const normalized = normalizeSql(sql);
  if (!normalized) {
    return { ok: false as const, reason: "SQL is empty" };
  }

  if (!/^(with|select)\b/i.test(normalized)) {
    return {
      ok: false as const,
      reason: "Only SELECT/CTE queries are allowed"
    };
  }

  if (/;/.test(normalized)) {
    return {
      ok: false as const,
      reason: "Multiple SQL statements are not allowed"
    };
  }

  if (/(--|\/\*|\*\/)/.test(normalized)) {
    return {
      ok: false as const,
      reason: "SQL comments are not allowed"
    };
  }

  if (/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|execute|call)\b/i.test(normalized)) {
    return {
      ok: false as const,
      reason: "Mutating SQL keywords are not allowed"
    };
  }

  const referencedTables = extractReferencedTables(normalized);
  const allowedSet = new Set(allowedTables.map((table) => table.toLowerCase()));
  if (
    referencedTables.length > 0 &&
    referencedTables.some((table) => !allowedSet.has(table))
  ) {
    return {
      ok: false as const,
      reason: "Query references a table that is not allowlisted"
    };
  }

  return { ok: true as const, sql: ensureSqlLimit(normalized) };
}

function toJsonSafe(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item));
  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, innerValue] of Object.entries(value as Record<string, unknown>)) {
      result[key] = toJsonSafe(innerValue);
    }
    return result;
  }
  return value;
}

async function buildSchemaMetadata() {
  const columnRows = await prisma.$queryRawUnsafe<
    Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      is_nullable: "YES" | "NO";
    }>
  >(
    `
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = ANY(ARRAY[${ALLOWED_TABLES.map((table) => `'${table}'`).join(",")}])
    ORDER BY table_name, ordinal_position
    `
  );

  const tables: Record<string, SchemaColumn[]> = {};
  for (const row of columnRows) {
    if (!tables[row.table_name]) {
      tables[row.table_name] = [];
    }
    tables[row.table_name].push({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === "YES"
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    tableNames: Object.keys(tables).sort(),
    tables
  } satisfies SchemaMetadata;
}

async function getSchemaMetadataCached() {
  const now = Date.now();
  if (cachedSchema && now - cachedSchema.at <= SCHEMA_CACHE_TTL_MS) {
    return cachedSchema.data;
  }

  const data = await buildSchemaMetadata();
  cachedSchema = {
    at: now,
    data
  };
  return data;
}

async function buildLightweightContext(question: string) {
  const floorNumber = parseFloorNumber(question);
  const blockName = parseBlockName(question);

  const roomFilters = parseRoomSearchFilters(question);
  const roomMatches = (await searchRooms(roomFilters)).slice(0, 8).map((room) => ({
    roomNumber: room.roomNumber,
    block: room.block.name,
    floorNumber: room.floor.floorNumber,
    sharingType: room.sharingType,
    vacantBeds: room.counts.vacantBeds,
    basePrice: room.basePrice,
    attributes: room.attributes
  }));

  return {
    hints: {
      floorNumber,
      blockName
    },
    roomMatches
  };
}

async function generateSqlFromQuestion({
  question,
  intent,
  schema,
  hints
}: {
  question: string;
  intent: AssistantIntent;
  schema: SchemaMetadata;
  hints: {
    floorNumber?: number;
    blockName?: string;
  };
}) {
  const response = await fetch(getGeminiEndpoint(false), {
    method: "POST",
    headers: geminiHeaders(),
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: [
              "You are a PostgreSQL query planner for a hostel management app.",
              "Return strict JSON only: {\"sql\":\"...\"}.",
              "Write exactly one read-only SQL statement.",
              "Use only SELECT or WITH ... SELECT.",
              `Only these tables are allowed: ${schema.tableNames.join(", ")}.`,
              `Always include LIMIT <= ${SQL_MAX_ROW_LIMIT}.`,
              "Do not include comments, explanations, or markdown."
            ].join(" ")
          }
        ]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                intent,
                question,
                hints,
                schema: schema.tables
              })
            }
          ]
        }
      ]
    })
  });

  const payload = (await response.json()) as GeminiResponsePayload;
  if (!response.ok) {
    throw new Error(parseOpenAiError(response.status, payload));
  }

  const raw = extractGeminiText(payload);
  const sqlDraft = parseSqlDraft(raw);
  const validation = validateReadOnlySql(sqlDraft, schema.tableNames);
  if (!validation.ok) {
    throw new Error(`Unsafe SQL generated: ${validation.reason}`);
  }

  return validation.sql;
}

async function executeReadOnlySql(sql: string) {
  const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(sql);
  return rows.map((row) => toJsonSafe(row) as Record<string, unknown>);
}

async function buildSqlContext(question: string, intent: AssistantIntent): Promise<SqlPipelineResult> {
  const schema = await getSchemaMetadataCached();
  const light = await buildLightweightContext(question);
  const sql = await generateSqlFromQuestion({
    question,
    intent,
    schema,
    hints: light.hints
  });
  const rows = await executeReadOnlySql(sql);

  return {
    sql,
    rowCount: rows.length,
    rows,
    hints: light.hints
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

async function buildAnswerContext(question: string, intent: AssistantIntent) {
  try {
    const pipeline = await buildSqlContext(question, intent);
    return {
      source: "sql_pipeline" as const,
      pipeline
    };
  } catch (error) {
    const fallback = await buildLightweightContext(question);
    return {
      source: "fallback" as const,
      fallback,
      error: error instanceof Error ? error.message : "SQL pipeline failed"
    };
  }
}

export async function answerDashboardQuestion(question: string) {
  const intent = classifyIntent(question);
  const answerContext = await buildAnswerContext(question, intent);

  const answer = await askModel(question, intent, {
    ...answerContext,
    instructions:
      "If source=sql_pipeline, rely on SQL rows for the answer. If source=fallback, answer conservatively and mention uncertainty."
  });

  return {
    intent,
    answer,
    source: "ai"
  };
}

export function parseOpenAiError(status: number, payload: GeminiResponsePayload) {
  const errText =
    payload.error?.message || extractGeminiText(payload) || "Gemini request failed";
  const errCode = payload.error?.code ? ` [${payload.error.code}]` : "";
  return `Gemini error (${status})${errCode}: ${errText}`;
}

export async function buildDashboardAiRequest(question: string, stream = false) {
  const intent = classifyIntent(question);
  const answerContext = await buildAnswerContext(question, intent);

  return {
    url: getGeminiEndpoint(stream),
    intent,
    headers: geminiHeaders(),
    body: buildGeminiRequestBody({
      question,
      intent,
      context: {
        ...answerContext,
        instructions:
          "If source=sql_pipeline, rely on SQL rows for the answer. If source=fallback, answer conservatively and mention uncertainty."
      }
    })
  };
}
