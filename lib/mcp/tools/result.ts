export function clampLimit(limit: number | undefined, maxRows: number) {
  if (!Number.isFinite(limit)) return maxRows;
  return Math.max(1, Math.min(maxRows, Math.floor(limit as number)));
}

export function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function toToolResult<T extends Record<string, unknown>>(summary: string, data: T) {
  return {
    content: [
      {
        type: "text" as const,
        text: summary
      }
    ],
    structuredContent: data
  };
}
