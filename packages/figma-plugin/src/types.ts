export interface BridgeRequest {
  id: string;
  action: string;
  params?: Record<string, any>;
}

export interface BridgeResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface PluginHandshakePayload {
  fileName: string;
  currentPage: string;
}
