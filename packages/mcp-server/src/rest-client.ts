import { LRUCache } from "lru-cache";
import { logger } from "./logger.js";

export interface RestClientConfig {
  accessToken?: string;
  baseUrl?: string;
  cacheTtlMs?: number;
}

export class FigmaRestClient {
  private accessToken: string | undefined;
  private baseUrl: string;
  private cache: LRUCache<string, any>;

  constructor(config: RestClientConfig = {}) {
    this.accessToken = config.accessToken || process.env.FIGMA_ACCESS_TOKEN;
    this.baseUrl = config.baseUrl || "https://api.figma.com/v1";

    // 5-minute default TTL cache with max 100 entries
    this.cache = new LRUCache({
      max: 100,
      ttl: config.cacheTtlMs || 1000 * 60 * 5,
    });
  }

  public isConfigured(): boolean {
    return Boolean(this.accessToken && this.accessToken.trim().length > 0);
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.isConfigured()) {
      throw new Error(
        "Figma REST API authentication not configured. Set the FIGMA_ACCESS_TOKEN environment variable (or pass token in tool arguments) to enable cloud REST features."
      );
    }

    const token = this.accessToken!.trim();
    // Support either Personal Access Token or OAuth Bearer
    if (token.startsWith("figd_") || token.length > 30) {
      return { "X-Figma-Token": token };
    }
    return { Authorization: `Bearer ${token}` };
  }

  private async fetchWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = {
      ...this.getAuthHeaders(),
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    let attempt = 0;
    let delay = 1000;

    while (attempt < maxRetries) {
      attempt++;
      try {
        logger.debug({ url, attempt }, "Executing Figma REST API request");
        const response = await fetch(url, {
          ...options,
          headers,
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
          const retryAfterSec = parseInt(response.headers.get("Retry-After") || "2", 10);
          logger.warn(
            { url, attempt, retryAfterSec },
            "Figma REST API rate limited (429). Backing off..."
          );
          await new Promise((r) => setTimeout(r, retryAfterSec * 1000));
          continue;
        }

        if (!response.ok) {
          const errText = await response.text();
          let parsedMsg = errText;
          try {
            const json = JSON.parse(errText);
            parsedMsg = json.message || json.err || errText;
          } catch {
            // Keep raw text
          }
          throw new Error(`Figma REST API error (${response.status}): ${parsedMsg}`);
        }

        const data = (await response.json()) as T;
        return data;
      } catch (err: any) {
        if (attempt >= maxRetries || err.message.includes("403") || err.message.includes("404")) {
          logger.error({ url, attempt, err: err.message }, "Figma REST API request failed permanently");
          throw err;
        }
        logger.warn({ url, attempt, delay, err: err.message }, "Figma REST API request failed, retrying...");
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2; // exponential backoff
      }
    }

    throw new Error(`Request to ${url} exceeded max retries (${maxRetries})`);
  }

  /**
   * Get File metadata and node hierarchy (with depth filtering)
   */
  public async getFile(fileKey: string, depth?: number): Promise<any> {
    const cacheKey = `file:${fileKey}:depth:${depth ?? "all"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const query = depth !== undefined ? `?depth=${depth}` : "";
    const data = await this.fetchWithRetry<any>(`/files/${fileKey}${query}`);
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Get specific nodes by ID
   */
  public async getFileNodes(fileKey: string, nodeIds: string[], depth?: number): Promise<any> {
    const ids = nodeIds.join(",");
    const cacheKey = `nodes:${fileKey}:${ids}:depth:${depth ?? "all"}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const queryParams = new URLSearchParams({ ids });
    if (depth !== undefined) queryParams.append("depth", String(depth));

    const data = await this.fetchWithRetry<any>(`/files/${fileKey}/nodes?${queryParams.toString()}`);
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Render cloud images/screenshots of nodes
   */
  public async getImages(
    fileKey: string,
    nodeIds: string[],
    format: "png" | "svg" | "jpg" | "pdf" = "png",
    scale = 2
  ): Promise<any> {
    const ids = nodeIds.join(",");
    const queryParams = new URLSearchParams({
      ids,
      format,
      scale: String(scale),
    });

    return this.fetchWithRetry<any>(`/images/${fileKey}?${queryParams.toString()}`);
  }

  /**
   * Read file comments
   */
  public async getComments(fileKey: string): Promise<any> {
    return this.fetchWithRetry<any>(`/files/${fileKey}/comments`);
  }

  /**
   * Post a design review comment
   */
  public async postComment(
    fileKey: string,
    message: string,
    clientMeta?: { x?: number; y?: number; nodeId?: string }
  ): Promise<any> {
    const body: Record<string, any> = { message };
    if (clientMeta) {
      body.client_meta = {};
      if (clientMeta.nodeId) body.client_meta.node_id = clientMeta.nodeId;
      if (clientMeta.x !== undefined && clientMeta.y !== undefined) {
        body.client_meta.x = clientMeta.x;
        body.client_meta.y = clientMeta.y;
      }
    }

    return this.fetchWithRetry<any>(`/files/${fileKey}/comments`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /**
   * Read Figma Enterprise / Organization Variables (Design Tokens)
   */
  public async getVariables(fileKey: string): Promise<any> {
    const cacheKey = `vars:${fileKey}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const data = await this.fetchWithRetry<any>(`/files/${fileKey}/variables/local`);
    this.cache.set(cacheKey, data);
    return data;
  }

  /**
   * Get components published in the file
   */
  public async getComponents(fileKey: string): Promise<any> {
    return this.fetchWithRetry<any>(`/files/${fileKey}/components`);
  }
}

export const restClient = new FigmaRestClient();
