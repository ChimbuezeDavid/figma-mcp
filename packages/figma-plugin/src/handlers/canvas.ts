import { createSolidPaint, hexToFigmaColor } from "../helpers/color";
import { ensureFontLoaded } from "../helpers/font";
import { applyImageOrColor } from "./declarative";

export async function handleCreateFrame(params: {
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fill?: string;
  cornerRadius?: number;
  parentId?: string;
}) {
  const frame = figma.createFrame();
  frame.name = params.name || "Frame";
  frame.resize(params.width || 375, params.height || 812);

  if (params.x !== undefined) frame.x = params.x;
  if (params.y !== undefined) frame.y = params.y;

  if (params.fill) {
    frame.fills = [createSolidPaint(params.fill)];
  }

  if (params.cornerRadius !== undefined) {
    frame.cornerRadius = params.cornerRadius;
  }

  if (params.parentId) {
    const parent = figma.getNodeById(params.parentId);
    if (parent && "appendChild" in parent) {
      (parent as FrameNode).appendChild(frame);
    } else {
      figma.currentPage.appendChild(frame);
    }
  } else {
    figma.currentPage.appendChild(frame);
  }

  // Focus viewport on new frame if top-level
  if (!params.parentId) {
    figma.viewport.scrollAndZoomIntoView([frame]);
  }

  return {
    id: frame.id,
    name: frame.name,
    type: frame.type,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
  };
}

