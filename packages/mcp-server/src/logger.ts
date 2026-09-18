import pino from "pino";
import { randomUUID } from "node:crypto";

// For STDIO MCP servers, logs MUST be directed to stderr so stdout remains exclusively JSON-RPC.
export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    base: { service: "figma-mcp" },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  process.stderr
);

export function createRequestId(): string {
  return randomUUID().slice(0, 8);
}

export function logAudit(action: string, metadata: Record<string, any>) {
  logger.info({
    type: "AUDIT",
    action,
    ...metadata,
  });
}
