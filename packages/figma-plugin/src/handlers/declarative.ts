import { createSolidPaint, getContrastRatio } from "../helpers/color";
import { ensureFontLoaded } from "../helpers/font";
import { sanitizeUiText, applyIntelligentTypography, STANDARD_TYPE_SCALE } from "../helpers/typography";

export interface UINodeSpec {
  type: "frame" | "rectangle" | "text" | "button" | "card" | "divider" | "spacer";
  name?: string;
  tag?: string;
  image?: string;

  // Layout & Sizing
  layout?: "horizontal" | "vertical" | "none";
  spacing?: number;
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  width?: number | "hug" | "fill";
  height?: number | "hug" | "fill";
  alignItems?: "min" | "center" | "max" | "space_between";
  crossAlignItems?: "min" | "center" | "max" | "baseline";
  wrap?: boolean;
  counterAxisSpacing?: number;

  // Appearance
  fill?: string;
  stroke?: { color: string; width?: number; align?: "INSIDE" | "OUTSIDE" | "CENTER" };
  cornerRadius?: number;
  opacity?: number;
  clipsContent?: boolean;

  // Typography (for text or button)
  variant?:
    | "display-2xl"
    | "display-xl"
    | "display-lg"
    | "h1"
    | "h2"
    | "h3"
    | "subheading"
    | "body-lg"
    | "body-md"
    | "body-sm"
    | "caption"
    | "badge";
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  textColor?: string;

  // Nested Elements
  children?: UINodeSpec[];
}

export interface ScreenSpec {
  name: string;
  tag?: string;
  preset?: "iPhone 16" | "iPhone 16 Pro Max" | "Android" | "Desktop" | "Tablet" | "Custom";
  width?: number;
  height?: number;
  fill?: string;
  x?: number;
  y?: number;
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number };
  spacing?: number;
  children: UINodeSpec[];
}

const PRESET_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "iPhone 16": { width: 393, height: 852 },
  "iPhone 16 Pro Max": { width: 440, height: 956 },
  Android: { width: 360, height: 800 },
  Desktop: { width: 1440, height: 900 },
  Tablet: { width: 834, height: 1194 },
};

export async function applyImageOrColor(
  node: GeometryMixin & MinimalFillsMixin,
  imageUrl?: string,
  fallbackColor?: string
) {
  if (imageUrl) {
    try {
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Image download timeout")), 3500)
        );
        const image = await Promise.race([
          figma.createImageAsync(imageUrl),
          timeoutPromise,
        ]);
        node.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: image.hash }];
        return;
      } else if (imageUrl.startsWith("data:")) {
        const base64Data = (imageUrl.split(",")[1] || imageUrl).replace(/\s+/g, "");
        const bytes = figma.base64Decode(base64Data);
        const image = figma.createImage(bytes);
        node.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: image.hash }];
        return;
      }
    } catch (err) {
      console.warn("Failed to load image into node:", err);
    }
  }

  if (fallbackColor) {
    node.fills = [createSolidPaint(fallbackColor)];
  } else {
    // Provide a visible warm neutral institutional fill instead of leaving node transparent
    node.fills = [createSolidPaint("#EDE8DC")];
  }
}

export async function handleGenerateUITree(spec: ScreenSpec) {
  // 1. Collect and pre-load all required fonts
  const fontsToLoad = new Set<string>();
  collectFonts(spec.children, fontsToLoad);
  fontsToLoad.add("Inter::Regular");
  fontsToLoad.add("Inter::Medium");
  fontsToLoad.add("Inter::Bold");

  for (const fontKey of fontsToLoad) {
    const [family, style] = fontKey.split("::");
    await ensureFontLoaded(family, style);
  }

  // 2. Determine root frame dimensions
  const parsedWidth = typeof spec.width === "number" ? spec.width : 393;
  const parsedHeight = typeof spec.height === "number" ? spec.height : 900;
  const dims = spec.preset && PRESET_DIMENSIONS[spec.preset]
    ? PRESET_DIMENSIONS[spec.preset]
    : { width: parsedWidth, height: parsedHeight };

  const rootFrame = figma.createFrame();
  rootFrame.name = spec.name || "Screen";
  rootFrame.resize(dims.width, dims.height);
  rootFrame.clipsContent = false;

  if (spec.x !== undefined) rootFrame.x = spec.x;
  if (spec.y !== undefined) rootFrame.y = spec.y;

  rootFrame.fills = [createSolidPaint(spec.fill || "#FFFFFF")];

  // Configure AutoLayout on Root Screen Frame
  rootFrame.layoutMode = "VERTICAL";
  rootFrame.counterAxisSizingMode = "FIXED";
  if (spec.height === "hug" || spec.height === undefined || (!spec.preset && spec.height > 1000)) {
    rootFrame.primaryAxisSizingMode = "AUTO";
  } else {
    rootFrame.primaryAxisSizingMode = "FIXED";
  }

  if (spec.spacing !== undefined) rootFrame.itemSpacing = spec.spacing;

  applyPadding(rootFrame, spec.padding);

  figma.currentPage.appendChild(rootFrame);

  // 3. Build hierarchy recursively
  const tagRegistry: Record<string, string> = {};
  if (spec.tag) {
    tagRegistry[spec.tag] = rootFrame.id;
  }

  let totalNodes = 1;

  for (const childSpec of spec.children) {
    totalNodes += await buildNode(childSpec, rootFrame, tagRegistry);
  }

  // Focus viewport on newly generated screen
  figma.viewport.scrollAndZoomIntoView([rootFrame]);

  return {
    screenId: rootFrame.id,
    screenName: rootFrame.name,
    width: rootFrame.width,
    height: rootFrame.height,
    totalNodes,
    tags: tagRegistry,
  };
}

