# Stage 1: Build TypeScript artifacts
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and workspace package files
COPY package.json package-lock.json* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/figma-plugin/package.json ./packages/figma-plugin/

# Install all dependencies including devDependencies
RUN npm install

# Copy source trees and configs
COPY packages/mcp-server ./packages/mcp-server
COPY packages/figma-plugin ./packages/figma-plugin

# Build all workspaces
RUN npm run build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy root and server package files
COPY package.json package-lock.json* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled JavaScript from builder
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist

# Expose HTTP port (3000) and WebSocket bridge port (3055)
EXPOSE 3000
EXPOSE 3055

# Set default transport to Streamable HTTP / SSE for remote containers
ENV MCP_TRANSPORT=sse
ENV PORT=3000
ENV FIGMA_BRIDGE_PORT=3055

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "packages/mcp-server/dist/index.js", "--transport=sse"]
