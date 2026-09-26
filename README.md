# Figma MCP — AI-Native UI/UX & Prototyping Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol-green.svg)](https://modelcontextprotocol.io/)
[![Figma Plugin API](https://img.shields.io/badge/Figma-Plugin%20API%201.0-purple.svg)](https://www.figma.com/plugin-docs/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)

An enterprise-grade **Model Context Protocol (MCP)** server and companion **Figma Desktop Plugin** that transforms AI assistants (Claude, Cursor, Antigravity) into autonomous, production-ready UI/UX designers and interactive prototyping engineers.

---

## 🎯 The Problem

While Large Language Models (LLMs) can generate code and draft wireframes, AI-assisted design in Figma has historically failed due to five critical bottlenecks:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE 5 DESIGN BOTTLENECKS                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. The "Read-Only" API Barrier                                                         │
│    Figma's cloud REST API is strictly read-only for canvas graphics. It cannot create │
│    frames, render vectors, configure AutoLayout, or wire prototypes on an active canvas.│
│                                                                                        │
│ 2. The Multi-Roundtrip "Latency Explosion"                                              │
│    Building a single screen via individual tool calls (create_frame -> create_rect...) │
│    requires 100+ roundtrips, exhausting context windows and causing timeout failures.   │
│                                                                                        │
│ 3. The "AI Slop" & HCI Deficiency                                                      │
│    LLMs produce amateur visual outputs: littering buttons with emojis, uncalibrated     │
│    line heights that clip text, arbitrary spacing (13px, 27px), and tiny touch targets  │
│    (< 44px) that violate Apple HIG, Google Material, and WCAG accessibility standards. │
│                                                                                        │
│ 4. The "Happy-Path Only" Illusion (No UX Depth)                                        │
│    AI generates exclusively the "ideal" state with perfect mock data. Real users spend │
│    50% of their time in empty states, loading skeletons, error screens, and edge cases. │
│                                                                                        │
│ 5. Dead-End Journeys & Missing Affordances                                             │
│    AI outputs isolated, static screens that trap users without back affordances, lacks  │
│    tactile interactive states (Hover, Pressed, Focus Rings), and uses vague CTAs.      │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 The Solution

This project solves all five bottlenecks with a unified **Dual-Transport Architecture**, an **Atomic Declarative UI Engine**, an **Enterprise Design Guardian**, and a **Cognitive UX Intelligence Layer**:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              THE ARCHITECTURAL SOLUTION                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Dual-Transport Canvas Bridge                                                        │
│    Pairs standard STDIO (JSON-RPC) for AI clients with a high-speed local WebSocket    │
│    bridge (ws://localhost:3055) to a native desktop plugin with 100% canvas write API. │
│                                                                                        │
│ 2. Declarative Tree Engine (`generate_ui_tree`)                                        │
│    Compiles an entire nested screen hierarchy with AutoLayout, typography, colors, and │
│    semantic tags in a single atomic payload in under 200ms.                             │
│                                                                                        │
│ 3. Enterprise Design Guardian & HCI Engine                                             │
│    - Zero-Emoji Sanitizer: Strips emojis and routes to vector SVG icons.               │
│    - Intelligent Typography: Auto-calibrates leading (1.15x-1.5x) and optical tracking.│
│    - 8pt Spatial Grid: Snaps all paddings, gaps, and sizes to 4pt/8pt rhythm.           │
│    - Fitts's Law Enforcer: Clamps all clickable targets to >= 44x44px.                 │
│                                                                                        │
│ 4. The "5 States of UI" Engine (`generate_state_matrix`)                              │
│    Generates Ideal, Empty Onboarding, Loading Skeleton Shimmer, Empathetic Error with  │
│    1-click retry, and Partial/Boundary stress-test states in one call.                 │
│                                                                                        │
│ 5. Cognitive Psychology & Journey Continuity                                          │
│    - `audit_ux_heuristics`: Scores Hick's Law, Fitts's Law, Miller's Law, Jakob's Law.│
│    - `validate_user_journey`: Detects orphan screens, dead-end loops, & unsafe actions.│
│    - `generate_interactive_variants`: Creates Component Sets with Hover, Press, & Ring.│
│    - `lint_ux_microcopy`: Eliminates Lorem Ipsum & ambiguous CTAs with empathetic copy.│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architecture

```
┌─────────────────────────┐          STDIO          ┌──────────────────────────┐
│   AI Coding Assistant   │ ◄─────────────────────► │   Node.js MCP Server     │
│ (Antigravity / Claude)  │                         │       (figma-mcp CLI)    │
└─────────────────────────┘                         └────────────┬─────────────┘
                                                                 │
                                                       WebSocket │ ws://localhost:3055
                                                                 ▼
┌─────────────────────────┐     Plugin API (Canvas)  ┌──────────────────────────┐
│   Figma Canvas Engine   │ ◄──────────────────────► │   Figma Desktop Plugin   │
│  (Shapes, AutoLayout,   │                          │  (dist/figma-companion) │
│   Prototype Reactions)  │                          └──────────────────────────┘
└─────────────────────────┘
```

1. **MCP Server (`packages/mcp-server`)**: Communicates over standard `STDIO` with LLM clients, exposing **39 specialized design and UX tools**, while hosting a dual-stack local loopback WebSocket server on port `3055`.
2. **Figma Companion Plugin (`packages/figma-plugin`)**: Sandboxed plugin running inside Figma Desktop. Connects to the local bridge and directly executes native `figma.*` canvas operations, font loading, AutoLayout hierarchy, and prototype interaction noodles.

---

## ⚡ 60-Second Quickstart (For End Users)

### 1. Load Companion Plugin in Figma Desktop
1. Download or extract **[`dist-release/figma-companion-plugin.zip`](./dist-release/figma-companion-plugin.zip)** (17 KB standalone bundle).
2. In Figma Desktop, open any file $\rightarrow$ right-click canvas $\rightarrow$ **Plugins** $\rightarrow$ **Development** $\rightarrow$ **"Import plugin from manifest..."**.
3. Select `manifest.json` from the extracted folder.
4. Press `Ctrl + Alt + P` (Windows) or `Cmd + Opt + P` (Mac) to run the plugin.

### 2. Configure Your AI Client

#### Claude Desktop (`claude_desktop_config.json`)
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

#### Cursor (`.cursor/mcp.json`)
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

#### Antigravity / Gemini / Custom MCP Client
* **Command:** `npx -y figma-mcp`
* **Transport:** `STDIO`

---

## 🛠️ Complete Toolset Reference (39 Tools)

### 🧠 1. UX Intelligence & Cognitive Architecture (New)
* **`generate_state_matrix`**: Generates the **5 Essential States of UI** (*Ideal, Empty Onboarding, Loading Skeleton Shimmer, Empathetic Error with 1-click retry, and Partial/Boundary Stress Test*) organized neatly inside a labeled Section or Component Set.
* **`audit_ux_heuristics`**: Scores screens against empirical cognitive psychology:
  * **Hick’s Law:** Calculates decision latency ($T = b \log_2(n+1)$) and flags choice overload ($> 7\pm2$ choices) or competing primary CTAs.
  * **Fitts’s Law:** Checks touch ergonomics ($< 44\text{px}$) and flags destructive buttons placed dangerously close ($< 60\text{px}$) to primary progression actions.
  * **Miller’s Law:** Flags unchunked walls of inputs/items exceeding working memory thresholds.
  * **Jakob’s Law:** Audits standard convention placement for navigation, search, and avatar controls.
* **`validate_user_journey`**: Traverses prototype interaction noodles across artboards to detect **orphan screens** (unlinked artboards), **dead-end screens** (trapped users without back or exit affordance), and **unprotected destructive actions** (lacking confirmation dialogs).
* **`generate_interactive_variants`**: Creates production-ready Figma Component Sets with **Default, Hover, Pressed, Focused (WCAG 2.4.7 accessible focus ring), and Disabled** states, pre-wired with `whileHover` and `whilePress` Smart Animate transitions.
* **`lint_ux_microcopy`**: Audits UX writing anti-patterns (Lorem Ipsum, ambiguous CTAs like *"Submit"*, robotic blaming errors like *"Invalid input"*), providing empathetic, high-converting copy recommendations.

---

### 🎨 2. Declarative Generation & Design Guardian
* **`generate_ui_tree`**: Generates full hierarchical screens with AutoLayout, typography, colors, and tagged interactive elements in a single atomic call:
  * **Presets**: `iPhone 16`, `iPhone 16 Pro Max`, `Android`, `Desktop`, `Tablet`.
  * **Elements**: `frame`, `card`, `button`, `text`, `divider`, `spacer`.
  * **Tag Registry**: Assigns semantic tags (e.g. `tag: "signup_btn"`) and returns a map of `{ [tag]: nodeId }` for instant prototyping.
* **`lint_design_compliance`**: Automated HCI & visual design auditor checking 44px touch targets, 8pt grid consistency, calibrated leading, and zero emojis.
* **Zero-Emoji Enforcement**: Automatically sanitizes emojis from all text operations, preventing cartoonish outputs and routing to vector SVG paths.
* **Intelligent Typography**: Calibrates leading ($1.15\times - 1.5\times$ font size) and proportional tracking based on font size and weight.
* **8pt Spatial Grid**: Automatic snapping of margins, paddings, and gap dimensions.
* **Touch Target Enforcer**: Guarantees a minimum $44\times44\text{px}$ bounding box for interactive elements (Apple HIG & Google Material compliance).

---

### ⚡ 3. Interactive Prototyping & Flow Engine
* **`set_prototype_interaction`**: Wires interactive transitions between elements:
  * **Triggers**: `ON_CLICK`, `ON_HOVER`, `ON_PRESS`, `AFTER_TIMEOUT`.
  * **Navigations**: `NAVIGATE`, `OVERLAY`, `SWAP`, `BACK`, `CLOSE`.
  * **Transitions**: `SMART_ANIMATE`, `DISSOLVE`, `SLIDE_IN`, `MOVE_IN`, `INSTANT`.
* **`set_flow_starting_point`**: Sets named prototype flow starting points (e.g. *"Onboarding Flow"*).
* **`get_prototype_connections`**: Audits all flow starting points and prototype connection noodles on the page.
* **`batch_link_prototype`**: Wires multiple screen transitions across a user journey in one call.
* **`set_overlay_interaction`**: Configures modal dialogs, slide-over panels, and dropdown overlays with customizable backdrops, animations, and click-outside dismissal rules.

---

### 📐 4. Canvas Primitives, Components & Polish
* **`create_frame`**: Creates container frames or artboards.
* **`create_rectangle`**: Creates shapes, cards, or placeholders.
* **`create_ellipse`**: Creates circular/elliptical shapes (avatars, badges, status dots).
* **`create_svg_icon`**: Renders and inserts scalable SVG vector graphics with automatic color tinting.
* **`create_component`**: Creates master design system components.
* **`create_component_instance`**: Instantiates linked component instances from any master component ID.
* **`set_effects`**: Applies elevation shadows, inner shadows, layer blurs, and background blurs (`DROP_SHADOW`, `INNER_SHADOW`, `LAYER_BLUR`, `BACKGROUND_BLUR`).
* **`create_section`**: Groups and categorizes artboards and user journey paths into organized, labeled Figma Sections.
* **`focus_viewport`**: Pans and zooms the canvas viewport directly to specified nodes, with optional selection.
* **`create_text`**: Inserts typography with automatic font preloading (`Inter`, `Roboto`, etc.).
* **`set_autolayout`**: Applies Flexbox/AutoLayout (direction, gap, padding, axis alignments).
* **`update_node`**: Modifies position, dimensions, fills, corner radius, opacity, or visibility.
* **`delete_nodes`**: Deletes one or more nodes by ID.
* **`duplicate_node`**: Clones frames or elements with offsets (ideal for prototype state variants).
* **`set_stroke`**: Configures border colors, thicknesses, and alignments.
* **`set_text_content`**: Updates text copy while preserving typography styles.
* **`find_nodes`**: Searches canvas by keyword or node type.
* **`manage_page`**: Creates or switches active pages.
* **`get_document_tokens`**: Extracts local color paint styles, text typography styles, and effect styles directly from the document.
* **`export_node_image`**: Exports 2x Retina PNG snapshots as base64 for visual verification.

---

### 🔍 5. Canvas Diagnostics & Semantic Inspection
* **`get_figma_status`**: Checks whether the Figma Desktop companion plugin is connected.
* **`ping_figma`**: Tests round-trip WebSocket latency and document verification.
* **`get_document_info`**: Retrieves document name, pages list, active page, and selection count.
* **`get_design_context`**: Extracts a token-efficient semantic design outline of the page (artboards, buttons, cards, inputs, and prototype starting points) without vector noise.
* **`inspect_node`**: Recursively inspects any node by ID with strict depth capping (max 4) to protect LLM context windows.
* **`get_selection`**: Inspects details of elements currently highlighted on the canvas.

---

### ☁️ 6. Figma Cloud REST Tools (Headless Access)
*Optional: Requires `FIGMA_ACCESS_TOKEN` for cloud inspection without the desktop app:*
* **`rest_get_file`**: Read full file metadata, version history, components, and document tree from Figma Cloud.
* **`rest_get_file_nodes`**: Fetch specific node hierarchies by ID from the cloud.
* **`rest_get_images`**: Render high-resolution PNG, SVG, JPG, or PDF exports of frames via Figma's cloud render engine.
* **`rest_get_comments`**: Read collaboration comment threads, reviews, and pin coordinates.
* **`rest_post_comment`**: Post review feedback directly to a Figma screen pin via REST API.
* **`rest_get_variables`**: Read Figma Enterprise / Organization Variables (color themes, spacing scales, modes).
* **`rest_get_components`**: List published component library definitions and documentation links.

---

## 📦 MCP Resources & Prompts

### Resources (URI-Addressable Design State)
* **`figma://document/summary`**: Document outline, active pages, and selected canvas elements.
* **`figma://tokens/active`**: Complete design token registry (colors, typography styles, effect styles).
* **`figma://prototype/flows`**: Interactive connection graph and flow starting points on the page.

### High-Level Prompts (Guided Autonomous Workflows)
* **`architect_ux_experience`**: Guides the AI to conduct a comprehensive UX architectural review, generate the 5 UI states, audit cognitive heuristics, and validate user journey flow continuity.
* **`design_product_flow`**: Guided workflow taking a product concept, generating screens with AutoLayout, registering tags, and wiring interactive animations.
* **`wire_interactive_prototype`**: Guides the agent through discovering interactive targets and establishing seamless user journeys.
* **`audit_ux_design`**: Executes an accessibility, touch target ($\ge 44\text{px}$), spacing consistency, and visual hierarchy audit.

---

## 🛠️ Local Monorepo Development

```bash
# 1. Install dependencies
npm install

# 2. Build monorepo workspaces
npm run build

# 3. Clean port 3055 if locked by a background process
npm run clean:port

# 4. Package standalone plugin & zip
npm run package

# 5. Run server in development watch mode
npm run dev:server
```

---

## 🌐 Dual Transport & Cloud Deployment

### 1. Local Mode (Default STDIO)
Used by Claude Desktop, Cursor, and Antigravity:
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
* **`GET /health`**: Health check, uptime, bridge status, and REST config.
* **`GET /sse`**: SSE connection stream.
* **`POST /messages?sessionId=...`**: JSON-RPC message ingress.

### 3. Docker Container Deployment
Run with Docker Compose:
```bash
docker compose up -d --build
curl http://localhost:3000/health
```

---

## 📄 License

MIT © [Chimbueze David](https://github.com/ChimbuezeDavid)
