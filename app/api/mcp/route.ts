import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpJsonErrorResponse, requireMcpAuth } from "@/lib/mcp/auth";
import { getMcpConfig } from "@/lib/mcp/config";
import { createMcpServer } from "@/lib/mcp/server";

export const runtime = "nodejs";

async function handleMcpRequest(request: Request) {
  const config = getMcpConfig();

  if (!config.enabled) {
    return createMcpJsonErrorResponse(404, -32004, "MCP endpoint is disabled");
  }

  const authResponse = requireMcpAuth(request, config.internalToken);
  if (authResponse) {
    return authResponse;
  }

  const server = createMcpServer(config);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    return createMcpJsonErrorResponse(
      500,
      -32603,
      error instanceof Error ? error.message : "Failed to handle MCP request"
    );
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
