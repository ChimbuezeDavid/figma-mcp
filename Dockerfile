# Stage 1: Build TypeScript artifacts and plugin
FROM node:22-alpine AS builder

WORKDIR /app

# Install build utilities
RUN apk add --no-cache zip

# Copy root and workspace package files
COPY package.json package-lock.json* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/figma-plugin/package.json ./packages/figma-plugin/

# Install all dependencies
RUN npm install

# Copy source trees, scripts, and configs
COPY scripts ./scripts
COPY packages/mcp-server ./packages/mcp-server
COPY packages/figma-plugin ./packages/figma-plugin
COPY README.md LICENSE ./

# Build workspaces and package companion plugin
RUN node scripts/package-release.js || npm run build

# Stage 2: Production runtime image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy root and server package files
COPY package.json package-lock.json* ./
COPY packages/mcp-server/package.json ./packages/mcp-server/

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled JavaScript and companion plugin bundle from builder
COPY --from=builder /app/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=builder /app/packages/mcp-server/plugin-dist ./packages/mcp-server/plugin-dist
COPY --from=builder /app/packages/mcp-server/README.md ./packages/mcp-server/README.md
COPY --from=builder /app/packages/mcp-server/LICENSE ./packages/mcp-server/LICENSE

# Expose HTTP / SSE port (3000) and WebSocket bridge port (3055)
EXPOSE 3000
EXPOSE 3055

# Set default transport to Streamable HTTP / SSE for remote cloud hosting
ENV MCP_TRANSPORT=sse
ENV PORT=3000
ENV FIGMA_BRIDGE_PORT=3055

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "packages/mcp-server/dist/index.js", "--transport=sse"]
