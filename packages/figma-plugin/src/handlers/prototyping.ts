import { hexToFigmaColor } from "../helpers/color";

export interface InteractionParams {
  sourceNodeId: string;
  destinationNodeId?: string;
  triggerType?: "ON_CLICK" | "ON_HOVER" | "ON_PRESS" | "ON_DRAG" | "AFTER_TIMEOUT";
  timeout?: number;
  navigation?: "NAVIGATE" | "OVERLAY" | "SWAP" | "BACK" | "CLOSE" | "SCROLL_TO";
  transitionType?: "SMART_ANIMATE" | "DISSOLVE" | "SLIDE_IN" | "MOVE_IN" | "INSTANT";
  direction?: "LEFT" | "RIGHT" | "TOP" | "BOTTOM";
  duration?: number;
  easing?: "EASE_IN_AND_OUT" | "EASE_IN" | "EASE_OUT" | "LINEAR";
  resetScrollPosition?: boolean;
}

export async function handleSetPrototypeInteraction(params: InteractionParams) {
  const sourceNode = figma.getNodeById(params.sourceNodeId);
  if (!sourceNode) {
    throw new Error(`Source node '${params.sourceNodeId}' not found.`);
  }

  // Build trigger
  const triggerType = params.triggerType || "ON_CLICK";
  let trigger: any = { type: triggerType };
  if (triggerType === "AFTER_TIMEOUT") {
    trigger.timeout = (params.timeout ?? 800) / 1000; // in seconds
  }

  // Build action
  const nav = params.navigation || "NAVIGATE";
  let action: any;

  if (nav === "BACK") {
    action = { type: "BACK" };
  } else if (nav === "CLOSE") {
    action = { type: "CLOSE" };
  } else {
    if (!params.destinationNodeId) {
      throw new Error(`destinationNodeId is required for navigation type '${nav}'`);
    }
    const destNode = figma.getNodeById(params.destinationNodeId);
    if (!destNode) {
      throw new Error(`Destination node '${params.destinationNodeId}' not found.`);
    }

    // Build transition
    let transition: any = null;
    const transType = params.transitionType || "SMART_ANIMATE";
    const duration = params.duration ?? 0.3;
    const easing = { type: params.easing || "EASE_IN_AND_OUT" };

    if (transType === "SMART_ANIMATE" || transType === "DISSOLVE") {
      transition = {
        type: transType,
        easing,
        duration,
      };
    } else if (transType === "SLIDE_IN" || transType === "MOVE_IN") {
      transition = {
        type: transType,
        direction: params.direction || "RIGHT",
        matchLayers: true,
        easing,
        duration,
      };
    } else {
      transition = null; // INSTANT
    }

    action = {
      type: "NODE",
      destinationId: params.destinationNodeId,
      navigation: nav,
      transition,
      resetScrollPosition: params.resetScrollPosition ?? false,
    };
  }

  const reaction: any = {
    trigger,
    actions: [action],
  };

  // Assign reactions to node
  if ("setReactionsAsync" in sourceNode) {
    await (sourceNode as any).setReactionsAsync([reaction]);
  } else if ("reactions" in sourceNode) {
    (sourceNode as any).reactions = [reaction];
  } else {
    throw new Error(`Node '${params.sourceNodeId}' does not support prototype reactions.`);
  }

  return {
    sourceId: sourceNode.id,
    sourceName: sourceNode.name,
    trigger: triggerType,
    navigation: nav,
    destinationId: params.destinationNodeId,
    success: true,
  };
}

export async function handleSetFlowStartingPoint(params: {
  nodeId: string;
  name: string;
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node || node.type !== "FRAME") {
    throw new Error(`Starting point node '${params.nodeId}' must be a Frame.`);
  }

  const currentPoints = [...figma.currentPage.flowStartingPoints];
  // Remove existing entry for this node if present
  const filtered = currentPoints.filter((p) => p.nodeId !== params.nodeId);
  filtered.push({
    nodeId: params.nodeId,
    name: params.name,
  });

  figma.currentPage.flowStartingPoints = filtered;

  return {
    flowName: params.name,
    startingNodeId: params.nodeId,
    totalFlows: figma.currentPage.flowStartingPoints.length,
  };
}