async function buildNode(
  spec: UINodeSpec,
  parent: FrameNode,
  tagRegistry: Record<string, string>
): Promise<number> {
  let createdCount = 1;

  switch (spec.type) {
    case "frame":
    case "card": {
      const frame = figma.createFrame();
      frame.name = spec.name || (spec.type === "card" ? "Card" : "Container");

      // AutoLayout
      if (spec.layout === "horizontal") frame.layoutMode = "HORIZONTAL";
      else if (spec.layout === "none") frame.layoutMode = "NONE";
      else frame.layoutMode = "VERTICAL"; // default

      if (frame.layoutMode !== "NONE") {
        if (spec.spacing !== undefined) frame.itemSpacing = spec.spacing;
        applyPadding(frame, spec.padding ?? (spec.type === "card" ? 16 : 0));
        applyAlignment(frame, spec.alignItems, spec.crossAlignItems);
        if (spec.wrap) {
          (frame as any).layoutWrap = "WRAP";
          if (spec.counterAxisSpacing !== undefined) {
            (frame as any).counterAxisSpacing = spec.counterAxisSpacing;
          }
        }
      }

      // Sizing
      const initialW = typeof spec.width === "number" ? spec.width : parent.width - 32;
      const initialH = typeof spec.height === "number" ? spec.height : 100;
      frame.resize(Math.max(1, initialW), Math.max(1, initialH));

      // Appearance
      await applyImageOrColor(frame, spec.image, spec.fill || (spec.type === "card" ? "#FFFFFF" : undefined));

      if (spec.cornerRadius !== undefined) {
        frame.cornerRadius = spec.cornerRadius;
      } else if (spec.type === "card") {
        frame.cornerRadius = 12;
      }

      // Clips content: cards or explicit clip
      if (spec.clipsContent !== undefined) {
        frame.clipsContent = spec.clipsContent;
      } else if (spec.type === "card") {
        frame.clipsContent = true;
      } else {
        frame.clipsContent = false;
      }

      if (spec.stroke) {
        frame.strokes = [createSolidPaint(spec.stroke.color)];
        frame.strokeWeight = spec.stroke.width ?? 1;
        if (spec.stroke.align) frame.strokeAlign = spec.stroke.align;
      }

      parent.appendChild(frame);

      if (spec.tag) tagRegistry[spec.tag] = frame.id;

      if (spec.children && spec.children.length > 0) {
        for (const child of spec.children) {
          createdCount += await buildNode(child, frame, tagRegistry);
        }
      }

      // Sizing is applied AFTER children are appended so AutoLayout hugs content accurately
      applyLayoutSizing(frame, spec.width, spec.height);
      break;
    }

    case "button": {
      const btn = figma.createFrame();
      btn.name = spec.name || "Button";
      btn.layoutMode = "HORIZONTAL";
      btn.primaryAxisAlignItems = "CENTER";
      btn.counterAxisAlignItems = "CENTER";
      btn.itemSpacing = 8;

      // HCI / Apple HIG Guardian: Minimum vertical padding 12px, horizontal padding 20-24px
      let padding = spec.padding ?? { top: 12, bottom: 12, left: 24, right: 24 };
      if (typeof padding === "number") {
        padding = {
          top: Math.max(10, padding),
          bottom: Math.max(10, padding),
          left: Math.max(16, padding),
          right: Math.max(16, padding),
        };
      } else {
        padding = {
          top: Math.max(10, padding.top ?? 12),
          bottom: Math.max(10, padding.bottom ?? 12),
          left: Math.max(16, padding.left ?? 24),
          right: Math.max(16, padding.right ?? 24),
        };
      }
      applyPadding(btn, padding);

      btn.cornerRadius = spec.cornerRadius ?? 8;
      const btnFill = spec.fill || "#2563EB";
      btn.fills = [createSolidPaint(btnFill)];

      if (spec.stroke) {
        btn.strokes = [createSolidPaint(spec.stroke.color)];
        btn.strokeWeight = spec.stroke.width ?? 1;
      }

      // Add label text inside button with Emoji Sanitization & Typography
      const font = await ensureFontLoaded(
        spec.fontFamily || "Inter",
        spec.fontWeight || "SemiBold"
      );
      const label = figma.createText();
      label.fontName = font;
      const btnFontSize = spec.fontSize || 15;
      label.fontSize = btnFontSize;

      // Strip emojis
      const { text: cleanLabel } = sanitizeUiText(spec.text || "Click Me");
      label.characters = cleanLabel;

      // Auto-contrast guardian: ensure text is readable against button background
      let textColor = spec.textColor || "#FFFFFF";
      if (spec.textColor && spec.fill) {
        const ratio = getContrastRatio(spec.textColor, btnFill);
        if (ratio < 3.0) {
          textColor =
            getContrastRatio("#FFFFFF", btnFill) > getContrastRatio("#111827", btnFill)
              ? "#FFFFFF"
              : "#111827";
        }
      }
      label.fills = [createSolidPaint(textColor)];

      // Apply intelligent typography to button label
      applyIntelligentTypography(label, btnFontSize);

      btn.appendChild(label);
      parent.appendChild(btn);

      // Sizing with HCI touch target enforcement (min 44px)
      if (typeof spec.width === "number") {
        btn.resize(Math.max(44, spec.width), btn.height);
        btn.primaryAxisSizingMode = "FIXED";
      } else if (spec.width === "fill") {
        btn.layoutAlign = "STRETCH";
      } else {
        btn.primaryAxisSizingMode = "AUTO";
      }

      if (typeof spec.height === "number") {
        // Enforce Apple HIG / WCAG minimum touch target of 44px
        const enforcedHeight = Math.max(44, spec.height);
        btn.resize(btn.width, enforcedHeight);
        btn.counterAxisSizingMode = "FIXED";
      } else {
        btn.counterAxisSizingMode = "AUTO";
      }

      if (spec.tag) tagRegistry[spec.tag] = btn.id;
      break;
    }

    case "text": {
      let weight = spec.fontWeight || "Regular";
      let fontSize = spec.fontSize || 15;
      if (spec.variant && STANDARD_TYPE_SCALE[spec.variant]) {
        fontSize = spec.fontSize || STANDARD_TYPE_SCALE[spec.variant].size;
        weight = spec.fontWeight || STANDARD_TYPE_SCALE[spec.variant].defaultWeight;
      }

      const font = await ensureFontLoaded(
        spec.fontFamily || "Inter",
        weight
      );
      const textNode = figma.createText();
      textNode.fontName = font;
      textNode.fontSize = fontSize;

      // Strip emojis from text
      const { text: cleanText } = sanitizeUiText(spec.text || "");
      textNode.characters = cleanText;

      // Apply intelligent leading and optical tracking
      applyIntelligentTypography(textNode, fontSize, false, spec.variant);

      textNode.fills = [createSolidPaint(spec.textColor || spec.fill || "#111827")];
      textNode.name = spec.name || (cleanText ? cleanText.slice(0, 20) : "Text");

      parent.appendChild(textNode);

      if (spec.width === "fill") {
        if (parent.layoutMode === "VERTICAL") {
          textNode.layoutAlign = "STRETCH";
        } else if (parent.layoutMode === "HORIZONTAL") {
          textNode.layoutGrow = 1;
        }
        textNode.textAutoResize = "HEIGHT";
      } else if (typeof spec.width === "number") {
        textNode.resize(spec.width, textNode.height);
        textNode.textAutoResize = "HEIGHT";
      } else if (parent.layoutMode === "VERTICAL" && parent.width > 60) {
        // Anti-overflow determinism: In any vertical container (cards, sections, columns),
        // text must wrap to container width instead of overflowing horizontally across boundaries.
        const innerW = Math.max(60, parent.width - ((parent.paddingLeft || 0) + (parent.paddingRight || 0)));
        textNode.resize(innerW, textNode.height);
        textNode.textAutoResize = "HEIGHT";
        textNode.layoutAlign = "STRETCH";
      } else {
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";
      }

      if (spec.tag) tagRegistry[spec.tag] = textNode.id;
      break;
    }

    case "rectangle": {
      const rect = figma.createRectangle();
      rect.name = spec.name || "Rectangle";
      const w = typeof spec.width === "number" ? spec.width : 100;
      const h = typeof spec.height === "number" ? spec.height : 100;
      rect.resize(w, h);

      await applyImageOrColor(rect, spec.image, spec.fill);

      if (spec.cornerRadius) rect.cornerRadius = spec.cornerRadius;
      if (spec.stroke) {
        rect.strokes = [createSolidPaint(spec.stroke.color)];
        rect.strokeWeight = spec.stroke.width ?? 1;
      }

      parent.appendChild(rect);
      applyLayoutSizing(rect, spec.width, spec.height);

      if (spec.tag) tagRegistry[spec.tag] = rect.id;
      break;
    }

    case "divider": {
      const divider = figma.createRectangle();
      divider.name = spec.name || "Divider";
      divider.resize(parent.width || 300, 1);
      divider.fills = [createSolidPaint(spec.fill || "#E2E8F0")];
      parent.appendChild(divider);
      divider.layoutAlign = "STRETCH";
      if (spec.tag) tagRegistry[spec.tag] = divider.id;
      break;
    }

    case "spacer": {
      const spacer = figma.createFrame();
      spacer.name = "Spacer";
      spacer.fills = [];
      const h = typeof spec.height === "number" ? spec.height : 16;
      spacer.resize(1, h);
      parent.appendChild(spacer);
      if (spec.height === "fill") {
        spacer.layoutGrow = 1;
      }
      break;
    }
  }

  return createdCount;
}

