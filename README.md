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

### 1. Diagnostics, Inspection & HCI Quality
- **`lint_design_compliance`**: *(Enterprise)* Automatically audits and scores any screen against HCI & UI/UX standards (Fitts's Law $\ge 44\text{px}$ touch targets, 8pt spacing grid consistency, calibrated typography leading, and zero emojis).
- **`get_figma_status`**: Checks if the Figma companion plugin is currently active and connected.
- **`ping_figma`**: Tests round-trip WebSocket latency and document verification.
- **`get_document_info`**: Retrieves document name, pages list, current active page, and selection count.
- **`get_design_context`**: *(Enterprise)* Extracts a token-efficient semantic design outline of the page or screen (artboards, buttons, cards, inputs, and prototype starting points) without vector noise.
- **`inspect_node`**: Recursively inspects any node by ID with strict depth capping (max 4) to protect LLM context windows.
- **`get_selection`**: Inspects details of whichever elements are currently highlighted on the canvas.

### 2. Design Guardian & HCI Ergonomics (Enterprise)
- **Zero-Emoji Enforcement**: Automatically sanitizes emojis from all text elements (`create_text`, `set_text_content`, `generate_ui_tree`), preventing cartoonish AI outputs and directing models to use `create_svg_icon` with vector SVG paths instead.
- **Intelligent Typography & Leading Engine**: Automatically harmonizes line-height (leading) and letter-spacing (tracking) per font size (tight leading $1.15\times$ on large headlines $\ge 32\text{px}$, comfortable $1.5\times$ leading on body text, open tracking on uppercase captions).
- **HCI Touch Target Guardian (Fitts's Law)**: Automatically clamps interactive buttons and tap targets to $\ge 44\text{px}$ (Apple HIG) or $\ge 48\text{px}$ (Material Design).
- **8-Point Spacing Grid**: Validates and snaps paddings and gaps to clean 4pt/8pt increments ($4, 8, 12, 16, 20, 24, 32, 40, 48\text{px}$).
- **Color Contrast Guardian (WCAG 2.1 AA)**: Computes relative luminance and contrast ratios ($> 4.5:1$ for body, $> 3:1$ for headers) to prevent low-contrast text combinations.

### 3. UX Intelligence & Cognitive Architecture (New)
- **`generate_state_matrix`**: Generates the **5 Essential States of UI** (*Ideal, Empty Onboarding, Loading Skeleton Shimmer, Empathetic Error with 1-click retry, and Partial/Boundary Stress Test*) in a single call, eliminating the "Happy-Path Only" failure mode.
- **`audit_ux_heuristics`**: Evaluates screens against empirical human cognitive psychology:
  - **Hick's Law**: Flags choice overload and competing primary CTAs ($T = b \log_2(n+1)$).
  - **Fitts's Law**: Checks touch ergonomics and prevents destructive buttons from sitting dangerously close to primary progression actions.
  - **Miller's Law**: Flags visual chunking violations where $> 7$ inputs or items are presented without grouping.
  - **Jakob's Law**: Audits standard mental models and convention placement.
- **`validate_user_journey`**: Traverses prototype interaction noodles to detect **orphan screens** (unlinked artboards), **dead-end screens** (trapped users without back or exit affordance), and **unprotected destructive actions** (lacking confirmation dialogs).
- **`generate_interactive_variants`**: Creates production-ready Figma Component Sets with **Default, Hover, Pressed, Focused (WCAG 2.4.7 accessible focus ring), and Disabled** states, pre-wired with `whileHover` and `whilePress` Smart Animate transitions.
- **`lint_ux_microcopy`**: Audits UX writing anti-patterns (Lorem Ipsum, ambiguous CTAs like *"Submit"*, robotic blaming errors like *"Invalid input"*), providing empathetic, high-converting copy recommendations.

### 4. Observability & Audit Trails (Enterprise)
- **Structured JSON Logging**: Powered by `pino` directed strictly to `stderr` (preserving STDIO JSON-RPC integrity). Configurable log level via `LOG_LEVEL=info|debug|warn`.
- **Request Correlation**: Each tool invocation is assigned an 8-character `requestId` tracked from receipt through plugin completion.
- **Audit Logging**: All mutating canvas operations (`create_frame`, `set_prototype_interaction`, `delete_nodes`, `generate_ui_tree`, etc.) record an explicit structured `AUDIT` record with file, page, and mutation metadata.
- **Actionable Error Recovery**: Failed node lookups return a helpful recovery payload listing the available screens/frames on the active page so agents can self-heal.

### 5. Declarative Screen Generation (Step 4)
- **`generate_ui_tree`**: Generates full screens with AutoLayout, typography, colors, and tagged interactive elements in a single atomic call:
  - **Presets**: `iPhone 16`, `iPhone 16 Pro Max`, `Android`, `Desktop`, `Tablet`.
  - **Elements**: `frame`, `card`, `button`, `text`, `divider`, `spacer`.
  - **Tag Registry**: Assigns tags (e.g. `tag: "signup_btn"`) and returns a map of `{ [tag]: nodeId }` for instant prototyping.

### 6. Interactive Prototyping Engine (Step 5)
- **`set_prototype_interaction`**: Wires interactive prototype transitions between elements:
  - **Triggers**: `ON_CLICK`, `ON_HOVER`, `ON_PRESS`, `AFTER_TIMEOUT`.
  - **Navigations**: `NAVIGATE`, `OVERLAY`, `SWAP`, `BACK`, `CLOSE`.
  - **Transitions**: `SMART_ANIMATE`, `DISSOLVE`, `SLIDE_IN`, `MOVE_IN`, `INSTANT`.
- **`set_flow_starting_point`**: Sets named prototype flow starting points (e.g. *"Onboarding Flow"*).
- **`get_prototype_connections`**: Audits all flow starting points and prototype connections on the page.
- **`batch_link_prototype`**: Wires multiple screen transitions across a user journey in one call.

### 7. Canvas Primitives, Components & Polish
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