export async function handleGetPrototypeConnections() {
  const startingPoints = figma.currentPage.flowStartingPoints.map((sp) => {
    const node = figma.getNodeById(sp.nodeId);
    return {
      flowName: sp.name,
      nodeId: sp.nodeId,
      nodeName: node?.name || "Unknown",
    };
  });

  const nodesWithReactions = figma.currentPage.findAll((n) => "reactions" in n && (n as any).reactions.length > 0);

  const connections = nodesWithReactions.map((node) => {
    const reactions = (node as any).reactions;
    return {
      sourceId: node.id,
      sourceName: node.name,
      reactions: reactions.map((r: any) => {
        const act = (r.actions && r.actions[0]) || r.action;
        let destName = undefined;
        if (act?.destinationId) {
          const destNode = figma.getNodeById(act.destinationId);
          destName = destNode?.name;
        }
        return {
          trigger: r.trigger?.type,
          navigation: act?.navigation || act?.type,
          destinationId: act?.destinationId,
          destinationName: destName,
          transition: act?.transition?.type,
        };
      }),
    };
  });

  return {
    startingPoints,
    connectionsCount: connections.length,
    connections,
  };
}

export async function handleBatchLinkPrototype(params: {
  links: Array<{
    sourceId: string;
    destinationId: string;
    trigger?: "ON_CLICK" | "ON_HOVER" | "ON_PRESS" | "AFTER_TIMEOUT";
    timeout?: number;
    transition?: "SMART_ANIMATE" | "DISSOLVE" | "SLIDE_IN" | "MOVE_IN" | "INSTANT";
    direction?: "LEFT" | "RIGHT" | "TOP" | "BOTTOM";
  }>;
}) {
  const results = [];
  for (const link of params.links) {
    const res = await handleSetPrototypeInteraction({
      sourceNodeId: link.sourceId,
      destinationNodeId: link.destinationId,
      triggerType: link.trigger,
      timeout: link.timeout,
      transitionType: link.transition,
      direction: link.direction,
    });
    results.push(res);
  }
  return {
    linkedCount: results.length,
    links: results,
  };
}

export interface OverlayInteractionParams {
  sourceNodeId: string;
  destinationNodeId: string;
  triggerType?: "ON_CLICK" | "ON_HOVER" | "ON_PRESS";
  position?:
    | "CENTER"
    | "TOP_LEFT"
    | "TOP_CENTER"
    | "TOP_RIGHT"
    | "BOTTOM_LEFT"
    | "BOTTOM_CENTER"
    | "BOTTOM_RIGHT"
    | "MANUAL";
  closeOnClickOutside?: boolean;
  backgroundOverlay?: boolean;
  overlayColor?: string;
  transitionType?: "SMART_ANIMATE" | "DISSOLVE" | "SLIDE_IN" | "MOVE_IN" | "INSTANT";
  direction?: "LEFT" | "RIGHT" | "TOP" | "BOTTOM";
  duration?: number;
  easing?: "EASE_IN_AND_OUT" | "EASE_IN" | "EASE_OUT" | "LINEAR";
}

export async function handleSetOverlayInteraction(params: OverlayInteractionParams) {
  const sourceNode = figma.getNodeById(params.sourceNodeId);
  if (!sourceNode) {
    throw new Error(`Source node '${params.sourceNodeId}' not found.`);
  }
  const destNode = figma.getNodeById(params.destinationNodeId);
  if (!destNode) {
    throw new Error(`Destination node '${params.destinationNodeId}' not found.`);
  }

  const triggerType = params.triggerType || "ON_CLICK";
  const trigger = { type: triggerType };

  const transType = params.transitionType || "DISSOLVE";
  const duration = params.duration ?? 0.25;
  const easing = { type: params.easing || "EASE_OUT" };

  let transition: any = null;
  if (transType === "SMART_ANIMATE" || transType === "DISSOLVE") {
    transition = { type: transType, easing, duration };
  } else if (transType === "SLIDE_IN" || transType === "MOVE_IN") {
    transition = {
      type: transType,
      direction: params.direction || "BOTTOM",
      matchLayers: true,
      easing,
      duration,
    };
  }

  const overlayBackground =
    params.backgroundOverlay !== false
      ? {
          type: "SOLID_COLOR",
          color: hexToFigmaColor(params.overlayColor || "#00000066").rgb,
        }
      : { type: "NONE" };

  const action: any = {
    type: "NODE",
    destinationId: params.destinationNodeId,
    navigation: "OVERLAY",
    transition,
    overlayPositionType: params.position || "CENTER",
    closeOnClickOutside: params.closeOnClickOutside !== false,
    overlayBackground,
  };

  const reaction: any = {
    trigger,
    actions: [action],
  };

  if ("setReactionsAsync" in sourceNode) {
    await (sourceNode as any).setReactionsAsync([reaction]);
  } else if ("reactions" in sourceNode) {
    (sourceNode as any).reactions = [reaction];
  } else {
    throw new Error(`Node '${params.sourceNodeId}' does not support prototype reactions.`);
  }

  return {
    sourceId: sourceNode.id,
    sourceName: sourceNode.name,
    destinationId: destNode.id,
    destinationName: destNode.name,
    navigation: "OVERLAY",
    position: params.position || "CENTER",
    closeOnClickOutside: params.closeOnClickOutside !== false,
    success: true,
  };
}