export async function handleCreateRectangle(params: {
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fill?: string;
  cornerRadius?: number;
  parentId?: string;
}) {
  const rect = figma.createRectangle();
  rect.name = params.name || "Rectangle";
  rect.resize(params.width || 100, params.height || 100);

  if (params.x !== undefined) rect.x = params.x;
  if (params.y !== undefined) rect.y = params.y;

  if (params.fill) {
    rect.fills = [createSolidPaint(params.fill)];
  }

  if (params.cornerRadius !== undefined) {
    rect.cornerRadius = params.cornerRadius;
  }

  if (params.parentId) {
    const parent = figma.getNodeById(params.parentId);
    if (parent && "appendChild" in parent) {
      (parent as FrameNode).appendChild(rect);
    } else {
      figma.currentPage.appendChild(rect);
    }
  } else {
    figma.currentPage.appendChild(rect);
  }

  return {
    id: rect.id,
    name: rect.name,
    type: rect.type,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

export async function handleCreateText(params: {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  parentId?: string;
}) {
  const fontName = await ensureFontLoaded(
    params.fontFamily || "Inter",
    params.fontWeight || "Regular"
  );

  const textNode = figma.createText();
  textNode.fontName = fontName;
  textNode.fontSize = params.fontSize || 16;
  textNode.characters = params.text;

  if (params.fill) {
    textNode.fills = [createSolidPaint(params.fill)];
  }

  if (params.width !== undefined) {
    textNode.resize(params.width, textNode.height);
    textNode.textAutoResize = "HEIGHT";
  }

  if (params.x !== undefined) textNode.x = params.x;
  if (params.y !== undefined) textNode.y = params.y;

  if (params.parentId) {
    const parent = figma.getNodeById(params.parentId);
    if (parent && "appendChild" in parent) {
      (parent as FrameNode).appendChild(textNode);
    } else {
      figma.currentPage.appendChild(textNode);
    }
  } else {
    figma.currentPage.appendChild(textNode);
  }

  return {
    id: textNode.id,
    name: textNode.name,
    type: textNode.type,
    characters: textNode.characters,
    fontSize: textNode.fontSize,
    x: textNode.x,
    y: textNode.y,
    width: textNode.width,
    height: textNode.height,
  };
}

export async function handleSetAutolayout(params: {
  nodeId: string;
  direction: "HORIZONTAL" | "VERTICAL" | "NONE";
  spacing?: number;
  padding?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  primaryAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "CENTER" | "MAX" | "BASELINE";
  primaryAxisSizing?: "FIXED" | "AUTO";
  counterAxisSizing?: "FIXED" | "AUTO";
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node || node.type !== "FRAME") {
    throw new Error(`Node '${params.nodeId}' is not a FrameNode and cannot have AutoLayout applied.`);
  }

  const frame = node as FrameNode;
  frame.layoutMode = params.direction;

  if (params.direction !== "NONE") {
    if (params.spacing !== undefined) frame.itemSpacing = params.spacing;

    if (params.padding !== undefined) {
      frame.paddingTop = params.padding;
      frame.paddingBottom = params.padding;
      frame.paddingLeft = params.padding;
      frame.paddingRight = params.padding;
    } else {
      if (params.paddingTop !== undefined) frame.paddingTop = params.paddingTop;
      if (params.paddingBottom !== undefined) frame.paddingBottom = params.paddingBottom;
      if (params.paddingLeft !== undefined) frame.paddingLeft = params.paddingLeft;
      if (params.paddingRight !== undefined) frame.paddingRight = params.paddingRight;
    }

    if (params.primaryAxisAlignItems) {
      frame.primaryAxisAlignItems = params.primaryAxisAlignItems;
    }
    if (params.counterAxisAlignItems) {
      frame.counterAxisAlignItems = params.counterAxisAlignItems;
    }
    if (params.primaryAxisSizing) {
      frame.primaryAxisSizingMode = params.primaryAxisSizing;
    }
    if (params.counterAxisSizing) {
      frame.counterAxisSizingMode = params.counterAxisSizing;
    }
  }

  return {
    id: frame.id,
    name: frame.name,
    layoutMode: frame.layoutMode,
    itemSpacing: frame.itemSpacing,
    padding: {
      top: frame.paddingTop,
      bottom: frame.paddingBottom,
      left: frame.paddingLeft,
      right: frame.paddingRight,
    },
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
  };
}

export function getNodeOrThrow(nodeId: string): BaseNode {
  const node = figma.getNodeById(nodeId);
  if (!node) {
    const availableFrames = figma.currentPage.children
      .filter((n) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION")
      .slice(0, 10)
      .map((n) => ({ id: n.id, name: n.name, type: n.type }));

    throw new Error(
      `Node '${nodeId}' was not found on page '${figma.currentPage.name}'. ` +
      `Available top-level screens: ${JSON.stringify(availableFrames)}`
    );
  }
  return node;
}

export async function handleInspectNode(params: { nodeId: string; maxDepth?: number }) {
  const node = getNodeOrThrow(params.nodeId);
  // Cap maxDepth at 4 to prevent LLM context explosion
  const depth = Math.min(Math.max(1, params.maxDepth ?? 2), 4);
  return serializeNode(node, depth, 0);
}

export async function handleGetSelection() {
  const selection = figma.currentPage.selection;
  return selection.map((node) => serializeNode(node, 2, 0));
}

export async function handleGetDesignContext(params: { screenId?: string }) {
  let targetNodes: SceneNode[] = [];

  if (params.screenId) {
    const node = getNodeOrThrow(params.screenId) as SceneNode;
    targetNodes = [node];
  } else {
    // Collect top-level screens on current page
    targetNodes = figma.currentPage.children.filter(
      (n) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION"
    );
  }

  const flows = figma.currentPage.flowStartingPoints.map((f) => ({
    name: f.name,
    nodeId: f.nodeId,
  }));

  const screens = targetNodes.map((screen) => {
    const isFrame = screen.type === "FRAME";
    const frame = isFrame ? (screen as FrameNode) : null;

    // Extract semantic targets (buttons, inputs, headings) without full vector tree
    const interactiveElements: any[] = [];
    if ("findAll" in screen) {
      const descendants = (screen as any).findAll((n: BaseNode) => {
        const name = n.name.toLowerCase();
        return (
          name.includes("button") ||
          name.includes("btn") ||
          name.includes("nav") ||
          name.includes("card") ||
          name.includes("input") ||
          n.type === "COMPONENT" ||
          n.type === "INSTANCE" ||
          ("reactions" in n && (n as any).reactions.length > 0)
        );
      });

      for (const el of descendants.slice(0, 30)) {
        interactiveElements.push({
          id: el.id,
          name: el.name,
          type: el.type,
          reactionsCount: "reactions" in el ? (el as any).reactions.length : 0,
        });
      }
    }

    return {
      id: screen.id,
      name: screen.name,
      type: screen.type,
      width: screen.width,
      height: screen.height,
      layoutMode: frame ? frame.layoutMode : undefined,
      itemSpacing: frame ? frame.itemSpacing : undefined,
      interactiveElementsCount: interactiveElements.length,
      interactiveElements,
    };
  });

  return {
    documentName: figma.root.name,
    currentPage: figma.currentPage.name,
    totalScreens: screens.length,
    flowStartingPoints: flows,
    screens,
  };
}

function serializeNode(node: BaseNode, maxDepth: number, currentDepth: number): any {
  const base: any = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ("x" in node && "y" in node) {
    base.x = (node as any).x;
    base.y = (node as any).y;
    base.width = (node as any).width;
    base.height = (node as any).height;
  }

  if (node.type === "FRAME") {
    const frame = node as FrameNode;
    base.layoutMode = frame.layoutMode;
    base.itemSpacing = frame.itemSpacing;
    if (frame.fills && Array.isArray(frame.fills) && frame.fills.length > 0) {
      const fill = frame.fills[0];
      if (fill.type === "SOLID") {
        base.fillColor = {
          r: Math.round(fill.color.r * 255),
          g: Math.round(fill.color.g * 255),
          b: Math.round(fill.color.b * 255),
        };
      }
    }
  }

  if (node.type === "TEXT") {
    const text = node as TextNode;
    base.characters = text.characters;
    base.fontSize = text.fontSize;
  }

  if ("children" in node && currentDepth < maxDepth) {
    // Filter out pure vector noise (VectorNode, BooleanOperation) to protect context window
    base.children = (node as any).children
      .filter((c: BaseNode) => c.type !== "VECTOR" && c.type !== "BOOLEAN_OPERATION")
      .slice(0, 50)
      .map((child: BaseNode) => serializeNode(child, maxDepth, currentDepth + 1));
  } else if ("children" in node) {
    base.childrenCount = (node as any).children.length;
  }

  return base;
}

export async function handleUpdateNode(params: {
  nodeId: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  image?: string;
  cornerRadius?: number;
  opacity?: number;
  visible?: boolean;
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node) throw new Error(`Node '${params.nodeId}' not found.`);

  if (params.name !== undefined) node.name = params.name;
  if (params.visible !== undefined) node.visible = params.visible;

  if ("x" in node && params.x !== undefined) (node as any).x = params.x;
  if ("y" in node && params.y !== undefined) (node as any).y = params.y;

  if (node.type === "TEXT") {
    if (params.width !== undefined) {
      const textNode = node as TextNode;
      if (textNode.fontName !== figma.mixed) {
        await ensureFontLoaded(textNode.fontName.family, textNode.fontName.style);
      } else {
        await ensureFontLoaded("Inter", "Regular");
      }
      textNode.textAutoResize = "HEIGHT";
      textNode.resize(params.width, textNode.height);
    }
  } else if ("resize" in node && (params.width !== undefined || params.height !== undefined)) {
    const currentW = (node as any).width || 100;
    const currentH = (node as any).height || 100;
    (node as any).resize(params.width ?? currentW, params.height ?? currentH);
  }

  if (params.image && "fills" in node) {
    await applyImageOrColor(node as any, params.image, params.fill);
  } else if (params.fill && "fills" in node) {
    (node as any).fills = [createSolidPaint(params.fill)];
  }

  if (params.cornerRadius !== undefined && "cornerRadius" in node) {
    (node as any).cornerRadius = params.cornerRadius;
  }

  if (params.opacity !== undefined && "opacity" in node) {
    (node as any).opacity = Math.max(0, Math.min(1, params.opacity));
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    updated: true,
  };
}

export async function handleDeleteNodes(params: { nodeIds: string[] }) {
  const deleted: string[] = [];
  for (const id of params.nodeIds) {
    const node = figma.getNodeById(id);
    if (node) {
      node.remove();
      deleted.push(id);
    }
  }
  return { deletedCount: deleted.length, deletedIds: deleted };
}

export async function handleDuplicateNode(params: {
  nodeId: string;
  offsetX?: number;
  offsetY?: number;
  name?: string;
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node) throw new Error(`Node '${params.nodeId}' not found.`);
  if (!("clone" in node)) throw new Error(`Node '${params.nodeId}' cannot be cloned.`);

  const clone = (node as any).clone() as SceneNode;
  if (params.offsetX !== undefined) clone.x += params.offsetX;
  else clone.x += 40;

  if (params.offsetY !== undefined) clone.y += params.offsetY;

  if (params.name) clone.name = params.name;

  return {
    id: clone.id,
    name: clone.name,
    type: clone.type,
    x: clone.x,
    y: clone.y,
  };
}

export async function handleSetStroke(params: {
  nodeId: string;
  color: string;
  weight?: number;
  strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node) throw new Error(`Node '${params.nodeId}' not found.`);
  if (!("strokes" in node)) throw new Error(`Node '${params.nodeId}' does not support strokes.`);

  const target = node as GeometryMixin;
  target.strokes = [createSolidPaint(params.color)];
  if (params.weight !== undefined) target.strokeWeight = params.weight;
  if (params.strokeAlign) target.strokeAlign = params.strokeAlign;

  return {
    id: node.id,
    strokeWeight: target.strokeWeight,
    strokeAlign: target.strokeAlign,
  };
}

export async function handleSetTextContent(params: {
  nodeId: string;
  text: string;
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node || node.type !== "TEXT") {
    throw new Error(`Node '${params.nodeId}' is not a TextNode.`);
  }

  const textNode = node as TextNode;
  // Load existing font if uniform, or Inter Regular
  if (textNode.fontName !== figma.mixed) {
    await ensureFontLoaded(textNode.fontName.family, textNode.fontName.style);
  } else {
    await ensureFontLoaded("Inter", "Regular");
  }

  textNode.characters = params.text;
  return {
    id: textNode.id,
    characters: textNode.characters,
  };
}

export async function handleFindNodes(params: {
  query?: string;
  type?: string;
  limit?: number;
}) {
  const max = params.limit || 50;
  const matches = figma.currentPage.findAll((node) => {
    let match = true;
    if (params.query) {
      match = match && node.name.toLowerCase().includes(params.query.toLowerCase());
    }
    if (params.type) {
      match = match && node.type === params.type.toUpperCase();
    }
    return match;
  });

  return matches.slice(0, max).map((node) => ({
    id: node.id,
    name: node.name,
    type: node.type,
  }));
}

export async function handleManagePage(params: {
  action: "create" | "set_active";
  name?: string;
  pageId?: string;
}) {
  if (params.action === "create") {
    const page = figma.createPage();
    page.name = params.name || "New Page";
    return { id: page.id, name: page.name };
  } else if (params.action === "set_active") {
    let targetPage: PageNode | null = null;
    if (params.pageId) {
      const found = figma.getNodeById(params.pageId);
      if (found && found.type === "PAGE") targetPage = found as PageNode;
    } else if (params.name) {
      targetPage = figma.root.children.find((p) => p.name.toLowerCase() === params.name!.toLowerCase()) || null;
    }

    if (!targetPage) throw new Error("Target page not found.");
    figma.currentPage = targetPage;
    return { id: targetPage.id, name: targetPage.name, active: true };
  }
  throw new Error(`Invalid page action '${params.action}'`);
}

export async function handleExportNodeImage(params: {
  nodeId: string;
  scale?: number;
}) {
  const node = figma.getNodeById(params.nodeId);
  if (!node || !("exportAsync" in node)) {
    throw new Error(`Node '${params.nodeId}' cannot be exported.`);
  }

  const bytes = await (node as SceneNode).exportAsync({
    format: "PNG",
    constraint: { type: "SCALE", value: params.scale || 2 },
  });

  const base64 = figma.base64Encode(bytes);
  return {
    nodeId: node.id,
    name: node.name,
    format: "PNG",
    base64Data: `data:image/png;base64,${base64}`,
  };
}

export async function handleGetDocumentTokens() {
  const paintStyles = figma.getLocalPaintStyles().map((s) => {
    let hex = undefined;
    if (s.paints.length > 0 && s.paints[0].type === "SOLID") {
      const p = s.paints[0];
      const r = Math.round(p.color.r * 255).toString(16).padStart(2, "0");
      const g = Math.round(p.color.g * 255).toString(16).padStart(2, "0");
      const b = Math.round(p.color.b * 255).toString(16).padStart(2, "0");
      hex = `#${r}${g}${b}`.toUpperCase();
    }
    return {
      id: s.id,
      name: s.name,
      hex,
    };
  });

  const textStyles = figma.getLocalTextStyles().map((s) => ({
    id: s.id,
    name: s.name,
    fontFamily: s.fontName.family,
    fontWeight: s.fontName.style,
    fontSize: s.fontSize,
    lineHeight: s.lineHeight,
  }));

  const effectStyles = figma.getLocalEffectStyles().map((s) => ({
    id: s.id,
    name: s.name,
    effects: s.effects.map((e) => ({ type: e.type, visible: e.visible })),
  }));

  return {
    documentName: figma.root.name,
    totalColorStyles: paintStyles.length,
    colors: paintStyles,
    totalTextStyles: textStyles.length,
    typography: textStyles,
    totalEffectStyles: effectStyles.length,
    effects: effectStyles,
  };
}

export async function handleCreateSvgIcon(params: {
  svg: string;
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fill?: string;
  parentId?: string;
}) {
  const node = figma.createNodeFromSvg(params.svg);
  if (params.name) {
    node.name = params.name;
  }
  if (params.width !== undefined && params.height !== undefined) {
    node.resize(params.width, params.height);
  }
  if (params.x !== undefined) node.x = params.x;
  if (params.y !== undefined) node.y = params.y;

  if (params.fill) {
    const paint = createSolidPaint(params.fill);
    const applyFill = (item: SceneNode) => {
      if ("fills" in item && Array.isArray((item as any).fills) && (item as any).fills.length > 0) {
        (item as any).fills = [paint];
      }
      if ("children" in item) {
        for (const child of (item as ChildrenMixin).children) {
          applyFill(child);
        }
      }
    };
    applyFill(node);
  }

  if (params.parentId) {
    const parent = figma.getNodeById(params.parentId);
    if (parent && "appendChild" in parent) {
      (parent as FrameNode).appendChild(node);
    } else {
      figma.currentPage.appendChild(node);
    }
  } else {
    figma.currentPage.appendChild(node);
  }

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };
}

export async function handleCreateEllipse(params: {
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fill?: string;
  stroke?: { color: string; width?: number };
  parentId?: string;
}) {
  const ellipse = figma.createEllipse();
  ellipse.name = params.name || "Ellipse";
  ellipse.resize(params.width || 100, params.height || 100);

  if (params.x !== undefined) ellipse.x = params.x;
  if (params.y !== undefined) ellipse.y = params.y;

  if (params.fill) {
    ellipse.fills = [createSolidPaint(params.fill)];
  }

  if (params.stroke) {
    ellipse.strokes = [createSolidPaint(params.stroke.color)];
    if (params.stroke.width !== undefined) {
      ellipse.strokeWeight = params.stroke.width;
    }
  }

  if (params.parentId) {
    const parent = figma.getNodeById(params.parentId);
    if (parent && "appendChild" in parent) {
      (parent as FrameNode).appendChild(ellipse);
    } else {
      figma.currentPage.appendChild(ellipse);
    }
  } else {
    figma.currentPage.appendChild(ellipse);
  }

  return {
    id: ellipse.id,
    name: ellipse.name,
    type: ellipse.type,
    x: ellipse.x,
    y: ellipse.y,
    width: ellipse.width,
    height: ellipse.height,
  };
}

export async function handleCreateComponent(params: {
  name: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fill?: string;
  cornerRadius?: number;
  fromNodeId?: string;
  parentId?: string;
}) {
  let comp: ComponentNode;

  if (params.fromNodeId) {
    const existingNode = figma.getNodeById(params.fromNodeId) as SceneNode;
    if (!existingNode) {
      throw new Error(`Source node '${params.fromNodeId}' not found.`);
    }

    if (existingNode.type === "COMPONENT") {
      if (params.name) existingNode.name = params.name;
      return {
        id: existingNode.id,
        name: existingNode.name,
        type: existingNode.type,
        x: existingNode.x,
        y: existingNode.y,
        width: existingNode.width,
        height: existingNode.height,
      };
    }

    comp = figma.createComponent();
    comp.name = params.name || existingNode.name;
    comp.resize(existingNode.width, existingNode.height);
    comp.x = existingNode.x;
    comp.y = existingNode.y;

    if ("fills" in existingNode && (existingNode as any).fills) {
      comp.fills = (existingNode as any).fills;
    }
    if ("cornerRadius" in existingNode && (existingNode as any).cornerRadius !== undefined) {
      comp.cornerRadius = (existingNode as any).cornerRadius;
    }

    if ("children" in existingNode) {
      const children = [...(existingNode as FrameNode).children];
      for (const child of children) {
        comp.appendChild(child);
      }
    }

    if (existingNode.parent) {
      existingNode.parent.appendChild(comp);
      existingNode.remove();
    } else {
      figma.currentPage.appendChild(comp);
    }
  } else {
    comp = figma.createComponent();
    comp.name = params.name || "Component";
    comp.resize(params.width || 120, params.height || 40);

    if (params.x !== undefined) comp.x = params.x;
    if (params.y !== undefined) comp.y = params.y;

    if (params.fill) {
      comp.fills = [createSolidPaint(params.fill)];
    }
    if (params.cornerRadius !== undefined) {
      comp.cornerRadius = params.cornerRadius;
    }

    if (params.parentId) {
      const parent = figma.getNodeById(params.parentId);
      if (parent && "appendChild" in parent) {
        (parent as FrameNode).appendChild(comp);
      } else {
        figma.currentPage.appendChild(comp);
      }
    } else {
      figma.currentPage.appendChild(comp);
    }
  }

  return {
    id: comp.id,
    name: comp.name,
    type: comp.type,
    key: comp.key,
    x: comp.x,
    y: comp.y,
    width: comp.width,
    height: comp.height,
  };
}

export async function handleCreateComponentInstance(params: {
  componentId: string;
  name?: string;
  x?: number;
  y?: number;
  parentId?: string;
}) {
  const comp = figma.getNodeById(params.componentId);
  if (!comp || comp.type !== "COMPONENT") {
    throw new Error(`Node '${params.componentId}' is not a valid Component.`);
  }

  const instance = (comp as ComponentNode).createInstance();

  if (params.name) instance.name = params.name;
  if (params.x !== undefined) instance.x = params.x;
  if (params.y !== undefined) instance.y = params.y;

  if (params.parentId) {
    const parent = figma.getNodeById(params.parentId);
    if (parent && "appendChild" in parent) {
      (parent as FrameNode).appendChild(instance);
    } else {
      figma.currentPage.appendChild(instance);
    }
  } else {
    figma.currentPage.appendChild(instance);
  }

  return {
    id: instance.id,
    name: instance.name,
    type: instance.type,
    mainComponentId: comp.id,
    mainComponentName: comp.name,
    x: instance.x,
    y: instance.y,
    width: instance.width,
    height: instance.height,
  };
}

export async function handleSetEffects(params: {
  nodeId: string;
  effects: Array<{
    type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
    color?: string;
    offset?: { x: number; y: number };
    radius: number;
    spread?: number;
    visible?: boolean;
    blendMode?: BlendMode;
  }>;
}) {
  const node = figma.getNodeById(params.nodeId) as SceneNode;
  if (!node || !("effects" in node)) {
    throw new Error(`Node '${params.nodeId}' does not support visual effects.`);
  }

  const figmaEffects: Effect[] = params.effects.map((e) => {
    const visible = e.visible !== false;
    if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
      const { rgb, opacity } = hexToFigmaColor(e.color || "#00000040");
      return {
        type: e.type,
        color: { ...rgb, a: opacity },
        offset: { x: e.offset?.x ?? 0, y: e.offset?.y ?? 4 },
        radius: e.radius,
        spread: e.spread ?? 0,
        visible,
        blendMode: e.blendMode || "NORMAL",
        showShadowBehindNode: false,
      };
    } else {
      return {
        type: e.type,
        radius: e.radius,
        visible,
      };
    }
  });

  (node as any).effects = figmaEffects;

  return {
    nodeId: node.id,
    name: node.name,
    effectsCount: figmaEffects.length,
    effects: figmaEffects.map((e) => ({
      type: e.type,
      radius: e.radius,
      visible: e.visible,
    })),
  };
}

export async function handleCreateSection(params: {
  name?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  fill?: string;
  childNodeIds?: string[];
}) {
  const section = figma.createSection();
  section.name = params.name || "Section";
  const w = params.width || 1200;
  const h = params.height || 800;
  section.resizeWithoutConstraints(w, h);

  if (params.x !== undefined) section.x = params.x;
  if (params.y !== undefined) section.y = params.y;

  if (params.fill) {
    section.fills = [createSolidPaint(params.fill)];
  }

  if (params.childNodeIds && params.childNodeIds.length > 0) {
    for (const childId of params.childNodeIds) {
      const child = figma.getNodeById(childId) as SceneNode;
      if (child && child !== (section as any)) {
        section.appendChild(child);
      }
    }
  }

  figma.currentPage.appendChild(section);

  return {
    id: section.id,
    name: section.name,
    type: section.type,
    x: section.x,
    y: section.y,
    width: section.width,
    height: section.height,
    childrenCount: section.children.length,
  };
}

export async function handleFocusViewport(params: {
  nodeIds: string[];
  select?: boolean;
}) {
  const nodes: SceneNode[] = [];
  for (const id of params.nodeIds) {
    const node = figma.getNodeById(id) as SceneNode;
    if (node) {
      nodes.push(node);
    }
  }

  if (nodes.length === 0) {
    throw new Error(`None of the specified nodes [${params.nodeIds.join(", ")}] were found.`);
  }

  if (params.select !== false) {
    figma.currentPage.selection = nodes;
  }

  figma.viewport.scrollAndZoomIntoView(nodes);

  return {
    focusedCount: nodes.length,
    focusedNodes: nodes.map((n) => ({ id: n.id, name: n.name, type: n.type })),
    selected: params.select !== false,
  };
}

