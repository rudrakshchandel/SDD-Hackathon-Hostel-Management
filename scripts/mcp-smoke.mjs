export async function runMcpSmoke({
  baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000",
  token = process.env.MCP_INTERNAL_TOKEN || "",
  fetchImpl = fetch
} = {}) {
  if (!token) {
    return {
      ok: false,
      error: "MCP_INTERNAL_TOKEN is missing. Set it before running MCP smoke test."
    };
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/api/mcp`;
  const commonHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-03-26",
    "x-mcp-token": token
  };

  try {
    const listResponse = await fetchImpl(endpoint, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {}
      })
    });

    const listPayload = await listResponse.json();
    if (!listResponse.ok || listPayload.error) {
      return {
        ok: false,
        error: `tools/list failed (${listResponse.status}): ${JSON.stringify(listPayload.error || listPayload)}`
      };
    }

    const tools = Array.isArray(listPayload.result?.tools) ? listPayload.result.tools : [];
    const preferredTool = tools.some((tool) => tool.name === "schema.describe")
      ? "schema.describe"
      : tools[0]?.name;

    if (!preferredTool) {
      return {
        ok: false,
        error: "No tools returned by MCP server."
      };
    }

    const callResponse = await fetchImpl(endpoint, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: preferredTool,
          arguments: {}
        }
      })
    });

    const callPayload = await callResponse.json();
    if (!callResponse.ok || callPayload.error) {
      return {
        ok: false,
        error: `tools/call failed (${callResponse.status}): ${JSON.stringify(callPayload.error || callPayload)}`
      };
    }

    return {
      ok: true,
      endpoint,
      toolsCount: tools.length,
      calledTool: preferredTool,
      resultPreview:
        callPayload?.result?.content?.[0]?.text ||
        "Tool call succeeded"
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown MCP smoke failure"
    };
  }
}

export async function main() {
  const result = await runMcpSmoke();

  if (!result.ok) {
    console.error("MCP smoke check failed:", result.error);
    process.exitCode = 1;
    return;
  }

  console.log("MCP smoke check passed");
  console.log(`Endpoint: ${result.endpoint}`);
  console.log(`Tools: ${result.toolsCount}`);
  console.log(`Called tool: ${result.calledTool}`);
  console.log(`Preview: ${result.resultPreview}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
