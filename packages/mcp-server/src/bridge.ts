import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";
import { BridgeRequest, BridgeResponse, FigmaPluginStatus } from "./types.js";
import { logger, logAudit } from "./logger.js";

export class FigmaBridge {
  private wss: WebSocketServer | null = null;
  private activeClient: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
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

  public async start(): Promise<void> {
    const host = process.env.FIGMA_BRIDGE_HOST || "0.0.0.0";
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        await this.bindServer(host);
        this.startHeartbeatLoop();
        return;
      } catch (err: any) {
        attempts++;
        if (err.code === "EADDRINUSE" && attempts < maxAttempts) {
          logger.warn(
            { port: this.port, attempt: attempts },
            `Port ${this.port} is busy or in TIME_WAIT. Retrying in 1.5s...`
          );
          await new Promise((r) => setTimeout(r, 1500));
        } else {
          logger.error({ err, attempts }, "Failed to start Figma Bridge WebSocket server");
          throw err;
        }
      }
    }
  }

  private bindServer(host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wss = new WebSocketServer({ port: this.port, host });

        wss.on("listening", () => {
          this.wss = wss;
          logger.info({ port: this.port, host }, "Figma Bridge WebSocket server listening");
          resolve();
        });

        wss.on("connection", (ws) => {
          (ws as any).isAlive = true;
          logger.info("Figma Companion Plugin connected over WebSocket");
          this.activeClient = ws;
          this.status.connected = true;

          // Native ping/pong handler
          ws.on("pong", () => {
            (ws as any).isAlive = true;
          });

          ws.on("message", (raw) => {
            (ws as any).isAlive = true;
            try {
              const msg = JSON.parse(raw.toString());
              this.handleIncomingMessage(ws, msg);
            } catch (err) {
              logger.error({ err }, "Failed to parse message from Figma plugin");
            }
          });

          ws.on("close", (code, reason) => {
            logger.warn({ code, reason: reason.toString() }, "WebSocket client disconnected");
            if (this.activeClient === ws) {
              const remaining = Array.from(this.wss?.clients || []).find(
                (c) => c !== ws && c.readyState === WebSocket.OPEN
              );
              if (remaining) {
                this.activeClient = remaining;
                this.status.connected = true;
                logger.info("Flipped activeClient to remaining open connection");
              } else {
                this.activeClient = null;
                this.status = { connected: false };
              }
            }
          });

          ws.on("error", (err) => {
            logger.error({ err }, "WebSocket client error");
          });
        });

        wss.on("error", (err: any) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private startHeartbeatLoop() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // Run every 4 seconds to guarantee persistent keep-alive across background tabs & idle periods
    this.heartbeatTimer = setInterval(() => {
      if (!this.wss) return;

      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          // Low-level protocol ping
          try {
            client.ping();
          } catch (e) {}

          // High-level JSON keep-alive frame
          try {
            client.send(JSON.stringify({ type: "bridge_ping", timestamp: Date.now() }));
          } catch (e) {}
        }
      }

      // Check active client health
      if (this.activeClient && this.activeClient.readyState !== WebSocket.OPEN) {
        const candidate = Array.from(this.wss.clients).find((c) => c.readyState === WebSocket.OPEN);
        if (candidate) {
          this.activeClient = candidate;
          this.status.connected = true;
        } else {
          this.activeClient = null;
          this.status = { connected: false };
        }
      }
    }, 4000);
  }

  private handleIncomingMessage(ws: WebSocket, msg: any) {
    // 1. Keep-Alive / Heartbeat handling
    if (msg.type === "plugin_heartbeat") {
      try {
        ws.send(JSON.stringify({ type: "bridge_pong", timestamp: Date.now() }));
      } catch (e) {}
      return;
    }

    if (msg.type === "bridge_pong") {
      (ws as any).isAlive = true;
      return;
    }

    // 2. Handshake or status update from plugin
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

    // 3. Response to a pending command
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
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
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
