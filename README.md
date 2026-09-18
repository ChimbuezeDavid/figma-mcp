# Figma MCP Server & Companion Plugin

An AI-driven **Model Context Protocol (MCP)** server and companion **Figma Desktop Plugin** designed to rapidly establish UI/UX designs, generate production-ready AutoLayout layouts, and wire interactive prototypes.

---

## 🏗️ Architecture

```
┌─────────────────────────┐          STDIO          ┌──────────────────────────┐
│   AI Coding Assistant   │ ◄─────────────────────► │   Node.js MCP Server     │
│ (Antigravity / Claude)  │                         │      (@figma-mcp/server) │
└─────────────────────────┘                         └────────────┬─────────────┘
                                                                 │
                                                       WebSocket │ ws://localhost:3055
                                                                 ▼
┌─────────────────────────┐     Plugin API (Canvas)  ┌──────────────────────────┐
│   Figma Canvas Engine   │ ◄──────────────────────► │   Figma Desktop Plugin   │
│  (Shapes, AutoLayout,   │                          │      (@figma-mcp/plugin) │
│   Prototype Reactions)  │                          └──────────────────────────┘
└─────────────────────────┘
```

1. **MCP Server (`packages/mcp-server`)**: Runs over standard STDIO, exposing 18 design and prototyping tools to LLMs while hosting a local WebSocket bridge on port `3055`.
2. **Figma Companion Plugin (`packages/figma-plugin`)**: Runs inside Figma Desktop, connects to the local WebSocket, and executes native canvas operations, font loading, AutoLayout, and interactive prototyping reactions.

---

## ⚡ Quickstart (Zero-Install / For External Users)

> See the full **[60-Second Quickstart Guide](./QUICKSTART.md)** or the **[Packaging & Distribution Guide](./PACKAGING.md)**.

### 1. Load Plugin in Figma Desktop (10 seconds)
- **Option A (No Terminal)**: Extract **[`dist-release/figma-companion-plugin.zip`](./dist-release/figma-companion-plugin.zip)** anywhere $\rightarrow$ In Figma Desktop, right-click canvas $\rightarrow$ **Plugins** $\rightarrow$ **Development** $\rightarrow$ **"Import plugin from manifest..."** $\rightarrow$ select `manifest.json`.
- **Option B (Terminal)**: Run `npx figma-mcp export-plugin` and import the generated `figma-companion-plugin/manifest.json`.

### 2. Add to Claude Desktop or Cursor
In your `claude_desktop_config.json` or `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp"]
    }
  }
}
```

---

## 🛠️ Local Development & Building from Source

### 1. Install & Build Monorepo
```bash
npm install
npm run build
```

### 2. Package for Distribution
```bash
npm run package
```
Generates ready-to-ship assets in `./dist-release`:
- `figma-companion-plugin/`: Pre-bundled standalone plugin folder
- `figma-companion-plugin.zip`: Portable plugin archive
- `configs/`: Copy-paste JSON configs for Claude Desktop, Cursor, and Antigravity

### 3. CLI Helper Commands
```bash
npx figma-mcp --help              # View CLI usage
npx figma-mcp export-plugin [dir] # Export companion plugin to any directory
npx figma-mcp config              # Output copy-paste client JSON configs
npx figma-mcp doctor              # Verify system environment & port 3055
npx figma-mcp --transport=sse     # Run in remote HTTP / SSE mode
```

Alternatively, run in development mode with live watch:
```bash
npm run dev:server
```

---

## 🛠️ Complete Toolset

### 1. Diagnostics & Inspection
- **`get_figma_status`**: Checks if the Figma companion plugin is currently active and connected.
- **`ping_figma`**: Tests round-trip WebSocket latency and document verification.
- **`get_document_info`**: Retrieves document name, pages list, current active page, and selection count.
- **`get_design_context`**: *(Enterprise)* Extracts a token-efficient semantic design outline of the page or screen (artboards, buttons, cards, inputs, and prototype starting points) without vector noise.
- **`inspect_node`**: Recursively inspects any node by ID with strict depth capping (max 4) to protect LLM context windows.
- **`get_selection`**: Inspects details of whichever elements are currently highlighted on the canvas.

### 2. Observability & Audit Trails (Enterprise)
- **Structured JSON Logging**: Powered by `pino` directed strictly to `stderr` (preserving STDIO JSON-RPC integrity). Configurable log level via `LOG_LEVEL=info|debug|warn`.
- **Request Correlation**: Each tool invocation is assigned an 8-character `requestId` tracked from receipt through plugin completion.
- **Audit Logging**: All mutating canvas operations (`create_frame`, `set_prototype_interaction`, `delete_nodes`, `generate_ui_tree`, etc.) record an explicit structured `AUDIT` record with file, page, and mutation metadata.
- **Actionable Error Recovery**: Failed node lookups return a helpful recovery payload listing the available screens/frames on the active page so agents can self-heal.

### 3. Declarative Screen Generation (Step 4)
- **`generate_ui_tree`**: Generates full screens with AutoLayout, typography, colors, and tagged interactive elements in a single atomic call:
  - **Presets**: `iPhone 16`, `iPhone 16 Pro Max`, `Android`, `Desktop`, `Tablet`.
  - **Elements**: `frame`, `card`, `button`, `text`, `divider`, `spacer`.
  - **Tag Registry**: Assigns tags (e.g. `tag: "signup_btn"`) and returns a map of `{ [tag]: nodeId }` for instant prototyping.

