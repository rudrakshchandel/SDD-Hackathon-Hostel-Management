export type McpConfig = {
  enabled: boolean;
  internalToken: string;
  maxRows: number;
};

const DEFAULT_MAX_ROWS = 100;
const MIN_MAX_ROWS = 1;
const MAX_MAX_ROWS = 200;

function toBoolean(value: string | undefined) {
  return (value || "").trim().toLowerCase() === "true";
}

function toBoundedMaxRows(value: string | undefined) {
  const parsed = Number(value || DEFAULT_MAX_ROWS);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_ROWS;
  return Math.max(MIN_MAX_ROWS, Math.min(MAX_MAX_ROWS, Math.floor(parsed)));
}

export function getMcpConfig(env: NodeJS.ProcessEnv = process.env): McpConfig {
  return {
    enabled: toBoolean(env.MCP_ENABLED),
    internalToken: (env.MCP_INTERNAL_TOKEN || "").trim(),
    maxRows: toBoundedMaxRows(env.MCP_MAX_ROWS)
  };
}
