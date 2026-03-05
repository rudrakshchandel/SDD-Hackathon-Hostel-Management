export const MCP_TOKEN_HEADER = "x-mcp-token";

export function createMcpJsonErrorResponse(status: number, code: number, message: string) {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code,
        message
      },
      id: null
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

export function requireMcpAuth(request: Request, expectedToken: string) {
  const provided = request.headers.get(MCP_TOKEN_HEADER);
  if (!expectedToken || !provided || provided !== expectedToken) {
    return createMcpJsonErrorResponse(401, -32001, "Unauthorized MCP request");
  }
  return null;
}