function applyPadding(
  frame: FrameNode,
  padding?: number | { top?: number; bottom?: number; left?: number; right?: number }
) {
  if (padding === undefined) return;
  if (typeof padding === "number") {
    frame.paddingTop = padding;
    frame.paddingBottom = padding;
    frame.paddingLeft = padding;
    frame.paddingRight = padding;
  } else {
    if (padding.top !== undefined) frame.paddingTop = padding.top;
    if (padding.bottom !== undefined) frame.paddingBottom = padding.bottom;
    if (padding.left !== undefined) frame.paddingLeft = padding.left;
    if (padding.right !== undefined) frame.paddingRight = padding.right;
  }
}

function applyAlignment(
  frame: FrameNode,
  primary?: "min" | "center" | "max" | "space_between",
  counter?: "min" | "center" | "max" | "baseline"
) {
  if (primary) {
    const map: Record<string, "MIN" | "CENTER" | "MAX" | "SPACE_BETWEEN"> = {
      min: "MIN",
      center: "CENTER",
      max: "MAX",
      space_between: "SPACE_BETWEEN",
    };
    if (map[primary]) frame.primaryAxisAlignItems = map[primary];
  }
  if (counter) {
    const map: Record<string, "MIN" | "CENTER" | "MAX" | "BASELINE"> = {
      min: "MIN",
      center: "CENTER",
      max: "MAX",
      baseline: "BASELINE",
    };
    if (map[counter]) frame.counterAxisAlignItems = map[counter];
  }
}