### 4. Interactive Prototyping Engine (Step 5)
- **`set_prototype_interaction`**: Wires interactive prototype transitions between elements:
  - **Triggers**: `ON_CLICK`, `ON_HOVER`, `ON_PRESS`, `AFTER_TIMEOUT`.
  - **Navigations**: `NAVIGATE`, `OVERLAY`, `SWAP`, `BACK`, `CLOSE`.
  - **Transitions**: `SMART_ANIMATE`, `DISSOLVE`, `SLIDE_IN`, `MOVE_IN`, `INSTANT`.
- **`set_flow_starting_point`**: Sets named prototype flow starting points (e.g. *"Onboarding Flow"*).
- **`get_prototype_connections`**: Audits all flow starting points and prototype connections on the page.
- **`batch_link_prototype`**: Wires multiple screen transitions across a user journey in one call.

### 5. Canvas Primitives, Components & Polish
- **`create_frame`**: Creates container frames or artboards.
- **`create_rectangle`**: Creates shapes, cards, or placeholders.
- **`create_ellipse`**: Creates circular/elliptical shapes (ideal for user avatars, notification badges, circular action buttons, and status indicator dots).
- **`create_svg_icon`**: Renders and inserts scalable SVG vector graphics (icons, logos, custom paths) with automatic color tinting onto the canvas.
- **`create_component`**: Creates master design system components from scratch or converts existing frames into reusable components.
- **`create_component_instance`**: Instantiates linked component instances from any master component ID.
- **`set_effects`**: Applies elevation shadows, inner shadows, layer blurs, and background blurs (`DROP_SHADOW`, `INNER_SHADOW`, `LAYER_BLUR`, `BACKGROUND_BLUR`).
- **`create_section`**: Groups and categorizes artboards and user journey paths into organized, labeled Figma Sections on the canvas.
- **`focus_viewport`**: Pans and zooms the canvas viewport directly to specified nodes, with optional selection.
- **`set_overlay_interaction`**: Configures modal dialogs, slide-over panels, and dropdown overlays with customizable backdrops, animations, and click-outside dismissal rules.
- **`create_text`**: Inserts typography with automatic font preloading (`Inter`, `Roboto`, etc.).
- **`set_autolayout`**: Applies Flexbox/AutoLayout (direction, gap, padding, axis alignments).
- **`update_node`**: Modifies position, dimensions, fills, corner radius, opacity, or visibility.
- **`delete_nodes`**: Deletes one or more nodes by ID.
- **`duplicate_node`**: Clones frames or elements with offsets (ideal for prototype state variants).
- **`set_stroke`**: Configures border colors, thicknesses, and alignments.
- **`set_text_content`**: Updates text copy while preserving typography styles.
- **`find_nodes`**: Searches canvas by keyword or node type.
- **`manage_page`**: Creates or switches active pages.
- **`get_document_tokens`**: Extracts local color paint styles, text typography styles, and effect styles directly from the document.
- **`export_node_image`**: Exports 2x Retina PNG snapshots as base64 for visual verification.

### 6. Figma REST API Tools (Cloud & Headless Access)
*Requires `FIGMA_ACCESS_TOKEN` environment variable:*
- **`rest_get_file`**: Read full file metadata, version history, components, and document hierarchy from Figma Cloud without requiring the desktop app.
- **`rest_get_file_nodes`**: Fetch specific node hierarchies by ID from the cloud.
- **`rest_get_images`**: Render high-resolution PNG, SVG, JPG, or PDF exports of frames via Figma's cloud render engine.
- **`rest_get_comments`**: Read collaboration comment threads, reviews, and pin coordinates.
- **`rest_post_comment`**: Post review feedback directly to a Figma screen pin via the REST API.
- **`rest_get_variables`**: Read Figma Enterprise / Organization Variables (color themes, spacing scales, modes).
- **`rest_get_components`**: List published component library definitions and documentation links.

---

## 📦 MCP Resources (URI-Addressable Design State)

Clients can read real-time design state directly via MCP URIs without executing tools:
- **`figma://document/summary`**: Document outline, active pages, and selected canvas elements.
- **`figma://tokens/active`**: Complete design token registry (colors, typography styles, effect styles).
- **`figma://prototype/flows`**: Interactive connection graph and flow starting points on the page.

---

## 🧠 MCP Prompts & Skills (High-Level Workflows)

Pre-packaged prompts guiding the AI assistant through specialized UX engineering workflows:
- **`design_product_flow`**: Guided workflow taking a product concept, generating screens with AutoLayout, registering tags, and wiring interactive animations.
- **`wire_interactive_prototype`**: Guides the agent through discovering interactive targets and establishing seamless user journeys.
- **`audit_ux_design`**: Executes an accessibility, touch target (>= 44x44px), spacing consistency, and visual hierarchy audit.

---

## 🌐 Dual Transport & Remote Deployment (Phase D)

The server automatically detects whether to run locally over **STDIO** or remotely over **Streamable HTTP / SSE**:

### 1. Local Mode (Default STDIO)
Used by default when spawned by IDEs (Claude Desktop, Cursor, Antigravity):
```bash
node packages/mcp-server/dist/index.js
```

### 2. Remote Mode (Streamable HTTP / SSE)
Run as a cloud service or team gateway on port `3000`:
```bash
node packages/mcp-server/dist/index.js --transport=sse
# or with environment variables:
MCP_TRANSPORT=sse PORT=3000 node packages/mcp-server/dist/index.js
```
Endpoints provided:
- **`GET /health`**: Health check, uptime, bridge status, and REST config.
- **`GET /sse`**: SSE connection stream.
- **`POST /messages?sessionId=...`**: JSON-RPC message ingress.

### 3. Docker Container Deployment
Run the production-grade multi-stage container with Docker Compose:
```bash
# Build and run
docker compose up -d --build

# Check health
curl http://localhost:3000/health
```
