// Figma Main Plugin Thread (runs in Figma canvas sandbox)
import {
  handleCreateFrame,
  handleCreateRectangle,
  handleCreateText,
  handleSetAutolayout,
  handleInspectNode,
  handleGetSelection,
  handleGetDesignContext,
  handleUpdateNode,
  handleDeleteNodes,
  handleDuplicateNode,
  handleSetStroke,
  handleSetTextContent,
  handleFindNodes,
  handleManagePage,
  handleExportNodeImage,
  handleGetDocumentTokens,
  handleCreateSvgIcon,
  handleCreateEllipse,
  handleCreateComponent,
  handleCreateComponentInstance,
  handleSetEffects,
  handleCreateSection,
  handleFocusViewport,
} from "./handlers/canvas";
import { handleGenerateUITree } from "./handlers/declarative";
import {
  handleSetPrototypeInteraction,
  handleSetFlowStartingPoint,
  handleGetPrototypeConnections,
  handleBatchLinkPrototype,
  handleSetOverlayInteraction,
} from "./handlers/prototyping";
import { handleLintDesignCompliance } from "./handlers/linter";
import {
  handleGenerateStateMatrix,
  handleAuditUXHeuristics,
  handleValidateUserJourney,
  handleGenerateInteractiveVariants,
  handleLintUXMicrocopy,
} from "./handlers/ux";

figma.showUI(__html__, { width: 300, height: 280, themeColors: true });

function sendHandshake() {
  figma.ui.postMessage({
    type: "plugin_handshake",
    payload: {
      fileName: figma.root.name,
      currentPage: figma.currentPage.name,
    },
  });
}

// Send initial handshake
sendHandshake();

// Update when user changes pages
figma.on("currentpagechange", () => {
  sendHandshake();
});

// Message router
figma.ui.onmessage = async (msg: {
  type: string;
  id?: string;
  action?: string;
  params?: Record<string, any>;
}) => {
  if (msg.type !== "mcp_request" || !msg.id || !msg.action) {
    return;
  }

  const { id, action, params = {} } = msg;

  try {
    let result: any = null;

    switch (action) {
      case "ping": {
        result = {
          echo: params.message || "pong-v2",
          timestamp: Date.now(),
          document: figma.root.name,
          currentPage: figma.currentPage.name,
        };
        break;
      }

      case "get_document_info": {
        result = {
          documentId: figma.fileKey || "local",
          documentName: figma.root.name,
          currentPage: {
            id: figma.currentPage.id,
            name: figma.currentPage.name,
          },
          pages: figma.root.children.map((page) => ({
            id: page.id,
            name: page.name,
          })),
          selectionCount: figma.currentPage.selection.length,
          selection: figma.currentPage.selection.map((node) => ({
            id: node.id,
            name: node.name,
            type: node.type,
          })),
        };
        break;
      }

      // Step 3 Primitives
      case "create_frame": {
        result = await handleCreateFrame(params as any);
        break;
      }

      case "create_rectangle": {
        result = await handleCreateRectangle(params as any);
        break;
      }

      case "create_text": {
        result = await handleCreateText(params as any);
        break;
      }

      case "set_autolayout": {
        result = await handleSetAutolayout(params as any);
        break;
      }

      case "inspect_node": {
        result = await handleInspectNode(params as any);
        break;
      }

      case "get_selection": {
        result = await handleGetSelection();
        break;
      }

      case "get_design_context": {
        result = await handleGetDesignContext(params as any);
        break;
      }

      // Additional Tools
      case "update_node": {
        result = await handleUpdateNode(params as any);
        break;
      }

      case "delete_nodes": {
        result = await handleDeleteNodes(params as any);
        break;
      }

      case "duplicate_node": {
        result = await handleDuplicateNode(params as any);
        break;
      }

      case "set_stroke": {
        result = await handleSetStroke(params as any);
        break;
      }

      case "set_text_content": {
        result = await handleSetTextContent(params as any);
        break;
      }

      case "find_nodes": {
        result = await handleFindNodes(params as any);
        break;
      }

      case "manage_page": {
        result = await handleManagePage(params as any);
        break;
      }

      case "export_node_image": {
        result = await handleExportNodeImage(params as any);
        break;
      }

      case "get_document_tokens": {
        result = await handleGetDocumentTokens();
        break;
      }

      // Step 4: Declarative Screen Generator
      case "generate_ui_tree": {
        result = await handleGenerateUITree(params as any);
        break;
      }

      // Step 5: Prototyping & Interactions
      case "set_prototype_interaction": {
        result = await handleSetPrototypeInteraction(params as any);
        break;
      }

      case "set_flow_starting_point": {
        result = await handleSetFlowStartingPoint(params as any);
        break;
      }

      case "get_prototype_connections": {
        result = await handleGetPrototypeConnections();
        break;
      }

      case "batch_link_prototype": {
        result = await handleBatchLinkPrototype(params as any);
        break;
      }

      case "set_overlay_interaction": {
        result = await handleSetOverlayInteraction(params as any);
        break;
      }

      // Step 6: Advanced Vector, Components & Effects
      case "create_svg_icon": {
        result = await handleCreateSvgIcon(params as any);
        break;
      }

      case "create_ellipse": {
        result = await handleCreateEllipse(params as any);
        break;
      }

      case "create_component": {
        result = await handleCreateComponent(params as any);
        break;
      }

      case "create_component_instance": {
        result = await handleCreateComponentInstance(params as any);
        break;
      }

      case "set_effects": {
        result = await handleSetEffects(params as any);
        break;
      }

      case "create_section": {
        result = await handleCreateSection(params as any);
        break;
      }

      case "focus_viewport": {
        result = await handleFocusViewport(params as any);
        break;
      }

      case "lint_design_compliance": {
        result = await handleLintDesignCompliance(params as any);
        break;
      }

      case "generate_state_matrix": {
        result = await handleGenerateStateMatrix(params as any);
        break;
      }

      case "audit_ux_heuristics": {
        result = await handleAuditUXHeuristics(params as any);
        break;
      }

      case "validate_user_journey": {
        result = await handleValidateUserJourney();
        break;
      }

      case "generate_interactive_variants": {
        result = await handleGenerateInteractiveVariants(params as any);
        break;
      }

      case "lint_ux_microcopy": {
        result = await handleLintUXMicrocopy(params as any);
        break;
      }

      default:
        throw new Error(`Unknown action '${action}'`);
    }

    figma.ui.postMessage({
      type: "mcp_response",
      id,
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error(`[Figma Plugin] Error handling action '${action}':`, error);
    figma.ui.postMessage({
      type: "mcp_response",
      id,
      success: false,
      error: error.message || String(error),
    });
  }
};