function applyLayoutSizing(
  node: SceneNode,
  width?: number | "hug" | "fill",
  height?: number | "hug" | "fill"
) {
  if ("layoutAlign" in node && "layoutGrow" in node) {
    if (width === "fill") {
      (node as any).layoutAlign = "STRETCH";
    }
    if (height === "fill") {
      (node as any).layoutGrow = 1;
    }
  }

  if (node.type === "FRAME") {
    const frame = node as FrameNode;
    if (frame.layoutMode === "VERTICAL") {
      if (width === "hug") frame.counterAxisSizingMode = "AUTO";
      else if (typeof width === "number") frame.counterAxisSizingMode = "FIXED";

      if (height === "hug" || height === undefined) frame.primaryAxisSizingMode = "AUTO";
      else if (typeof height === "number") frame.primaryAxisSizingMode = "FIXED";
    } else if (frame.layoutMode === "HORIZONTAL") {
      if (width === "hug" || width === undefined) frame.primaryAxisSizingMode = "AUTO";
      else if (typeof width === "number") frame.primaryAxisSizingMode = "FIXED";

      if (height === "hug" || height === undefined) frame.counterAxisSizingMode = "AUTO";
      else if (typeof height === "number") frame.counterAxisSizingMode = "FIXED";
    }
  }
}

function collectFonts(specs: UINodeSpec[], set: Set<string>) {
  for (const s of specs) {
    let weight = s.fontWeight || "Regular";
    if (s.variant && STANDARD_TYPE_SCALE[s.variant] && !s.fontWeight) {
      weight = STANDARD_TYPE_SCALE[s.variant].defaultWeight;
    }
    if (s.fontFamily || s.fontWeight || s.variant) {
      set.add(`${s.fontFamily || "Inter"}::${weight}`);
    }
    if (s.children) {
      collectFonts(s.children, set);
    }
  }
}
