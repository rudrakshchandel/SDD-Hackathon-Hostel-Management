import { prisma } from "@/lib/prisma";
import { ALLOWLISTED_SCHEMA_TABLES } from "@/lib/mcp/tools/constants";

type SchemaRow = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
};

export async function describeSchemaForMcp() {
  const rows = await prisma.$queryRawUnsafe<SchemaRow[]>(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name ASC, ordinal_position ASC
  `);

  const allowlist = new Set(ALLOWLISTED_SCHEMA_TABLES);
  const filtered = rows.filter((row) => allowlist.has(row.table_name.toLowerCase() as (typeof ALLOWLISTED_SCHEMA_TABLES)[number]));

  const grouped = new Map<string, Array<{ name: string; dataType: string; nullable: boolean }>>();

  for (const row of filtered) {
    const key = row.table_name;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)?.push({
      name: row.column_name,
      dataType: row.data_type,
      nullable: row.is_nullable === "YES"
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    tables: [...grouped.entries()].map(([tableName, columns]) => ({
      tableName,
      columns
    }))
  };
}
