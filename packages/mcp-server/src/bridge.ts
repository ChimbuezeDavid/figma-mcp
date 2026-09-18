import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { BridgeRequest, BridgeResponse, FigmaPluginStatus } from "./types.js";
import { logger, logAudit } from "./logger.js";

export class FigmaBridge {
  private wss: WebSocketServer | null = null;
  private activeClient: WebSocket | null = null;
  private pendingRequests = new Map<
    string,
    {
      resolve: (data: any) => void;
      reject: (err: Error) => void;
      timer: NodeJS.Timeout;
      startTime: number;
      action: string;
    }
  >();
  private status: FigmaPluginStatus = { connected: false };

  constructor(private port: number = 3055) {}

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on("listening", () => {
          logger.info({ port: this.port }, "Figma Bridge WebSocket server listening");
          resolve();
        });

        this.wss.on("connection", (ws) => {
          logger.info("Figma Companion Plugin connected over WebSocket");
          this.activeClient = ws;
          this.status.connected = true;

          ws.on("message", (raw) => {
            try {
              const msg = JSON.parse(raw.toString());
              this.handleIncomingMessage(msg);
            } catch (err) {
              logger.error({ err }, "Failed to parse message from Figma plugin");
            }
          });

          ws.on("close", (code, reason) => {
            logger.warn({ code, reason: reason.toString() }, "Figma Companion Plugin disconnected");
            if (this.activeClient === ws) {
              this.activeClient = null;
              this.status = { connected: false };
            }
          });

          ws.on("error", (err) => {
            logger.error({ err }, "WebSocket client error");
          });
        });

        this.wss.on("error", (err: any) => {
          if (err.code === "EADDRINUSE") {
            logger.error(
              { port: this.port },
              `Port ${this.port} is already in use by an active Figma MCP Server instance (spawned by your IDE/MCP client or background terminal). Terminate that process or configure FIGMA_BRIDGE_PORT.`
            );
          } else {
            logger.error({ err }, "WebSocket server error");
          }
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleIncomingMessage(msg: any) {
    // Handshake or status update from plugin
    if (msg.type === "plugin_handshake" || msg.type === "status_update") {
      this.status = {
        connected: true,
        fileName: msg.payload?.fileName,
        currentPage: msg.payload?.currentPage,
      };
      logger.info(
        { fileName: this.status.fileName, currentPage: this.status.currentPage },
        "Figma document context synchronized"
      );
      return;
    }

    // Response to a pending command
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const { resolve, reject, timer, startTime, action } = this.pendingRequests.get(msg.id)!;
      clearTimeout(timer);
      this.pendingRequests.delete(msg.id);

      const durationMs = Date.now() - startTime;
      const response = msg as BridgeResponse;

      if (response.success) {
        logger.debug({ action, requestId: msg.id, durationMs }, "Bridge command completed successfully");
        resolve(response.data);
      } else {
        logger.warn({ action, requestId: msg.id, durationMs, error: response.error }, "Bridge command failed in Figma plugin");
        reject(new Error(response.error || "Unknown error from Figma plugin"));
      }
    }
  }

  public isConnected(): boolean {
    return this.status.connected && this.activeClient !== null && this.activeClient.readyState === WebSocket.OPEN;
  }

  public getStatus(): FigmaPluginStatus {
    return { ...this.status, connected: this.isConnected() };
  }

  public async sendCommand<T = any>(
    action: string,
    params: Record<string, any> = {},
    timeoutMs: number = 30000
  ): Promise<T> {
    if (!this.isConnected()) {
      throw new Error(
        "Figma Companion Plugin is not connected. Please open Figma and run the 'Figma MCP Bridge' plugin to execute canvas actions."
      );
    }

    const id = randomUUID();
    const request: BridgeRequest = { id, action, params };
    const startTime = Date.now();

    // Audit mutating actions
    const mutatingActions = [
      "create_frame",
      "create_rectangle",
      "create_text",
      "set_autolayout",
      "update_node",
      "delete_nodes",
      "duplicate_node",
      "set_stroke",
      "set_text_content",
      "generate_ui_tree",
      "set_prototype_interaction",
      "set_flow_starting_point",
      "batch_link_prototype",
    ];

    if (mutatingActions.includes(action)) {
      logAudit(action, { requestId: id, file: this.status.fileName, page: this.status.currentPage });
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          logger.error({ action, requestId: id, timeoutMs }, "Bridge command timed out");
          reject(new Error(`Command '${action}' timed out after ${timeoutMs}ms waiting for Figma plugin response.`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer, startTime, action });

      try {
        this.activeClient!.send(JSON.stringify(request));
      } catch (err) {
        clearTimeout(timer);
        this.pendingRequests.delete(id);
        logger.error({ action, requestId: id, err }, "Failed to dispatch command over WebSocket");
        reject(err as Error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

export const bridge = new FigmaBridge(
  process.env.FIGMA_BRIDGE_PORT ? parseInt(process.env.FIGMA_BRIDGE_PORT, 10) : 3055
);
