import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { McpConfig } from "@/lib/mcp/config";
import { getHostelSummaryForMcp } from "@/lib/mcp/tools/hostel";
import {
  getVacancyByLocationForMcp,
  roomsSearchInputSchema,
  searchRoomsForMcp,
  vacancyByLocationInputSchema
} from "@/lib/mcp/tools/rooms";
import {
  getRevenueSummaryForMcp,
  revenueSummaryInputSchema
} from "@/lib/mcp/tools/revenue";
import {
  listTenantsForMcp,
  tenantsListInputSchema
} from "@/lib/mcp/tools/tenants";
import { describeSchemaForMcp } from "@/lib/mcp/tools/schema";
import { toToolResult } from "@/lib/mcp/tools/result";

export function createMcpServer(config: McpConfig) {
  const server = new McpServer({
    name: "hostel-management-mcp",
    version: "1.0.0"
  });

  server.registerTool(
    "hostel.get_summary",
    {
      description:
        "Returns hostel profile and top-level operational counts for blocks/floors/rooms/beds.",
      inputSchema: z.object({})
    },
    async () => {
      const data = await getHostelSummaryForMcp();
      return toToolResult("Hostel summary generated.", data);
    }
  );

  server.registerTool(
    "rooms.search",
    {
      description: "Searches rooms by location, sharing type, features, pricing, and availability.",
      inputSchema: roomsSearchInputSchema
    },
    async (args) => {
      const data = await searchRoomsForMcp(args, config.maxRows);
      return toToolResult(`Rooms search returned ${data.returned} rooms.`, data);
    }
  );

  server.registerTool(
    "vacancy.by_location",
    {
      description: "Returns vacancy totals and room-level vacancy grouped by block/floor filters.",
      inputSchema: vacancyByLocationInputSchema
    },
    async (args) => {
      const data = await getVacancyByLocationForMcp(args, config.maxRows);
      return toToolResult(
        `Vacancy summary ready: ${data.totals.vacantBeds} vacant beds out of ${data.totals.totalBeds}.`,
        data
      );
    }
  );

  server.registerTool(
    "revenue.summary",
    {
      description: "Returns invoiced, collected, dues, and overdue invoice counts for a date range.",
      inputSchema: revenueSummaryInputSchema
    },
    async (args) => {
      const data = await getRevenueSummaryForMcp(args);
      return toToolResult(
        `Revenue summary ready. Invoiced ₹${data.invoiced}, collected ₹${data.collected}.`,
        data
      );
    }
  );

  server.registerTool(
    "tenants.list",
    {
      description:
        "Lists currently allocated tenants with location data and masked personal fields.",
      inputSchema: tenantsListInputSchema
    },
    async (args) => {
      const data = await listTenantsForMcp(args, config.maxRows);
      return toToolResult(`Tenant list returned ${data.returned} records.`, data);
    }
  );

  server.registerTool(
    "schema.describe",
    {
      description: "Returns allowlisted database table and column metadata for AI planning.",
      inputSchema: z.object({})
    },
    async () => {
      const data = await describeSchemaForMcp();
      return toToolResult("Schema metadata generated.", data);
    }
  );

  return server;
}
