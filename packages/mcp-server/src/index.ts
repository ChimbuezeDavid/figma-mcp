#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { bridge } from "./bridge.js";
import { logger } from "./logger.js";
import { restClient } from "./rest-client.js";

// Initialize the Figma MCP server
const server = new McpServer({
  name: "figma-mcp",
  version: "1.0.0",
});

// Tool: Check bridge status
server.tool(
  "get_figma_status",
  "Check whether the Figma Desktop companion plugin is connected and get active document metadata",
  {},
  async () => {
    const status = bridge.getStatus();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(status, null, 2),
        },
      ],
    };
  }
);

// Tool: Ping Figma plugin to test latency and round-trip communication
server.tool(
  "ping_figma",
  "Ping the connected Figma companion plugin to verify live canvas communication",
  {
    message: z.string().optional().describe("Optional message to echo back"),
  },
  async ({ message }) => {
    const startTime = Date.now();
    const result = await bridge.sendCommand<{ echo?: string; timestamp: number }>("ping", {
      message: message || "Hello from MCP Server",
    });
    const roundtripMs = Date.now() - startTime;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "success",
              roundtripMs,
              response: result,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: Get Figma document details and current selection
server.tool(
  "get_document_info",
  "Retrieve the active Figma document name, all pages, current page, and currently selected nodes",
  {},
  async () => {
    const result = await bridge.sendCommand("get_document_info", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create a frame on the canvas or within a parent frame
server.tool(
  "create_frame",
  "Create a new frame (container or artboard) on the Figma canvas",
  {
    name: z.string().optional().describe("Name of the frame (e.g., 'Home Screen', 'Card')"),
    width: z.number().optional().describe("Width in pixels (defaults to 375 for mobile screens)"),
    height: z.number().optional().describe("Height in pixels (defaults to 812 for mobile screens)"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
    fill: z.string().optional().describe("Hex color fill, e.g. '#FFFFFF' or '#F3F4F6'"),
    cornerRadius: z.number().optional().describe("Corner radius in pixels"),
    parentId: z.string().optional().describe("Parent Frame node ID, or omit for canvas root"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_frame", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create a rectangle shape
server.tool(
  "create_rectangle",
  "Create a rectangle or box element (useful for cards, buttons, visual dividers)",
  {
    name: z.string().optional().describe("Name of the rectangle"),
    width: z.number().optional().describe("Width in pixels"),
    height: z.number().optional().describe("Height in pixels"),
    x: z.number().optional().describe("X coordinate"),
    y: z.number().optional().describe("Y coordinate"),
    fill: z.string().optional().describe("Hex color fill, e.g. '#3B82F6'"),
    cornerRadius: z.number().optional().describe("Corner radius in pixels"),
    parentId: z.string().optional().describe("Parent Frame node ID"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_rectangle", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create a text layer
server.tool(
  "create_text",
  "Create a styled text element on the Figma canvas or inside a container. Strictly disallows emojis (use 'create_svg_icon' for vector icons). Automatically calculates and applies calibrated proportional leading (line-height) and optical tracking (letter-spacing) according to typographic hierarchy.",
  {
    text: z.string().describe("The text content to display (must NOT contain emojis; use clean UI copy)"),
    fontSize: z.number().optional().describe("Font size in pixels (defaults to 16)"),
    fontFamily: z.string().optional().describe("Font family (defaults to 'Inter')"),
    fontWeight: z.string().optional().describe("Font weight: 'Regular', 'Medium', 'Bold'"),
    fill: z.string().optional().describe("Text color in hex, e.g. '#111827'"),
    x: z.number().optional().describe("X coordinate"),
    y: z.number().optional().describe("Y coordinate"),
    width: z.number().optional().describe("Optional fixed width (auto-height wrapping)"),
    parentId: z.string().optional().describe("Parent Frame node ID"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_text", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Helper to resolve local file paths or base64 image strings into sanitized data URIs
function resolveLocalImage(imageStr?: string): string | undefined {
  if (!imageStr) return undefined;
  if (imageStr.startsWith("http://") || imageStr.startsWith("https://")) {
    return imageStr;
  }
  if (imageStr.startsWith("data:")) {
    // Strip extraneous whitespace/newlines from base64
    const [header, data] = imageStr.split(",");
    if (data) {
      return `${header},${data.replace(/\s+/g, "")}`;
    }
    return imageStr.replace(/\s+/g, "");
  }
  // Check local filesystem
  try {
    const cleanPath = imageStr.trim().replace(/^file:\/\/\/?/, "");
    if (fs.existsSync(cleanPath)) {
      const ext = path.extname(cleanPath).toLowerCase();
      let mime = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") mime = "image/jpeg";
      else if (ext === ".svg") mime = "image/svg+xml";
      else if (ext === ".webp") mime = "image/webp";
      const buffer = fs.readFileSync(cleanPath);
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }
  } catch (err: any) {
    logger.warn(`Could not resolve local image path "${imageStr}": ${err?.message || err}`);
  }
  return imageStr;
}

function resolveSpecImages(node: any) {
  if (!node || typeof node !== "object") return;
  if (typeof node.image === "string") {
    node.image = resolveLocalImage(node.image);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      resolveSpecImages(child);
    }
  }
}

// Tool: Set AutoLayout on a Frame
server.tool(
  "set_autolayout",
  "Configure Flexbox/AutoLayout rules (direction, padding, gap, alignment, wrapping) on an existing frame",
  {
    nodeId: z.string().describe("The Frame node ID to apply AutoLayout to"),
    direction: z.enum(["HORIZONTAL", "VERTICAL", "NONE"]).describe("Layout direction"),
    spacing: z.number().optional().describe("Gap/spacing between child items in pixels"),
    padding: z.number().optional().describe("Uniform padding on all sides in pixels"),
    paddingTop: z.number().optional().describe("Top padding in pixels"),
    paddingBottom: z.number().optional().describe("Bottom padding in pixels"),
    paddingLeft: z.number().optional().describe("Left padding in pixels"),
    paddingRight: z.number().optional().describe("Right padding in pixels"),
    primaryAxisAlignItems: z
      .enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"])
      .optional()
      .describe("Alignment along the primary axis"),
    counterAxisAlignItems: z
      .enum(["MIN", "CENTER", "MAX", "BASELINE"])
      .optional()
      .describe("Alignment along the cross axis"),
    primaryAxisSizing: z.enum(["FIXED", "AUTO"]).optional().describe("FIXED or AUTO (Hug)"),
    counterAxisSizing: z.enum(["FIXED", "AUTO"]).optional().describe("FIXED or AUTO (Hug)"),
    wrap: z.boolean().optional().describe("Enable multi-line flex wrapping (layoutWrap = 'WRAP') for pill/badge clouds"),
    counterAxisSpacing: z.number().optional().describe("Cross-axis gap between wrapped rows in pixels"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_autolayout", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Update properties of an existing node
server.tool(
  "update_node",
  "Update dimensions, coordinates, fills, images (supports local file paths), corner radius, opacity, layout alignment, or text auto-resize of an existing node",
  {
    nodeId: z.string().describe("Target node ID"),
    name: z.string().optional().describe("New name for the node"),
    x: z.number().optional().describe("New X coordinate"),
    y: z.number().optional().describe("New Y coordinate"),
    width: z.number().optional().describe("New width in pixels"),
    height: z.number().optional().describe("New height in pixels"),
    fill: z.string().optional().describe("New hex color fill (e.g. '#FFFFFF')"),
    image: z.string().optional().describe("New image URL, local file path, or base64 data URI"),
    cornerRadius: z.number().optional().describe("New corner radius"),
    opacity: z.number().optional().describe("Opacity from 0 to 1"),
    visible: z.boolean().optional().describe("Visibility boolean"),
    layoutAlign: z.enum(["INHERIT", "STRETCH", "MIN", "CENTER", "MAX"]).optional().describe("Layout alignment in parent flex container"),
    layoutGrow: z.number().optional().describe("Flex grow factor (0 or 1)"),
    textAutoResize: z.enum(["NONE", "WIDTH_AND_HEIGHT", "HEIGHT", "TRUNCATE"]).optional().describe("Text auto-resize mode"),
    primaryAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "SPACE_BETWEEN"]).optional().describe("Primary axis alignment for frames"),
    counterAxisAlignItems: z.enum(["MIN", "CENTER", "MAX", "BASELINE"]).optional().describe("Counter axis alignment for frames"),
    itemSpacing: z.number().optional().describe("AutoLayout gap between children"),
  },
  async (params) => {
    if (params.image) {
      params.image = resolveLocalImage(params.image);
    }
    const result = await bridge.sendCommand("update_node", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Delete one or multiple nodes
server.tool(
  "delete_nodes",
  "Delete one or more nodes from the Figma canvas by their IDs",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to remove"),
  },
  async (params) => {
    const result = await bridge.sendCommand("delete_nodes", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Duplicate a node
server.tool(
  "duplicate_node",
  "Duplicate an existing node or screen (e.g. for creating variant states for prototyping)",
  {
    nodeId: z.string().describe("ID of the node to duplicate"),
    offsetX: z.number().optional().describe("Horizontal offset for the duplicate (defaults to +40)"),
    offsetY: z.number().optional().describe("Vertical offset for the duplicate (defaults to 0)"),
    name: z.string().optional().describe("Optional new name for the duplicate"),
  },
  async (params) => {
    const result = await bridge.sendCommand("duplicate_node", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Set Stroke (border) on a node
server.tool(
  "set_stroke",
  "Add or update border stroke on a frame, card, button, or rectangle",
  {
    nodeId: z.string().describe("Target node ID"),
    color: z.string().describe("Hex stroke color (e.g. '#E2E8F0')"),
    weight: z.number().optional().describe("Stroke border width in pixels (defaults to 1)"),
    strokeAlign: z.enum(["INSIDE", "OUTSIDE", "CENTER"]).optional().describe("Border alignment"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_stroke", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Set Text Content
server.tool(
  "set_text_content",
  "Update the characters of an existing text layer. Emojis are strictly sanitized and proportional leading and tracking are automatically recalibrated.",
  {
    nodeId: z.string().describe("Text node ID"),
    text: z.string().describe("New text content (must NOT contain emojis)"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_text_content", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Find Nodes by name or type
server.tool(
  "find_nodes",
  "Search for nodes on the current page by name keyword or node type (FRAME, TEXT, RECTANGLE, etc.)",
  {
    query: z.string().optional().describe("Name substring to search for (case-insensitive)"),
    type: z.string().optional().describe("Node type filter (e.g., 'FRAME', 'TEXT', 'COMPONENT')"),
    limit: z.number().optional().describe("Max number of matches to return (defaults to 50)"),
  },
  async (params) => {
    const result = await bridge.sendCommand("find_nodes", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Manage Pages
server.tool(
  "manage_page",
  "Create a new page in the document or switch the active page",
  {
    action: z.enum(["create", "set_active"]).describe("Action to perform"),
    name: z.string().optional().describe("Page name to create or switch to"),
    pageId: z.string().optional().describe("Page ID to switch to"),
  },
  async (params) => {
    const result = await bridge.sendCommand("manage_page", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Export Node Image
server.tool(
  "export_node_image",
  "Render a PNG snapshot of a frame or component and return as base64 data URI for visual feedback",
  {
    nodeId: z.string().describe("Node ID to export"),
    scale: z.number().optional().describe("Export scale (defaults to 2 for sharp Retina display)"),
  },
  async (params) => {
    const result = await bridge.sendCommand("export_node_image", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              nodeId: result.nodeId,
              name: result.name,
              format: result.format,
              imagePreview: result.base64Data ? `${result.base64Data.slice(0, 80)}...` : undefined,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: Inspect a node
server.tool(
  "inspect_node",
  "Inspect detailed properties, layout settings, dimensions, and children of any node by ID",
  {
    nodeId: z.string().describe("The Figma node ID to inspect"),
    maxDepth: z.number().optional().describe("Maximum hierarchy depth to inspect (defaults to 3)"),
  },
  async (params) => {
    const result = await bridge.sendCommand("inspect_node", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Get current canvas selection
server.tool(
  "get_selection",
  "Inspect currently selected elements on the Figma canvas",
  {},
  async () => {
    const result = await bridge.sendCommand("get_selection", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Get Design Context (Enterprise Data Minimization)
server.tool(
  "get_design_context",
  "Retrieve a token-efficient semantic outline of the active document page or a specific screen (screens, buttons, cards, inputs, and flow starting points) without heavy vector noise",
  {
    screenId: z.string().optional().describe("Optional Screen/Frame node ID to inspect. If omitted, outlines all screens on the current page."),
  },
  async (params) => {
    const result = await bridge.sendCommand("get_design_context", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Declarative UI Screen Generator
server.tool(
  "generate_ui_tree",
  "Generate a complete UI screen or component hierarchy in a single atomic pass from a structured JSON specification. Enforces enterprise UI/UX & HCI standards: strictly disallows emojis (use 'create_svg_icon' for icons), snaps spacing to 8pt grid, enforces minimum 44px interactive touch targets per Apple HIG / WCAG (Fitts's Law), and applies calibrated typography leading and tracking.",
  {
    spec: z
      .record(z.any())
      .describe(
        "Declarative ScreenSpec object containing name, preset ('iPhone 16', 'Desktop', etc.), fill, padding, spacing, and children array with typed elements ('frame', 'card', 'button', 'text', 'divider', 'spacer') and optional 'tag' identifiers for interaction linking. Note: Do NOT use emojis in buttons or text."
      ),
  },
  async ({ spec }) => {
    let resolvedSpec = spec;
    if (spec.specFilePath) {
      const cleanPath = String(spec.specFilePath).trim().replace(/^file:\/\/\/?/, "");
      if (fs.existsSync(cleanPath)) {
        resolvedSpec = JSON.parse(fs.readFileSync(cleanPath, "utf-8"));
      } else {
        throw new Error(`ScreenSpec file not found at path: ${spec.specFilePath}`);
      }
    }
    resolveSpecImages(resolvedSpec);
    const result = await bridge.sendCommand("generate_ui_tree", resolvedSpec, 90000);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Plan Screen Architecture & Decompose Sequential Execution (Create or Edit)
server.tool(
  "plan_screen_architecture",
  "Architect and plan a multi-section UI screen creation OR design edit/refactor before code generation. Decomposes the UI into an ordered sequence of structured steps, establishes typography scale, 8pt grid dimensions, and layout constraints (wrapping, auto-layout directions, stretch alignment) to guarantee zero overflow/overlap. MANDATORY PROTOCOL GATE: Once this tool returns, the LLM MUST present the generated roadmap to the user for explicit confirmation before executing any canvas mutations.",
  {
    mode: z
      .enum(["create", "edit"])
      .default("create")
      .describe("Planning mode: 'create' for new screens from scratch, 'edit' for refactoring/improving existing nodes"),
    screenName: z.string().describe("Screen or component name, e.g. 'Institutional Consulting Landing Page' or 'Hero Section Refactor'"),
    preset: z
      .enum(["Desktop", "iPhone 16", "iPhone 16 Pro Max", "Android", "Tablet", "Custom"])
      .optional()
      .describe("Target frame preset (required for 'create', optional for 'edit')"),
    archetype: z
      .enum(["institutional", "modern-saas", "corporate", "creative-editorial"])
      .default("institutional")
      .describe("Typography archetype"),
    palette: z
      .object({
        background: z.string().optional().describe("Background hex, e.g. '#FBF9F5'"),
        surface: z.string().optional().describe("Surface/card hex, e.g. '#FFFFFF'"),
        primary: z.string().optional().describe("Primary brand color, e.g. '#0A192F'"),
        accent: z.string().optional().describe("Accent/gold color, e.g. '#C5A880'"),
        textPrimary: z.string().optional().describe("High-contrast text, e.g. '#0A192F'"),
        textSecondary: z.string().optional().describe("Muted copy, e.g. '#4A5568'"),
        border: z.string().optional().describe("Subtle border, e.g. '#E2DCD2'"),
      })
      .optional()
      .describe("Color token palette"),
    sections: z
      .array(
        z.object({
          id: z.string().describe("Unique section identifier (e.g. '01-hero')"),
          name: z.string().describe("Descriptive section name"),
          layout: z.enum(["horizontal", "vertical", "grid", "dual-column"]).describe("Layout pattern"),
          estimatedHeight: z.number().describe("Estimated height in pixels (8pt multiple)"),
          elements: z.array(z.string()).describe("Content items and elements in this section"),
          antiOverflowRules: z.array(z.string()).describe("Rules to eliminate overflow: e.g. 'wrap=true on tag cloud', 'text layoutAlign=STRETCH', 'crossAlignItems=min'"),
        })
      )
      .optional()
      .describe("Ordered array of sections to build sequentially (for 'create' mode)"),
    // Edit mode specific parameters
    targetNodeIds: z.array(z.string()).optional().describe("Figma node IDs to be edited/refactored (for 'edit' mode)"),
    refactorGoals: z.array(z.string()).optional().describe("Key refactoring objectives (e.g. 'Fix tag row overflow', 'Elevate typography to 8pt scale')"),
    changes: z
      .array(
        z.object({
          targetNodeId: z.string().describe("Specific node ID to modify"),
          nodeName: z.string().optional().describe("Name of the node in Figma"),
          action: z.enum([
            "modify_layout",
            "restyle_typography",
            "adjust_spacing",
            "insert_elements",
            "remove_elements",
            "fix_overflow",
            "replace_image",
          ]).describe("Type of refactoring action"),
          currentIssues: z.array(z.string()).describe("Observed defects (e.g. overlapping text, hardcoded width, missing wrap)"),
          proposedSolution: z.string().describe("Proposed structural/property modification"),
          proposedProperties: z.record(z.any()).optional().describe("Explicit properties to apply (e.g. { layoutWrap: 'WRAP', itemSpacing: 12 })"),
          antiRegressionRules: z.array(z.string()).describe("Rules to ensure parent/sibling frames do not break"),
        })
      )
      .optional()
      .describe("Ordered array of atomic modifications (for 'edit' mode)"),
  },
  async ({ mode, screenName, preset, archetype, palette, sections, targetNodeIds, refactorGoals, changes }) => {
    const widthMap: Record<string, number> = {
      Desktop: 1440,
      "iPhone 16": 393,
      "iPhone 16 Pro Max": 440,
      Android: 360,
      Tablet: 834,
      Custom: 1440,
    };
    const targetPreset = preset || "Desktop";
    const screenWidth = widthMap[targetPreset] || 1440;
    const contentMaxWidth = targetPreset === "Desktop" ? 1200 : screenWidth - 32;

    const fontPairing = {
      institutional: { heading: "Playfair Display", body: "Inter", accent: "Cinzel" },
      "modern-saas": { heading: "Inter", body: "Inter", accent: "Inter" },
      corporate: { heading: "Roboto", body: "Inter", accent: "Roboto Mono" },
      "creative-editorial": { heading: "Playfair Display", body: "Inter", accent: "Playfair Display" },
    }[archetype];

    const typographyScale = {
      display: { variant: "display-xl", size: 48, lineHeight: 56, weight: "Bold", role: "Hero headline" },
      sectionHeading: { variant: "h1", size: 30, lineHeight: 38, weight: "SemiBold", role: "Major section headers" },
      cardTitle: { variant: "h2", size: 24, lineHeight: 32, weight: "SemiBold", role: "Card titles & modal headers" },
      subheading: { variant: "subheading", size: 18, lineHeight: 26, weight: "Medium", role: "Pillar titles, lead paragraphs" },
      body: { variant: "body-md", size: 14, lineHeight: 22, weight: "Regular", role: "Descriptions, bullet points" },
      caption: { variant: "caption", size: 12, lineHeight: 16, weight: "Medium", role: "Metadata, pills, tags" },
    };

    const antiOverflowProtocol = [
      "1. Never use single-line textAutoResize in vertical cards or containers. Set text width='fill' or layoutAlign='STRETCH'.",
      "2. Any horizontal row of dynamic items (pills, badges, logos, metrics) must specify wrap=true and counterAxisSpacing=8.",
      "3. Multi-column sections with unequal heights must use crossAlignItems='min' (top-aligned) to prevent bottom card drift.",
      "4. All images must be resolved via local file paths or sanitized base64; fallbacks must use branded surface fills (#EDE8DC) instead of empty fills.",
    ];

    if (mode === "edit") {
      const editPlan = {
        meta: {
          mode: "edit",
          screenName,
          targetNodeIds: targetNodeIds || [],
          refactorGoals: refactorGoals || [],
          gridUnit: "8pt",
        },
        requiresUserConfirmation: true,
        executionGate: "LOCKED - Present this plan to the user and obtain explicit confirmation before executing canvas mutations.",
        confirmationPrompt: `Please confirm: Proceed with the ${changes?.length || 0}-step refactoring plan for '${screenName}'?`,
        typography: {
          archetype,
          fontPairing,
          scale: typographyScale,
        },
        antiOverflowProtocol,
        sequentialRoadmap: (changes || []).map((c, index) => ({
          step: index + 1,
          targetNodeId: c.targetNodeId,
          nodeName: c.nodeName || `Node ${c.targetNodeId}`,
          action: c.action,
          diagnosis: c.currentIssues,
          solution: c.proposedSolution,
          proposedProperties: c.proposedProperties || {},
          antiRegressionGuarantees: c.antiRegressionRules,
          executionInstruction: `Apply ${c.action} on node '${c.targetNodeId}' with constraints: ${c.proposedSolution}`,
        })),
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(editPlan, null, 2),
          },
        ],
      };
    }

    // Default: "create" mode
    const totalEstimatedHeight = (sections || []).reduce((sum, s) => sum + s.estimatedHeight, 0);

    const blueprint = {
      meta: {
        mode: "create",
        screenName,
        preset: targetPreset,
        canvasWidth: screenWidth,
        contentMaxWidth,
        totalEstimatedHeight,
        gridUnit: "8pt",
      },
      requiresUserConfirmation: true,
      executionGate: "LOCKED - Present this plan to the user and obtain explicit confirmation before executing canvas mutations.",
      confirmationPrompt: `Please confirm: Proceed with generating the ${(sections || []).length}-section screen '${screenName}'?`,
      typography: {
        archetype,
        fontPairing,
        scale: typographyScale,
      },
      palette: palette || {
        background: "#FBF9F5",
        surface: "#FFFFFF",
        primary: "#0A192F",
        accent: "#C5A880",
        textPrimary: "#0A192F",
        textSecondary: "#4A5568",
        border: "#E2DCD2",
      },
      antiOverflowProtocol,
      sequentialRoadmap: (sections || []).map((s, index) => ({
        step: index + 1,
        sectionId: s.id,
        name: s.name,
        targetDimensions: { width: contentMaxWidth, estimatedHeight: s.estimatedHeight },
        layoutMode: s.layout,
        antiOverflowConstraints: s.antiOverflowRules,
        executionInstruction: `Generate section '${s.name}' as a vertical or horizontal container with width='fill' or ${contentMaxWidth}px, applying 8pt spacing and typography scale tokens.`,
      })),
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(blueprint, null, 2),
        },
      ],
    };
  }
);

// Tool: Set Prototype Interaction
server.tool(
  "set_prototype_interaction",
  "Wire an interactive prototype transition from a clickable element (button, card) to a target screen or modal",
  {
    sourceNodeId: z.string().describe("The clickable node ID (e.g. button, icon, row)"),
    destinationNodeId: z.string().optional().describe("The destination Frame ID to navigate to"),
    triggerType: z
      .enum(["ON_CLICK", "ON_HOVER", "ON_PRESS", "ON_DRAG", "AFTER_TIMEOUT"])
      .optional()
      .describe("User trigger, defaults to ON_CLICK"),
    timeout: z.number().optional().describe("Timeout delay in milliseconds (for AFTER_TIMEOUT)"),
    navigation: z
      .enum(["NAVIGATE", "OVERLAY", "SWAP", "BACK", "CLOSE", "SCROLL_TO"])
      .optional()
      .describe("Navigation type, defaults to NAVIGATE"),
    transitionType: z
      .enum(["SMART_ANIMATE", "DISSOLVE", "SLIDE_IN", "MOVE_IN", "INSTANT"])
      .optional()
      .describe("Animation transition, defaults to SMART_ANIMATE"),
    direction: z.enum(["LEFT", "RIGHT", "TOP", "BOTTOM"]).optional().describe("Slide/move direction"),
    duration: z.number().optional().describe("Transition duration in seconds, defaults to 0.3"),
    easing: z
      .enum(["EASE_IN_AND_OUT", "EASE_IN", "EASE_OUT", "LINEAR"])
      .optional()
      .describe("Transition easing"),
    resetScrollPosition: z.boolean().optional().describe("Reset scroll position on destination"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_prototype_interaction", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Set Flow Starting Point
server.tool(
  "set_flow_starting_point",
  "Mark a screen frame as a named prototype flow starting point (e.g. 'Onboarding Flow', 'Purchase Flow')",
  {
    nodeId: z.string().describe("Frame node ID to designate as entrypoint"),
    name: z.string().describe("User-facing name of the prototype flow"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_flow_starting_point", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Get Prototype Connections & Flows
server.tool(
  "get_prototype_connections",
  "Inspect all flow starting points and interactive prototype wiring across the current page",
  {},
  async () => {
    const result = await bridge.sendCommand("get_prototype_connections", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Batch Link Prototype
server.tool(
  "batch_link_prototype",
  "Link multiple prototype transitions in a single call (e.g. wiring up an entire user journey)",
  {
    links: z
      .array(
        z.object({
          sourceId: z.string().describe("Clickable node ID"),
          destinationId: z.string().describe("Target screen node ID"),
          trigger: z.enum(["ON_CLICK", "ON_HOVER", "ON_PRESS", "AFTER_TIMEOUT"]).optional(),
          timeout: z.number().optional(),
          transition: z.enum(["SMART_ANIMATE", "DISSOLVE", "SLIDE_IN", "MOVE_IN", "INSTANT"]).optional(),
          direction: z.enum(["LEFT", "RIGHT", "TOP", "BOTTOM"]).optional(),
        })
      )
      .describe("Array of prototype links to establish"),
  },
  async (params) => {
    const result = await bridge.sendCommand("batch_link_prototype", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Get Document Tokens
server.tool(
  "get_document_tokens",
  "Extract active design tokens from the document (local paint color styles, text typography styles, and effect styles)",
  {},
  async () => {
    const result = await bridge.sendCommand("get_document_tokens", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create SVG Icon
server.tool(
  "create_svg_icon",
  "Render and insert scalable SVG vector graphics (icons, logos, custom vector shapes) onto the canvas",
  {
    svg: z.string().describe("Raw SVG XML markup string"),
    name: z.string().optional().describe("Optional name for the created SVG frame/icon"),
    width: z.number().optional().describe("Optional target width in pixels"),
    height: z.number().optional().describe("Optional target height in pixels"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
    fill: z.string().optional().describe("Optional hex color to tint vector elements (e.g. '#3B82F6')"),
    parentId: z.string().optional().describe("Optional parent frame ID to insert into"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_svg_icon", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create Ellipse
server.tool(
  "create_ellipse",
  "Create an ellipse or circular shape node on the canvas (ideal for user avatars, status badges, circular buttons, and indicator dots)",
  {
    name: z.string().optional().describe("Name of the ellipse node"),
    width: z.number().optional().describe("Width in pixels (default: 100)"),
    height: z.number().optional().describe("Height in pixels (default: 100)"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
    fill: z.string().optional().describe("Hex color fill (e.g. '#3B82F6')"),
    stroke: z
      .object({
        color: z.string().describe("Stroke hex color"),
        width: z.number().optional().describe("Stroke width in pixels"),
      })
      .optional()
      .describe("Optional border stroke"),
    parentId: z.string().optional().describe("Optional parent frame ID to insert into"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_ellipse", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create Component
server.tool(
  "create_component",
  "Create a reusable Figma component master on the canvas, or convert an existing frame/node into a component",
  {
    name: z.string().describe("Component name (e.g. 'Button/Primary', 'Card/Product')"),
    width: z.number().optional().describe("Component width in pixels"),
    height: z.number().optional().describe("Component height in pixels"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
    fill: z.string().optional().describe("Hex color fill"),
    cornerRadius: z.number().optional().describe("Corner radius"),
    fromNodeId: z.string().optional().describe("Optional ID of an existing node/frame to convert into a master component"),
    parentId: z.string().optional().describe("Optional parent frame or section ID"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_component", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create Component Instance
server.tool(
  "create_component_instance",
  "Instantiate a reusable component instance from a master component ID, retaining link to the main component",
  {
    componentId: z.string().describe("Node ID of the master component to instantiate"),
    name: z.string().optional().describe("Optional override name for the instance"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
    parentId: z.string().optional().describe("Optional parent frame ID to insert the instance into"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_component_instance", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Set Effects
server.tool(
  "set_effects",
  "Apply elevation shadows, inner shadows, and blurs to a node (DROP_SHADOW, INNER_SHADOW, LAYER_BLUR, BACKGROUND_BLUR)",
  {
    nodeId: z.string().describe("Target node ID to apply visual effects to"),
    effects: z
      .array(
        z.object({
          type: z.enum(["DROP_SHADOW", "INNER_SHADOW", "LAYER_BLUR", "BACKGROUND_BLUR"]).describe("Effect type"),
          color: z.string().optional().describe("Hex color with optional opacity (e.g. '#00000025') for shadows"),
          offset: z
            .object({
              x: z.number().describe("Horizontal offset"),
              y: z.number().describe("Vertical offset"),
            })
            .optional()
            .describe("Shadow offset"),
          radius: z.number().describe("Blur radius in pixels"),
          spread: z.number().optional().describe("Spread radius in pixels for shadows"),
          visible: z.boolean().optional().describe("Whether effect is visible (default: true)"),
        })
      )
      .describe("List of visual effects to apply"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_effects", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Create Section
server.tool(
  "create_section",
  "Create a Figma Section to organize related artboards, user journeys, or screen flows on the canvas",
  {
    name: z.string().describe("Section title (e.g. 'Authentication Flow', 'Settings')"),
    width: z.number().optional().describe("Width of the section container (default: 1200)"),
    height: z.number().optional().describe("Height of the section container (default: 800)"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
    fill: z.string().optional().describe("Optional hex background fill color for section"),
    childNodeIds: z.array(z.string()).optional().describe("Optional array of frame/node IDs to place inside this section"),
  },
  async (params) => {
    const result = await bridge.sendCommand("create_section", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Focus Viewport
server.tool(
  "focus_viewport",
  "Pan and zoom the Figma canvas viewport to focus on specific nodes, with optional selection",
  {
    nodeIds: z.array(z.string()).describe("Array of node IDs to focus and zoom into"),
    select: z.boolean().optional().describe("Whether to also select the nodes (default: true)"),
  },
  async (params) => {
    const result = await bridge.sendCommand("focus_viewport", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Set Overlay Interaction
server.tool(
  "set_overlay_interaction",
  "Configure interactive overlay prototype interactions (modals, dialogs, bottom sheets, slide-over panels, and dropdowns)",
  {
    sourceNodeId: z.string().describe("Node ID that triggers the overlay (e.g. button or menu item)"),
    destinationNodeId: z.string().describe("Frame node ID to display as an overlay (e.g. modal or drawer)"),
    triggerType: z.enum(["ON_CLICK", "ON_HOVER", "ON_PRESS"]).optional().describe("Trigger type (default: ON_CLICK)"),
    position: z
      .enum(["CENTER", "TOP_LEFT", "TOP_CENTER", "TOP_RIGHT", "BOTTOM_LEFT", "BOTTOM_CENTER", "BOTTOM_RIGHT", "MANUAL"])
      .optional()
      .describe("Overlay alignment on screen (default: CENTER)"),
    closeOnClickOutside: z.boolean().optional().describe("Dismiss overlay when clicking outside backdrop (default: true)"),
    backgroundOverlay: z.boolean().optional().describe("Show dimming background backdrop (default: true)"),
    overlayColor: z.string().optional().describe("Hex backdrop overlay color (default: '#00000066')"),
    transitionType: z.enum(["SMART_ANIMATE", "DISSOLVE", "SLIDE_IN", "MOVE_IN", "INSTANT"]).optional().describe("Transition animation (default: DISSOLVE)"),
    direction: z.enum(["LEFT", "RIGHT", "TOP", "BOTTOM"]).optional().describe("Slide direction when using SLIDE_IN/MOVE_IN"),
    duration: z.number().optional().describe("Transition duration in seconds (default: 0.25)"),
    easing: z.enum(["EASE_IN_AND_OUT", "EASE_IN", "EASE_OUT", "LINEAR"]).optional().describe("Animation easing"),
  },
  async (params) => {
    const result = await bridge.sendCommand("set_overlay_interaction", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Lint Design Compliance (HCI & UI/UX Guardian)
server.tool(
  "lint_design_compliance",
  "Audit and score any screen or the active canvas page against enterprise UI/UX and HCI compliance standards (Fitts's Law 44px touch targets, 8pt grid spacing consistency, proportional typography leading, and zero emojis)",
  {
    nodeId: z
      .string()
      .optional()
      .describe(
        "Optional Frame or Component node ID to audit. If omitted, audits the entire active canvas page."
      ),
  },
  async (params) => {
    const result = await bridge.sendCommand("lint_design_compliance", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ==========================================
// UX Intelligence & Cognitive Architecture Tools
// ==========================================

// Tool: Generate State Matrix (The 5 States of UI)
server.tool(
  "generate_state_matrix",
  "Generate the complete 5 States of UI (Ideal, Empty with onboarding CTA, Loading/Skeleton shimmer, Empathetic Error with 1-click retry, and Partial/Boundary stress-test) as a Figma Section or Component Set",
  {
    title: z.string().describe("Component or screen title (e.g. 'Payment Methods', 'Recent Invoices', 'User Profile')"),
    componentType: z.enum(["card", "screen", "list", "form", "button"]).optional().describe("Component archetype (default: 'card')"),
    device: z.enum(["mobile", "desktop"]).optional().describe("Target device form factor (default: 'mobile')"),
    theme: z.enum(["light", "dark"]).optional().describe("Color aesthetic theme (default: 'light')"),
    x: z.number().optional().describe("X position on canvas"),
    y: z.number().optional().describe("Y position on canvas"),
  },
  async (params) => {
    const result = await bridge.sendCommand("generate_state_matrix", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Audit UX Heuristics & Cognitive Load
server.tool(
  "audit_ux_heuristics",
  "Audit visual design and interaction architecture against empirical cognitive psychology and Laws of UX (Hick's Law choice overload, Fitts's Law touch target reach & destructive action proximity, Miller's Law chunking, and Jakob's Law conventions)",
  {
    nodeId: z
      .string()
      .optional()
      .describe("Optional frame or screen node ID to audit. If omitted, audits current selection or page."),
  },
  async (params) => {
    const result = await bridge.sendCommand("audit_ux_heuristics", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Validate User Journey Continuum
server.tool(
  "validate_user_journey",
  "Verify user journey continuum and prototype interaction completeness across canvas artboards, flagging orphan screens, dead-end traps, and unprotected destructive actions without confirmation safeguards",
  {},
  async () => {
    const result = await bridge.sendCommand("validate_user_journey", {});
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Generate Interactive Variants & Affordance Set
server.tool(
  "generate_interactive_variants",
  "Generate a complete interactive Component Set with Default, Hover, Pressed, Focused (WCAG 2.4.7 accessible focus ring), and Disabled states with pre-wired prototype Smart Animate transitions",
  {
    element: z.enum(["button", "input", "toggle", "tab", "card"]).optional().describe("Element type to generate (default: 'button')"),
    label: z.string().optional().describe("Element label text (default: 'Confirm & Continue')"),
    size: z.enum(["small", "medium", "large"]).optional().describe("Size scale (default: 'medium')"),
    variantStyle: z.enum(["primary", "secondary", "destructive", "outline"]).optional().describe("Visual intent style (default: 'primary')"),
    x: z.number().optional().describe("X coordinate on canvas"),
    y: z.number().optional().describe("Y coordinate on canvas"),
  },
  async (params) => {
    const result = await bridge.sendCommand("generate_interactive_variants", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Tool: Lint UX Microcopy & Empathetic Writing
server.tool(
  "lint_ux_microcopy",
  "Audit text copy across screens for UX writing anti-patterns (Lorem Ipsum placeholders, ambiguous/lazy CTAs like 'Submit', robotic blaming error messages, and cognitive strain all-caps text), recommending empathetic high-converting alternatives",
  {
    nodeId: z
      .string()
      .optional()
      .describe("Optional node ID to audit. If omitted, audits current selection or active page."),
  },
  async (params) => {
    const result = await bridge.sendCommand("lint_ux_microcopy", params);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// ==========================================
// Figma REST API Tools (Headless / Cloud Access)
// ==========================================

// Tool: REST Get File
server.tool(
  "rest_get_file",
  "Headless read of full Figma file metadata, version history, components, styles, and document tree from Figma Cloud via REST API (requires FIGMA_ACCESS_TOKEN)",
  {
    fileKey: z.string().describe("Figma file key from URL (e.g., 'a1b2c3d4' in figma.com/design/a1b2c3d4/...)"),
    depth: z.number().optional().describe("Hierarchy depth limit (default: 2 to preserve LLM context)"),
  },
  async ({ fileKey, depth }) => {
    const data = await restClient.getFile(fileKey, depth ?? 2);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              name: data.name,
              lastModified: data.lastModified,
              version: data.version,
              thumbnailUrl: data.thumbnailUrl,
              document: data.document,
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: REST Get File Nodes
server.tool(
  "rest_get_file_nodes",
  "Fetch specific nodes by ID directly from the cloud via REST API without loading the entire document",
  {
    fileKey: z.string().describe("Figma file key"),
    nodeIds: z.array(z.string()).describe("Array of node IDs to fetch"),
    depth: z.number().optional().describe("Depth limit for child nodes (default: 2)"),
  },
  async ({ fileKey, nodeIds, depth }) => {
    const data = await restClient.getFileNodes(fileKey, nodeIds, depth ?? 2);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.nodes || data, null, 2),
        },
      ],
    };
  }
);

// Tool: REST Render Images
server.tool(
  "rest_get_images",
  "Render high-resolution cloud images/exports of frames or components using Figma Cloud rendering engine",
  {
    fileKey: z.string().describe("Figma file key"),
    nodeIds: z.array(z.string()).describe("Array of frame/component node IDs to render"),
    format: z.enum(["png", "svg", "jpg", "pdf"]).optional().describe("Image export format (defaults to 'png')"),
    scale: z.number().optional().describe("Render scale from 1 to 4 (defaults to 2 for Retina)"),
  },
  async ({ fileKey, nodeIds, format, scale }) => {
    const data = await restClient.getImages(fileKey, nodeIds, format ?? "png", scale ?? 2);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.images || data, null, 2),
        },
      ],
    };
  }
);

// Tool: REST Get Comments
server.tool(
  "rest_get_comments",
  "Read collaboration feedback, review threads, and pins left on the file from Figma Cloud",
  {
    fileKey: z.string().describe("Figma file key"),
  },
  async ({ fileKey }) => {
    const data = await restClient.getComments(fileKey);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.comments || data, null, 2),
        },
      ],
    };
  }
);

// Tool: REST Post Comment
server.tool(
  "rest_post_comment",
  "Post a review comment or design critique directly to a Figma screen or pin via REST API",
  {
    fileKey: z.string().describe("Figma file key"),
    message: z.string().describe("Review feedback or comment message"),
    nodeId: z.string().optional().describe("Optional node ID to pin comment to"),
  },
  async ({ fileKey, message, nodeId }) => {
    const data = await restClient.postComment(fileKey, message, nodeId ? { nodeId } : undefined);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool: REST Get Variables (Design Tokens)
server.tool(
  "rest_get_variables",
  "Read Figma Enterprise / Organization Variables and token collections (color palettes, spacing, modes) via REST API",
  {
    fileKey: z.string().describe("Figma file key"),
  },
  async ({ fileKey }) => {
    const data = await restClient.getVariables(fileKey);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.meta || data, null, 2),
        },
      ],
    };
  }
);

// Tool: REST Get Components
server.tool(
  "rest_get_components",
  "List published component library definitions, component sets, and documentation links in the file",
  {
    fileKey: z.string().describe("Figma file key"),
  },
  async ({ fileKey }) => {
    const data = await restClient.getComponents(fileKey);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data.meta?.components || data, null, 2),
        },
      ],
    };
  }
);

// ==========================================
// MCP Resources (URI-Addressable Design State)
// ==========================================

// Resource: Document Summary
server.resource(
  "document_summary",
  "figma://document/summary",
  {
    description: "Active Figma document name, all pages, current page, and selection count",
    mimeType: "application/json",
  },
  async () => {
    const data = await bridge.sendCommand("get_document_info", {});
    return {
      contents: [
        {
          uri: "figma://document/summary",
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Resource: Active Design Tokens
server.resource(
  "active_tokens",
  "figma://tokens/active",
  {
    description: "Active design tokens extracted from the document (color styles, typography styles, effects)",
    mimeType: "application/json",
  },
  async () => {
    const data = await bridge.sendCommand("get_document_tokens", {});
    return {
      contents: [
        {
          uri: "figma://tokens/active",
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Resource: Prototype Flows & Connections
server.resource(
  "prototype_flows",
  "figma://prototype/flows",
  {
    description: "Interactive prototype flow starting points and connection graph on the current page",
    mimeType: "application/json",
  },
  async () => {
    const data = await bridge.sendCommand("get_prototype_connections", {});
    return {
      contents: [
        {
          uri: "figma://prototype/flows",
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// ==========================================
// MCP Prompts & Skills (Guided Workflows)
// ==========================================

// Prompt: Design Product Flow
server.prompt(
  "design_product_flow",
  "Guide the AI assistant to design a multi-screen product flow with AutoLayout and wire interactive prototyping",
  {
    productName: z.string().describe("Name and type of product or feature (e.g. 'Ride Share Onboarding')"),
    screenCount: z.string().optional().describe("Number of screens to generate (defaults to 3)"),
    theme: z.string().optional().describe("Design aesthetic or color theme (e.g. 'Clean Light', 'Modern Dark')"),
  },
  async ({ productName, screenCount, theme }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an expert Principal Product Designer and Design Systems Engineer.
Create a complete, interactive UI/UX prototype for: "${productName}".
Number of screens: ${screenCount || "3"}.
Theme aesthetic: ${theme || "Modern Clean Light"}.

Execute the following design process:
1. Call 'get_document_tokens' to inspect available color and text styles in the file.
2. For each screen in the journey, use 'generate_ui_tree' with appropriate device presets ('iPhone 16' or 'Desktop') to build production-grade AutoLayout components.
   - STRICT CONSTRAINT: NEVER use emojis in buttons, titles, or body copy. Use 'create_svg_icon' for icons.
   - Spacing: Strictly adhere to the 8pt grid (4, 8, 12, 16, 20, 24, 32, 40, 48px).
   - HCI Ergonomics: Ensure interactive elements (buttons, inputs, cards) have minimum 44px touch targets (Fitts's Law / Apple HIG).
   - Tagging: Ensure semantic 'tag' identifiers are assigned (e.g. 'login_btn', 'continue_btn', 'home_card').
3. Mark the initial screen as a flow entrypoint using 'set_flow_starting_point'.
4. Wire interactive transitions between screens using 'batch_link_prototype' or 'set_prototype_interaction' with 'SMART_ANIMATE' or 'SLIDE_IN'.
5. Call 'lint_design_compliance' to verify zero HCI or typography violations.
6. Summarize the created screens, interactive journey, and verification details for the user.`,
          },
        },
      ],
    };
  }
);

// Prompt: Wire Interactive Prototype
server.prompt(
  "wire_interactive_prototype",
  "Instruct the AI assistant to inspect existing screens and wire up user journey transitions",
  {
    userJourney: z.string().describe("Description of the user journey (e.g. 'Tap login -> Navigate to Dashboard -> Tap send money')"),
  },
  async ({ userJourney }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an Interaction Designer.
Your task is to wire an interactive prototype for the following user journey:
"${userJourney}".

Step 1: Call 'get_design_context' to discover available screens, buttons, cards, and flow starting points.
Step 2: Identify the source interactive node IDs (buttons/links) and target destination screens.
Step 3: Call 'batch_link_prototype' or 'set_prototype_interaction' to connect the nodes with appropriate transitions ('SMART_ANIMATE', 'SLIDE_IN', 'DISSOLVE').
Step 4: Audit the resulting prototype using 'get_prototype_connections' and report the result.`,
          },
        },
      ],
    };
  }
);

// Prompt: Audit UX Design
server.prompt(
  "audit_ux_design",
  "Instruct the AI assistant to perform an automated HCI, typography, and UX design compliance audit",
  {
    screenName: z.string().optional().describe("Optional screen name to audit"),
  },
  async ({ screenName }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an expert UX & Accessibility Auditor.
Perform a thorough UX and HCI compliance audit on ${screenName ? `the screen "${screenName}"` : "the active design page"}.

1. Call 'lint_design_compliance' to get an automated compliance score and list of violations:
   - Touch targets: Identify any interactive elements < 44x44px (Apple HIG / Fitts's Law).
   - Emojis: Flag any text nodes using emojis instead of vector SVG icons.
   - Spacing: Identify any padding or gap settings violating the 4pt/8pt grid scale.
   - Typography: Check for uncalibrated AUTO line-height or poor typographic scale.
2. Call 'get_design_context' to review the overall artboard hierarchy.
3. Provide an executive summary of the score, list specific node IDs requiring attention, and propose atomic fixes using 'update_node' or 'set_autolayout'.`,
          },
        },
      ],
    };
  }
);

// Prompt: Architect UX Experience (5 States, Heuristics & Journey)
server.prompt(
  "architect_ux_experience",
  "Instruct the AI assistant to conduct a comprehensive UX architectural review, generate the 5 UI states, audit cognitive heuristics, and validate user journey flow continuity",
  {
    featureName: z.string().describe("Name of the feature or user journey (e.g. 'Checkout Flow', 'Subscription Management')"),
  },
  async ({ featureName }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are a Principal User Experience (UX) Architect and Cognitive Ergonomics Specialist.
Your mission is to architect and audit the user experience for: "${featureName}".

Execute the UX Excellence Protocol:
1. Call 'generate_state_matrix' with title="${featureName}" to guarantee the 5 Essential States (Ideal, Empty, Loading, Error, Partial) are present with zero dead ends.
2. Call 'generate_interactive_variants' for primary interactive controls to ensure clear affordance, tactile pressed feedback, and accessible WCAG 2.4.7 focus rings.
3. Call 'audit_ux_heuristics' to evaluate cognitive load against Hick's Law, Fitts's Law, and Miller's Law.
4. Call 'lint_ux_microcopy' to verify goal-oriented verb+object CTAs and constructive 3-part error messaging.
5. Call 'validate_user_journey' to ensure seamless flow continuity, non-dead-end navigation, and proper confirmation safeguards.
6. Provide an executive UX Scorecard and recommendations for the user.`,
          },
        },
      ],
    };
  }
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function handleCliCommands(args: string[]): boolean {
  const cmd = args[0]?.toLowerCase();

  if (cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(`
========================================================================
🎨 Figma MCP Server — AI-Powered UI/UX Prototyping & Design Bridge
========================================================================

Usage:
  npx figma-mcp [command] [options]

Commands:
  (default)            Start the MCP Server on STDIO transport
  export-plugin [dir]  Export the ready-to-use Figma Companion Plugin
  get-plugin [dir]     Alias for export-plugin
  config               Print ready-to-copy configs for Claude Desktop, Cursor, etc.
  doctor               Verify local system environment and port availability
  help, --help, -h     Show this help documentation

Options:
  --transport=sse      Run in remote HTTP / SSE transport mode
  --port=<port>        Port for HTTP / SSE server (default: 3000)

Examples:
  npx figma-mcp export-plugin ./my-figma-plugin
  npx figma-mcp config
  npx figma-mcp doctor
  npx figma-mcp --transport=sse --port=3000
========================================================================
`);
    return true;
  }

  if (cmd === "config" || cmd === "setup") {
    console.log(`
========================================================================
🚀 Figma MCP Client Configuration
========================================================================

📌 1. Claude Desktop (claude_desktop_config.json):
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_optional_figma_personal_token"
      }
    }
  }
}

📌 2. Cursor (.cursor/mcp.json):
{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "figma-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your_optional_figma_personal_token"
      }
    }
  }
}

📌 3. Antigravity / Gemini / Custom MCP Client:
Command: npx -y figma-mcp
Transport: STDIO

Note: FIGMA_ACCESS_TOKEN is only required if using headless Figma Cloud REST tools.
Local canvas manipulation through the companion desktop plugin requires NO token!
========================================================================
`);
    return true;
  }

  if (cmd === "export-plugin" || cmd === "get-plugin") {
    const targetDir = path.resolve(process.cwd(), args[1] || "./figma-companion-plugin");

    // Locate bundled plugin files (supports npm package and monorepo structure)
    const candidateDirs = [
      path.resolve(__dirname, "../plugin-dist"),
      path.resolve(__dirname, "../../figma-plugin/dist"),
      path.resolve(__dirname, "plugin-dist"),
    ];

    const sourceDir = candidateDirs.find(
      (dir) => fs.existsSync(dir) && fs.existsSync(path.join(dir, "code.js"))
    );

    if (!sourceDir) {
      console.error("❌ Error: Could not locate pre-bundled plugin files.");
      console.error("Please run 'npm run package' or build the figma-plugin workspace first.");
      process.exit(1);
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const manifest = {
      name: "Figma MCP Bridge",
      id: "figma-mcp-bridge",
      api: "1.0.0",
      main: "code.js",
      ui: "ui.html",
      editorType: ["figma"],
      networkAccess: {
        allowedDomains: ["*"],
        devAllowedDomains: ["http://localhost:3055"],
        reasoning:
          "Connects to the local Figma MCP Server WebSocket bridge to receive design and prototyping instructions.",
      },
    };

    fs.writeFileSync(
      path.join(targetDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );
    fs.copyFileSync(path.join(sourceDir, "code.js"), path.join(targetDir, "code.js"));
    fs.copyFileSync(path.join(sourceDir, "ui.html"), path.join(targetDir, "ui.html"));

    const readmeText = `====================================================
🎨 FIGMA MCP COMPANION PLUGIN
====================================================

HOW TO INSTALL IN FIGMA DESKTOP (Takes 10 seconds):

1. Open the Figma Desktop App.
2. Open any design file (or create a new draft).
3. Right-click anywhere on the canvas.
4. Navigate to: Plugins > Development > "Import plugin from manifest..."
5. Select the "manifest.json" file in this folder.
6. Click Open.

The plugin is now installed!
Press Ctrl+Alt+P (Windows) or Cmd+Opt+P (Mac) to launch it.
It connects automatically to your local Figma MCP Server on ws://localhost:3055.
====================================================
`;
    fs.writeFileSync(path.join(targetDir, "README.txt"), readmeText, "utf8");

    console.log(`
========================================================================
✔ Figma Companion Plugin exported successfully!
========================================================================
📁 Location: ${targetDir}

Files created:
  - manifest.json
  - code.js
  - ui.html
  - README.txt

👉 Next Steps in Figma Desktop:
  1. Open Figma Desktop and right-click on the canvas.
  2. Select: Plugins > Development > "Import plugin from manifest..."
  3. Pick: ${path.join(targetDir, "manifest.json")}
  4. Run your MCP client (Claude Desktop, Cursor, Antigravity).
========================================================================
`);
    return true;
  }

  if (cmd === "doctor") {
    const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
    console.log(`
========================================================================
🩺 Figma MCP System Doctor
========================================================================
- Node.js Version: ${process.version} ${nodeMajor >= 18 ? "✔ (Supported)" : "❌ (Requires Node >= 18)"}
- Platform: ${process.platform} (${process.arch})
- Figma REST Token: ${process.env.FIGMA_ACCESS_TOKEN ? "✔ Configured" : "⚪ Not set (Optional for cloud REST tools)"}
- Default Bridge Port: 3055 (WebSocket)
========================================================================
`);
    return true;
  }

  return false;
}

async function main() {
  const cliArgs = process.argv.slice(2);
  if (handleCliCommands(cliArgs)) {
    process.exit(0);
  }

  // Start WebSocket bridge server for Figma Desktop Plugin
  await bridge.start();

  const isSSE = process.argv.includes("--transport=sse") || process.env.MCP_TRANSPORT === "sse";

  if (isSSE) {
    const httpPort = parseInt(process.env.PORT || process.env.MCP_PORT || "3000", 10);
    const transports = new Map<string, SSEServerTransport>();

    const httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      // CORS headers for web/gateway clients
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Figma-Token");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Health / Readiness Endpoint
      if (url.pathname === "/health" || url.pathname === "/healthz") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "healthy",
            uptime: process.uptime(),
            figmaBridge: bridge.getStatus(),
            restApiConfigured: restClient.isConfigured(),
            activeSseSessions: transports.size,
            timestamp: new Date().toISOString(),
          })
        );
        return;
      }

      // SSE Stream Endpoint
      if (url.pathname === "/sse" && req.method === "GET") {
        const transport = new SSEServerTransport("/messages", res);
        transports.set(transport.sessionId, transport);
        logger.info({ sessionId: transport.sessionId }, "Established remote SSE client connection");

        transport.onclose = () => {
          logger.info({ sessionId: transport.sessionId }, "SSE client disconnected");
          transports.delete(transport.sessionId);
        };

        await server.connect(transport);
        return;
      }

      // POST Messages Endpoint
      if (url.pathname === "/messages" && req.method === "POST") {
        const sessionId = url.searchParams.get("sessionId");
        const transport = sessionId ? transports.get(sessionId) : undefined;
        if (!transport) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end(`Session '${sessionId}' not found.`);
          return;
        }
        await transport.handlePostMessage(req, res);
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found", endpoints: ["/health", "/sse", "/messages"] }));
    });

    httpServer.listen(httpPort, () => {
      logger.info({ port: httpPort }, "Figma MCP Server listening on Streamable HTTP / SSE transport");
    });
  } else {
    // Default STDIO Transport (for Cursor, Claude Desktop, Antigravity IDE)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info("Figma MCP Server initialized on STDIO transport");
  }
}

main().catch((error) => {
  logger.fatal({ err: error }, "Fatal error starting Figma MCP Server");
  process.exit(1);
});
