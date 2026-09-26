"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __async = (__this, __arguments, generator) => {
    return new Promise((resolve, reject) => {
      var fulfilled = (value) => {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      };
      var rejected = (value) => {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      };
      var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
      step((generator = generator.apply(__this, __arguments)).next());
    });
  };

  // src/helpers/color.ts
  function hexToFigmaColor(hex) {
    let cleaned = hex.replace("#", "").trim();
    if (cleaned.length === 3) {
      cleaned = cleaned.split("").map((c) => c + c).join("");
    }
    if (cleaned.length === 6) {
      const num = parseInt(cleaned, 16);
      return {
        rgb: {
          r: (num >> 16 & 255) / 255,
          g: (num >> 8 & 255) / 255,
          b: (num & 255) / 255
        },
        opacity: 1
      };
    }
    if (cleaned.length === 8) {
      const num = parseInt(cleaned, 16);
      return {
        rgb: {
          r: (num >> 24 & 255) / 255,
          g: (num >> 16 & 255) / 255,
          b: (num >> 8 & 255) / 255
        },
        opacity: (num & 255) / 255
      };
    }
    return {
      rgb: { r: 0, g: 0, b: 0 },
      opacity: 1
    };
  }
  function createSolidPaint(hex) {
    const { rgb, opacity } = hexToFigmaColor(hex);
    return {
      type: "SOLID",
      color: rgb,
      opacity
    };
  }
  function getRelativeLuminance(rgb) {
    const transform = (c) => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const r = transform(rgb.r);
    const g = transform(rgb.g);
    const b = transform(rgb.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function getContrastRatio(hex1, hex2) {
    const color1 = hexToFigmaColor(hex1).rgb;
    const color2 = hexToFigmaColor(hex2).rgb;
    const lum1 = getRelativeLuminance(color1);
    const lum2 = getRelativeLuminance(color2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // src/helpers/font.ts
  var loadedFonts = /* @__PURE__ */ new Set();
  function ensureFontLoaded(family = "Inter", style = "Regular") {
    return __async(this, null, function* () {
      const key = `${family}::${style}`;
      if (loadedFonts.has(key)) {
        return { family, style };
      }
      try {
        const fontName = { family, style };
        yield figma.loadFontAsync(fontName);
        loadedFonts.add(key);
        return fontName;
      } catch (error) {
        console.warn(`[Figma Plugin] Failed to load font ${family} ${style}, falling back to Inter Regular:`, error);
        const fallback = { family: "Inter", style: "Regular" };
        yield figma.loadFontAsync(fallback);
        loadedFonts.add("Inter::Regular");
        return fallback;
      }
    });
  }

  // src/helpers/typography.ts
  var EMOJI_REGEX = /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;
  function sanitizeUiText(rawText) {
    if (!rawText) return { text: "", emojisRemoved: false };
    const hasEmoji = EMOJI_REGEX.test(rawText);
    EMOJI_REGEX.lastIndex = 0;
    if (!hasEmoji) {
      return { text: rawText, emojisRemoved: false };
    }
    const cleaned = rawText.replace(EMOJI_REGEX, "").replace(/\s{2,}/g, " ").trim();
    return {
      text: cleaned,
      emojisRemoved: true
    };
  }
  function calculateTypographyProperties(fontSize, isUppercase = false) {
    const size = Math.max(8, fontSize);
    if (size >= 32) {
      return {
        lineHeight: Math.round(size * 1.15),
        letterSpacing: -1.5
      };
    }
    if (size >= 24) {
      return {
        lineHeight: Math.round(size * 1.25),
        letterSpacing: -1
      };
    }
    if (size >= 18) {
      return {
        lineHeight: Math.round(size * 1.35),
        letterSpacing: -0.5
      };
    }
    if (size >= 14) {
      return {
        lineHeight: Math.round(size * 1.5),
        letterSpacing: isUppercase ? 1 : 0
      };
    }
    return {
      lineHeight: Math.round(size * 1.4),
      letterSpacing: isUppercase ? 2.5 : 1.2
    };
  }
  function applyIntelligentTypography(textNode, fontSize, isUppercase) {
    const size = fontSize != null ? fontSize : typeof textNode.fontSize === "number" ? textNode.fontSize : 16;
    const { lineHeight, letterSpacing } = calculateTypographyProperties(size, isUppercase);
    textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
    textNode.letterSpacing = { value: letterSpacing, unit: "PERCENT" };
  }

  // src/handlers/declarative.ts
  var PRESET_DIMENSIONS = {
    "iPhone 16": { width: 393, height: 852 },
    "iPhone 16 Pro Max": { width: 440, height: 956 },
    Android: { width: 360, height: 800 },
    Desktop: { width: 1440, height: 900 },
    Tablet: { width: 834, height: 1194 }
  };
  function applyImageOrColor(node, imageUrl, fallbackColor) {
    return __async(this, null, function* () {
      if (imageUrl) {
        try {
          if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
            const timeoutPromise = new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Image download timeout")), 3500)
            );
            const image = yield Promise.race([
              figma.createImageAsync(imageUrl),
              timeoutPromise
            ]);
            node.fills = [{ type: "IMAGE", scaleMode: "FILL", imageHash: image.hash }];
            return;
          } else if (imageUrl.startsWith("data:")) {
            const base64Data = imageUrl.split(",")[1] || imageUrl;
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
        node.fills = [];
      }
    });
  }
  function handleGenerateUITree(spec) {
    return __async(this, null, function* () {
      const fontsToLoad = /* @__PURE__ */ new Set();
      collectFonts(spec.children, fontsToLoad);
      fontsToLoad.add("Inter::Regular");
      fontsToLoad.add("Inter::Medium");
      fontsToLoad.add("Inter::Bold");
      for (const fontKey of fontsToLoad) {
        const [family, style] = fontKey.split("::");
        yield ensureFontLoaded(family, style);
      }
      const dims = spec.preset && PRESET_DIMENSIONS[spec.preset] ? PRESET_DIMENSIONS[spec.preset] : { width: spec.width || 393, height: spec.height || 852 };
      const rootFrame = figma.createFrame();
      rootFrame.name = spec.name || "Screen";
      rootFrame.resize(dims.width, dims.height);
      rootFrame.clipsContent = false;
      if (spec.x !== void 0) rootFrame.x = spec.x;
      if (spec.y !== void 0) rootFrame.y = spec.y;
      rootFrame.fills = [createSolidPaint(spec.fill || "#FFFFFF")];
      rootFrame.layoutMode = "VERTICAL";
      rootFrame.counterAxisSizingMode = "FIXED";
      if (spec.height === "hug" || spec.height === void 0 || !spec.preset && spec.height > 1e3) {
        rootFrame.primaryAxisSizingMode = "AUTO";
      } else {
        rootFrame.primaryAxisSizingMode = "FIXED";
      }
      if (spec.spacing !== void 0) rootFrame.itemSpacing = spec.spacing;
      applyPadding(rootFrame, spec.padding);
      figma.currentPage.appendChild(rootFrame);
      const tagRegistry = {};
      if (spec.tag) {
        tagRegistry[spec.tag] = rootFrame.id;
      }
      let totalNodes = 1;
      for (const childSpec of spec.children) {
        totalNodes += yield buildNode(childSpec, rootFrame, tagRegistry);
      }
      figma.viewport.scrollAndZoomIntoView([rootFrame]);
      return {
        screenId: rootFrame.id,
        screenName: rootFrame.name,
        width: rootFrame.width,
        height: rootFrame.height,
        totalNodes,
        tags: tagRegistry
      };
    });
  }
  function buildNode(spec, parent, tagRegistry) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
      let createdCount = 1;
      switch (spec.type) {
        case "frame":
        case "card": {
          const frame = figma.createFrame();
          frame.name = spec.name || (spec.type === "card" ? "Card" : "Container");
          if (spec.layout === "horizontal") frame.layoutMode = "HORIZONTAL";
          else if (spec.layout === "none") frame.layoutMode = "NONE";
          else frame.layoutMode = "VERTICAL";
          if (frame.layoutMode !== "NONE") {
            if (spec.spacing !== void 0) frame.itemSpacing = spec.spacing;
            applyPadding(frame, (_a = spec.padding) != null ? _a : spec.type === "card" ? 16 : 0);
            applyAlignment(frame, spec.alignItems, spec.crossAlignItems);
          }
          const initialW = typeof spec.width === "number" ? spec.width : parent.width - 32;
          const initialH = typeof spec.height === "number" ? spec.height : 100;
          frame.resize(Math.max(1, initialW), Math.max(1, initialH));
          yield applyImageOrColor(frame, spec.image, spec.fill || (spec.type === "card" ? "#FFFFFF" : void 0));
          if (spec.cornerRadius !== void 0) {
            frame.cornerRadius = spec.cornerRadius;
          } else if (spec.type === "card") {
            frame.cornerRadius = 12;
          }
          if (spec.clipsContent !== void 0) {
            frame.clipsContent = spec.clipsContent;
          } else if (spec.type === "card") {
            frame.clipsContent = true;
          } else {
            frame.clipsContent = false;
          }
          if (spec.stroke) {
            frame.strokes = [createSolidPaint(spec.stroke.color)];
            frame.strokeWeight = (_b = spec.stroke.width) != null ? _b : 1;
            if (spec.stroke.align) frame.strokeAlign = spec.stroke.align;
          }
          parent.appendChild(frame);
          if (spec.tag) tagRegistry[spec.tag] = frame.id;
          if (spec.children && spec.children.length > 0) {
            for (const child of spec.children) {
              createdCount += yield buildNode(child, frame, tagRegistry);
            }
          }
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
          let padding = (_c = spec.padding) != null ? _c : { top: 12, bottom: 12, left: 24, right: 24 };
          if (typeof padding === "number") {
            padding = {
              top: Math.max(10, padding),
              bottom: Math.max(10, padding),
              left: Math.max(16, padding),
              right: Math.max(16, padding)
            };
          } else {
            padding = {
              top: Math.max(10, (_d = padding.top) != null ? _d : 12),
              bottom: Math.max(10, (_e = padding.bottom) != null ? _e : 12),
              left: Math.max(16, (_f = padding.left) != null ? _f : 24),
              right: Math.max(16, (_g = padding.right) != null ? _g : 24)
            };
          }
          applyPadding(btn, padding);
          btn.cornerRadius = (_h = spec.cornerRadius) != null ? _h : 8;
          const btnFill = spec.fill || "#2563EB";
          btn.fills = [createSolidPaint(btnFill)];
          if (spec.stroke) {
            btn.strokes = [createSolidPaint(spec.stroke.color)];
            btn.strokeWeight = (_i = spec.stroke.width) != null ? _i : 1;
          }
          const font = yield ensureFontLoaded(
            spec.fontFamily || "Inter",
            spec.fontWeight || "SemiBold"
          );
          const label = figma.createText();
          label.fontName = font;
          const btnFontSize = spec.fontSize || 15;
          label.fontSize = btnFontSize;
          const { text: cleanLabel } = sanitizeUiText(spec.text || "Click Me");
          label.characters = cleanLabel;
          let textColor = spec.textColor || "#FFFFFF";
          if (spec.textColor && spec.fill) {
            const ratio = getContrastRatio(spec.textColor, btnFill);
            if (ratio < 3) {
              textColor = getContrastRatio("#FFFFFF", btnFill) > getContrastRatio("#111827", btnFill) ? "#FFFFFF" : "#111827";
            }
          }
          label.fills = [createSolidPaint(textColor)];
          applyIntelligentTypography(label, btnFontSize);
          btn.appendChild(label);
          parent.appendChild(btn);
          if (typeof spec.width === "number") {
            btn.resize(Math.max(44, spec.width), btn.height);
            btn.primaryAxisSizingMode = "FIXED";
          } else if (spec.width === "fill") {
            btn.layoutAlign = "STRETCH";
          } else {
            btn.primaryAxisSizingMode = "AUTO";
          }
          if (typeof spec.height === "number") {
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
          const font = yield ensureFontLoaded(
            spec.fontFamily || "Inter",
            spec.fontWeight || "Regular"
          );
          const textNode = figma.createText();
          textNode.fontName = font;
          const fontSize = spec.fontSize || 15;
          textNode.fontSize = fontSize;
          const { text: cleanText } = sanitizeUiText(spec.text || "");
          textNode.characters = cleanText;
          applyIntelligentTypography(textNode, fontSize);
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
          } else {
            if (parent.layoutMode === "VERTICAL" && textNode.characters.length > 40 && parent.width > 120) {
              const innerW = Math.max(120, parent.width - ((parent.paddingLeft || 0) + (parent.paddingRight || 0)));
              textNode.resize(innerW, textNode.height);
              textNode.textAutoResize = "HEIGHT";
              textNode.layoutAlign = "STRETCH";
            }
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
          yield applyImageOrColor(rect, spec.image, spec.fill);
          if (spec.cornerRadius) rect.cornerRadius = spec.cornerRadius;
          if (spec.stroke) {
            rect.strokes = [createSolidPaint(spec.stroke.color)];
            rect.strokeWeight = (_j = spec.stroke.width) != null ? _j : 1;
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
    });
  }
  function applyPadding(frame, padding) {
    if (padding === void 0) return;
    if (typeof padding === "number") {
      frame.paddingTop = padding;
      frame.paddingBottom = padding;
      frame.paddingLeft = padding;
      frame.paddingRight = padding;
    } else {
      if (padding.top !== void 0) frame.paddingTop = padding.top;
      if (padding.bottom !== void 0) frame.paddingBottom = padding.bottom;
      if (padding.left !== void 0) frame.paddingLeft = padding.left;
      if (padding.right !== void 0) frame.paddingRight = padding.right;
    }
  }
  function applyAlignment(frame, primary, counter) {
    if (primary) {
      const map = {
        min: "MIN",
        center: "CENTER",
        max: "MAX",
        space_between: "SPACE_BETWEEN"
      };
      if (map[primary]) frame.primaryAxisAlignItems = map[primary];
    }
    if (counter) {
      const map = {
        min: "MIN",
        center: "CENTER",
        max: "MAX",
        baseline: "BASELINE"
      };
      if (map[counter]) frame.counterAxisAlignItems = map[counter];
    }
  }
  function applyLayoutSizing(node, width, height) {
    if ("layoutAlign" in node && "layoutGrow" in node) {
      if (width === "fill") {
        node.layoutAlign = "STRETCH";
      }
      if (height === "fill") {
        node.layoutGrow = 1;
      }
    }
    if (node.type === "FRAME") {
      const frame = node;
      if (frame.layoutMode === "VERTICAL") {
        if (width === "hug") frame.counterAxisSizingMode = "AUTO";
        else if (typeof width === "number") frame.counterAxisSizingMode = "FIXED";
        if (height === "hug" || height === void 0) frame.primaryAxisSizingMode = "AUTO";
        else if (typeof height === "number") frame.primaryAxisSizingMode = "FIXED";
      } else if (frame.layoutMode === "HORIZONTAL") {
        if (width === "hug" || width === void 0) frame.primaryAxisSizingMode = "AUTO";
        else if (typeof width === "number") frame.primaryAxisSizingMode = "FIXED";
        if (height === "hug" || height === void 0) frame.counterAxisSizingMode = "AUTO";
        else if (typeof height === "number") frame.counterAxisSizingMode = "FIXED";
      }
    }
  }
  function collectFonts(specs, set) {
    for (const s of specs) {
      if (s.fontFamily || s.fontWeight) {
        set.add(`${s.fontFamily || "Inter"}::${s.fontWeight || "Regular"}`);
      }
      if (s.children) {
        collectFonts(s.children, set);
      }
    }
  }

  // src/handlers/canvas.ts
  function handleCreateFrame(params) {
    return __async(this, null, function* () {
      const frame = figma.createFrame();
      frame.name = params.name || "Frame";
      frame.resize(params.width || 375, params.height || 812);
      if (params.x !== void 0) frame.x = params.x;
      if (params.y !== void 0) frame.y = params.y;
      if (params.fill) {
        frame.fills = [createSolidPaint(params.fill)];
      }
      if (params.cornerRadius !== void 0) {
        frame.cornerRadius = params.cornerRadius;
      }
      if (params.parentId) {
        const parent = figma.getNodeById(params.parentId);
        if (parent && "appendChild" in parent) {
          parent.appendChild(frame);
        } else {
          figma.currentPage.appendChild(frame);
        }
      } else {
        figma.currentPage.appendChild(frame);
      }
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
        height: frame.height
      };
    });
  }
  function handleCreateRectangle(params) {
    return __async(this, null, function* () {
      const rect = figma.createRectangle();
      rect.name = params.name || "Rectangle";
      rect.resize(params.width || 100, params.height || 100);
      if (params.x !== void 0) rect.x = params.x;
      if (params.y !== void 0) rect.y = params.y;
      if (params.fill) {
        rect.fills = [createSolidPaint(params.fill)];
      }
      if (params.cornerRadius !== void 0) {
        rect.cornerRadius = params.cornerRadius;
      }
      if (params.parentId) {
        const parent = figma.getNodeById(params.parentId);
        if (parent && "appendChild" in parent) {
          parent.appendChild(rect);
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
        height: rect.height
      };
    });
  }
  function handleCreateText(params) {
    return __async(this, null, function* () {
      const fontName = yield ensureFontLoaded(
        params.fontFamily || "Inter",
        params.fontWeight || "Regular"
      );
      const { text: cleanText, emojisRemoved } = sanitizeUiText(params.text);
      const textNode = figma.createText();
      textNode.fontName = fontName;
      textNode.fontSize = params.fontSize || 16;
      textNode.characters = cleanText;
      applyIntelligentTypography(textNode, params.fontSize);
      if (params.fill) {
        textNode.fills = [createSolidPaint(params.fill)];
      }
      if (params.width !== void 0) {
        textNode.resize(params.width, textNode.height);
        textNode.textAutoResize = "HEIGHT";
      }
      if (params.x !== void 0) textNode.x = params.x;
      if (params.y !== void 0) textNode.y = params.y;
      if (params.parentId) {
        const parent = figma.getNodeById(params.parentId);
        if (parent && "appendChild" in parent) {
          parent.appendChild(textNode);
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
        lineHeight: textNode.lineHeight,
        letterSpacing: textNode.letterSpacing,
        emojisSanitized: emojisRemoved,
        x: textNode.x,
        y: textNode.y,
        width: textNode.width,
        height: textNode.height
      };
    });
  }
  function handleSetAutolayout(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node || node.type !== "FRAME") {
        throw new Error(`Node '${params.nodeId}' is not a FrameNode and cannot have AutoLayout applied.`);
      }
      const frame = node;
      frame.layoutMode = params.direction;
      if (params.direction !== "NONE") {
        if (params.spacing !== void 0) frame.itemSpacing = params.spacing;
        if (params.padding !== void 0) {
          frame.paddingTop = params.padding;
          frame.paddingBottom = params.padding;
          frame.paddingLeft = params.padding;
          frame.paddingRight = params.padding;
        } else {
          if (params.paddingTop !== void 0) frame.paddingTop = params.paddingTop;
          if (params.paddingBottom !== void 0) frame.paddingBottom = params.paddingBottom;
          if (params.paddingLeft !== void 0) frame.paddingLeft = params.paddingLeft;
          if (params.paddingRight !== void 0) frame.paddingRight = params.paddingRight;
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
          right: frame.paddingRight
        },
        primaryAxisAlignItems: frame.primaryAxisAlignItems,
        counterAxisAlignItems: frame.counterAxisAlignItems
      };
    });
  }
  function getNodeOrThrow(nodeId) {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      const availableFrames = figma.currentPage.children.filter((n) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION").slice(0, 10).map((n) => ({ id: n.id, name: n.name, type: n.type }));
      throw new Error(
        `Node '${nodeId}' was not found on page '${figma.currentPage.name}'. Available top-level screens: ${JSON.stringify(availableFrames)}`
      );
    }
    return node;
  }
  function handleInspectNode(params) {
    return __async(this, null, function* () {
      var _a;
      const node = getNodeOrThrow(params.nodeId);
      const depth = Math.min(Math.max(1, (_a = params.maxDepth) != null ? _a : 2), 4);
      return serializeNode(node, depth, 0);
    });
  }
  function handleGetSelection() {
    return __async(this, null, function* () {
      const selection = figma.currentPage.selection;
      return selection.map((node) => serializeNode(node, 2, 0));
    });
  }
  function handleGetDesignContext(params) {
    return __async(this, null, function* () {
      let targetNodes = [];
      if (params.screenId) {
        const node = getNodeOrThrow(params.screenId);
        targetNodes = [node];
      } else {
        targetNodes = figma.currentPage.children.filter(
          (n) => n.type === "FRAME" || n.type === "COMPONENT" || n.type === "SECTION"
        );
      }
      const flows = figma.currentPage.flowStartingPoints.map((f) => ({
        name: f.name,
        nodeId: f.nodeId
      }));
      const screens = targetNodes.map((screen) => {
        const isFrame = screen.type === "FRAME";
        const frame = isFrame ? screen : null;
        const interactiveElements = [];
        if ("findAll" in screen) {
          const descendants = screen.findAll((n) => {
            const name = n.name.toLowerCase();
            return name.includes("button") || name.includes("btn") || name.includes("nav") || name.includes("card") || name.includes("input") || n.type === "COMPONENT" || n.type === "INSTANCE" || "reactions" in n && n.reactions.length > 0;
          });
          for (const el of descendants.slice(0, 30)) {
            interactiveElements.push({
              id: el.id,
              name: el.name,
              type: el.type,
              reactionsCount: "reactions" in el ? el.reactions.length : 0
            });
          }
        }
        return {
          id: screen.id,
          name: screen.name,
          type: screen.type,
          width: screen.width,
          height: screen.height,
          layoutMode: frame ? frame.layoutMode : void 0,
          itemSpacing: frame ? frame.itemSpacing : void 0,
          interactiveElementsCount: interactiveElements.length,
          interactiveElements
        };
      });
      return {
        documentName: figma.root.name,
        currentPage: figma.currentPage.name,
        totalScreens: screens.length,
        flowStartingPoints: flows,
        screens
      };
    });
  }
  function serializeNode(node, maxDepth, currentDepth) {
    const base = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    if ("x" in node && "y" in node) {
      base.x = node.x;
      base.y = node.y;
      base.width = node.width;
      base.height = node.height;
    }
    if (node.type === "FRAME") {
      const frame = node;
      base.layoutMode = frame.layoutMode;
      base.itemSpacing = frame.itemSpacing;
      if (frame.fills && Array.isArray(frame.fills) && frame.fills.length > 0) {
        const fill = frame.fills[0];
        if (fill.type === "SOLID") {
          base.fillColor = {
            r: Math.round(fill.color.r * 255),
            g: Math.round(fill.color.g * 255),
            b: Math.round(fill.color.b * 255)
          };
        }
      }
    }
    if (node.type === "TEXT") {
      const text = node;
      base.characters = text.characters;
      base.fontSize = text.fontSize;
    }
    if ("children" in node && currentDepth < maxDepth) {
      base.children = node.children.filter((c) => c.type !== "VECTOR" && c.type !== "BOOLEAN_OPERATION").slice(0, 50).map((child) => serializeNode(child, maxDepth, currentDepth + 1));
    } else if ("children" in node) {
      base.childrenCount = node.children.length;
    }
    return base;
  }
  function handleUpdateNode(params) {
    return __async(this, null, function* () {
      var _a, _b;
      const node = figma.getNodeById(params.nodeId);
      if (!node) throw new Error(`Node '${params.nodeId}' not found.`);
      if (params.name !== void 0) node.name = params.name;
      if (params.visible !== void 0) node.visible = params.visible;
      if ("x" in node && params.x !== void 0) node.x = params.x;
      if ("y" in node && params.y !== void 0) node.y = params.y;
      if (node.type === "TEXT") {
        if (params.width !== void 0) {
          const textNode = node;
          if (textNode.fontName !== figma.mixed) {
            yield ensureFontLoaded(textNode.fontName.family, textNode.fontName.style);
          } else {
            yield ensureFontLoaded("Inter", "Regular");
          }
          textNode.textAutoResize = "HEIGHT";
          textNode.resize(params.width, textNode.height);
        }
      } else if ("resize" in node && (params.width !== void 0 || params.height !== void 0)) {
        const currentW = node.width || 100;
        const currentH = node.height || 100;
        node.resize((_a = params.width) != null ? _a : currentW, (_b = params.height) != null ? _b : currentH);
      }
      if (params.image && "fills" in node) {
        yield applyImageOrColor(node, params.image, params.fill);
      } else if (params.fill && "fills" in node) {
        node.fills = [createSolidPaint(params.fill)];
      }
      if (params.cornerRadius !== void 0 && "cornerRadius" in node) {
        node.cornerRadius = params.cornerRadius;
      }
      if (params.opacity !== void 0 && "opacity" in node) {
        node.opacity = Math.max(0, Math.min(1, params.opacity));
      }
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        updated: true
      };
    });
  }
  function handleDeleteNodes(params) {
    return __async(this, null, function* () {
      const deleted = [];
      for (const id of params.nodeIds) {
        const node = figma.getNodeById(id);
        if (node) {
          node.remove();
          deleted.push(id);
        }
      }
      return { deletedCount: deleted.length, deletedIds: deleted };
    });
  }
  function handleDuplicateNode(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node) throw new Error(`Node '${params.nodeId}' not found.`);
      if (!("clone" in node)) throw new Error(`Node '${params.nodeId}' cannot be cloned.`);
      const clone = node.clone();
      if (params.offsetX !== void 0) clone.x += params.offsetX;
      else clone.x += 40;
      if (params.offsetY !== void 0) clone.y += params.offsetY;
      if (params.name) clone.name = params.name;
      return {
        id: clone.id,
        name: clone.name,
        type: clone.type,
        x: clone.x,
        y: clone.y
      };
    });
  }
  function handleSetStroke(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node) throw new Error(`Node '${params.nodeId}' not found.`);
      if (!("strokes" in node)) throw new Error(`Node '${params.nodeId}' does not support strokes.`);
      const target = node;
      target.strokes = [createSolidPaint(params.color)];
      if (params.weight !== void 0) target.strokeWeight = params.weight;
      if (params.strokeAlign) target.strokeAlign = params.strokeAlign;
      return {
        id: node.id,
        strokeWeight: target.strokeWeight,
        strokeAlign: target.strokeAlign
      };
    });
  }
  function handleSetTextContent(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node || node.type !== "TEXT") {
        throw new Error(`Node '${params.nodeId}' is not a TextNode.`);
      }
      const textNode = node;
      if (textNode.fontName !== figma.mixed) {
        yield ensureFontLoaded(textNode.fontName.family, textNode.fontName.style);
      } else {
        yield ensureFontLoaded("Inter", "Regular");
      }
      const { text: cleanText, emojisRemoved } = sanitizeUiText(params.text);
      textNode.characters = cleanText;
      applyIntelligentTypography(textNode);
      return {
        id: textNode.id,
        characters: textNode.characters,
        lineHeight: textNode.lineHeight,
        letterSpacing: textNode.letterSpacing,
        emojisSanitized: emojisRemoved
      };
    });
  }
  function handleFindNodes(params) {
    return __async(this, null, function* () {
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
        type: node.type
      }));
    });
  }
  function handleManagePage(params) {
    return __async(this, null, function* () {
      if (params.action === "create") {
        const page = figma.createPage();
        page.name = params.name || "New Page";
        return { id: page.id, name: page.name };
      } else if (params.action === "set_active") {
        let targetPage = null;
        if (params.pageId) {
          const found = figma.getNodeById(params.pageId);
          if (found && found.type === "PAGE") targetPage = found;
        } else if (params.name) {
          targetPage = figma.root.children.find((p) => p.name.toLowerCase() === params.name.toLowerCase()) || null;
        }
        if (!targetPage) throw new Error("Target page not found.");
        figma.currentPage = targetPage;
        return { id: targetPage.id, name: targetPage.name, active: true };
      }
      throw new Error(`Invalid page action '${params.action}'`);
    });
  }
  function handleExportNodeImage(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node || !("exportAsync" in node)) {
        throw new Error(`Node '${params.nodeId}' cannot be exported.`);
      }
      const bytes = yield node.exportAsync({
        format: "PNG",
        constraint: { type: "SCALE", value: params.scale || 2 }
      });
      const base64 = figma.base64Encode(bytes);
      return {
        nodeId: node.id,
        name: node.name,
        format: "PNG",
        base64Data: `data:image/png;base64,${base64}`
      };
    });
  }
  function handleGetDocumentTokens() {
    return __async(this, null, function* () {
      const paintStyles = figma.getLocalPaintStyles().map((s) => {
        let hex = void 0;
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
          hex
        };
      });
      const textStyles = figma.getLocalTextStyles().map((s) => ({
        id: s.id,
        name: s.name,
        fontFamily: s.fontName.family,
        fontWeight: s.fontName.style,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight
      }));
      const effectStyles = figma.getLocalEffectStyles().map((s) => ({
        id: s.id,
        name: s.name,
        effects: s.effects.map((e) => ({ type: e.type, visible: e.visible }))
      }));
      return {
        documentName: figma.root.name,
        totalColorStyles: paintStyles.length,
        colors: paintStyles,
        totalTextStyles: textStyles.length,
        typography: textStyles,
        totalEffectStyles: effectStyles.length,
        effects: effectStyles
      };
    });
  }
  function handleCreateSvgIcon(params) {
    return __async(this, null, function* () {
      const node = figma.createNodeFromSvg(params.svg);
      if (params.name) {
        node.name = params.name;
      }
      if (params.width !== void 0 && params.height !== void 0) {
        node.resize(params.width, params.height);
      }
      if (params.x !== void 0) node.x = params.x;
      if (params.y !== void 0) node.y = params.y;
      if (params.fill) {
        const paint = createSolidPaint(params.fill);
        const applyFill = (item) => {
          if ("fills" in item && Array.isArray(item.fills) && item.fills.length > 0) {
            item.fills = [paint];
          }
          if ("children" in item) {
            for (const child of item.children) {
              applyFill(child);
            }
          }
        };
        applyFill(node);
      }
      if (params.parentId) {
        const parent = figma.getNodeById(params.parentId);
        if (parent && "appendChild" in parent) {
          parent.appendChild(node);
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
        height: node.height
      };
    });
  }
  function handleCreateEllipse(params) {
    return __async(this, null, function* () {
      const ellipse = figma.createEllipse();
      ellipse.name = params.name || "Ellipse";
      ellipse.resize(params.width || 100, params.height || 100);
      if (params.x !== void 0) ellipse.x = params.x;
      if (params.y !== void 0) ellipse.y = params.y;
      if (params.fill) {
        ellipse.fills = [createSolidPaint(params.fill)];
      }
      if (params.stroke) {
        ellipse.strokes = [createSolidPaint(params.stroke.color)];
        if (params.stroke.width !== void 0) {
          ellipse.strokeWeight = params.stroke.width;
        }
      }
      if (params.parentId) {
        const parent = figma.getNodeById(params.parentId);
        if (parent && "appendChild" in parent) {
          parent.appendChild(ellipse);
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
        height: ellipse.height
      };
    });
  }
  function handleCreateComponent(params) {
    return __async(this, null, function* () {
      let comp;
      if (params.fromNodeId) {
        const existingNode = figma.getNodeById(params.fromNodeId);
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
            height: existingNode.height
          };
        }
        comp = figma.createComponent();
        comp.name = params.name || existingNode.name;
        comp.resize(existingNode.width, existingNode.height);
        comp.x = existingNode.x;
        comp.y = existingNode.y;
        if ("fills" in existingNode && existingNode.fills) {
          comp.fills = existingNode.fills;
        }
        if ("cornerRadius" in existingNode && existingNode.cornerRadius !== void 0) {
          comp.cornerRadius = existingNode.cornerRadius;
        }
        if ("children" in existingNode) {
          const children = [...existingNode.children];
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
        if (params.x !== void 0) comp.x = params.x;
        if (params.y !== void 0) comp.y = params.y;
        if (params.fill) {
          comp.fills = [createSolidPaint(params.fill)];
        }
        if (params.cornerRadius !== void 0) {
          comp.cornerRadius = params.cornerRadius;
        }
        if (params.parentId) {
          const parent = figma.getNodeById(params.parentId);
          if (parent && "appendChild" in parent) {
            parent.appendChild(comp);
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
        height: comp.height
      };
    });
  }
  function handleCreateComponentInstance(params) {
    return __async(this, null, function* () {
      const comp = figma.getNodeById(params.componentId);
      if (!comp || comp.type !== "COMPONENT") {
        throw new Error(`Node '${params.componentId}' is not a valid Component.`);
      }
      const instance = comp.createInstance();
      if (params.name) instance.name = params.name;
      if (params.x !== void 0) instance.x = params.x;
      if (params.y !== void 0) instance.y = params.y;
      if (params.parentId) {
        const parent = figma.getNodeById(params.parentId);
        if (parent && "appendChild" in parent) {
          parent.appendChild(instance);
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
        height: instance.height
      };
    });
  }
  function handleSetEffects(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node || !("effects" in node)) {
        throw new Error(`Node '${params.nodeId}' does not support visual effects.`);
      }
      const figmaEffects = params.effects.map((e) => {
        var _a, _b, _c, _d, _e;
        const visible = e.visible !== false;
        if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
          const { rgb, opacity } = hexToFigmaColor(e.color || "#00000040");
          return {
            type: e.type,
            color: __spreadProps(__spreadValues({}, rgb), { a: opacity }),
            offset: { x: (_b = (_a = e.offset) == null ? void 0 : _a.x) != null ? _b : 0, y: (_d = (_c = e.offset) == null ? void 0 : _c.y) != null ? _d : 4 },
            radius: e.radius,
            spread: (_e = e.spread) != null ? _e : 0,
            visible,
            blendMode: e.blendMode || "NORMAL",
            showShadowBehindNode: false
          };
        } else {
          return {
            type: e.type,
            radius: e.radius,
            visible
          };
        }
      });
      node.effects = figmaEffects;
      return {
        nodeId: node.id,
        name: node.name,
        effectsCount: figmaEffects.length,
        effects: figmaEffects.map((e) => ({
          type: e.type,
          radius: e.radius,
          visible: e.visible
        }))
      };
    });
  }
  function handleCreateSection(params) {
    return __async(this, null, function* () {
      const section = figma.createSection();
      section.name = params.name || "Section";
      const w = params.width || 1200;
      const h = params.height || 800;
      section.resizeWithoutConstraints(w, h);
      if (params.x !== void 0) section.x = params.x;
      if (params.y !== void 0) section.y = params.y;
      if (params.fill) {
        section.fills = [createSolidPaint(params.fill)];
      }
      if (params.childNodeIds && params.childNodeIds.length > 0) {
        for (const childId of params.childNodeIds) {
          const child = figma.getNodeById(childId);
          if (child && child !== section) {
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
        childrenCount: section.children.length
      };
    });
  }
  function handleFocusViewport(params) {
    return __async(this, null, function* () {
      const nodes = [];
      for (const id of params.nodeIds) {
        const node = figma.getNodeById(id);
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
        selected: params.select !== false
      };
    });
  }

  // src/handlers/prototyping.ts
  function handleSetPrototypeInteraction(params) {
    return __async(this, null, function* () {
      var _a, _b, _c;
      const sourceNode = figma.getNodeById(params.sourceNodeId);
      if (!sourceNode) {
        throw new Error(`Source node '${params.sourceNodeId}' not found.`);
      }
      const triggerType = params.triggerType || "ON_CLICK";
      let trigger = { type: triggerType };
      if (triggerType === "AFTER_TIMEOUT") {
        trigger.timeout = ((_a = params.timeout) != null ? _a : 800) / 1e3;
      }
      const nav = params.navigation || "NAVIGATE";
      let action;
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
        let transition = null;
        const transType = params.transitionType || "SMART_ANIMATE";
        const duration = (_b = params.duration) != null ? _b : 0.3;
        const easing = { type: params.easing || "EASE_IN_AND_OUT" };
        if (transType === "SMART_ANIMATE" || transType === "DISSOLVE") {
          transition = {
            type: transType,
            easing,
            duration
          };
        } else if (transType === "SLIDE_IN" || transType === "MOVE_IN") {
          transition = {
            type: transType,
            direction: params.direction || "RIGHT",
            matchLayers: true,
            easing,
            duration
          };
        } else {
          transition = null;
        }
        action = {
          type: "NODE",
          destinationId: params.destinationNodeId,
          navigation: nav,
          transition,
          resetScrollPosition: (_c = params.resetScrollPosition) != null ? _c : false
        };
      }
      const reaction = {
        trigger,
        actions: [action]
      };
      if ("setReactionsAsync" in sourceNode) {
        yield sourceNode.setReactionsAsync([reaction]);
      } else if ("reactions" in sourceNode) {
        sourceNode.reactions = [reaction];
      } else {
        throw new Error(`Node '${params.sourceNodeId}' does not support prototype reactions.`);
      }
      return {
        sourceId: sourceNode.id,
        sourceName: sourceNode.name,
        trigger: triggerType,
        navigation: nav,
        destinationId: params.destinationNodeId,
        success: true
      };
    });
  }
  function handleSetFlowStartingPoint(params) {
    return __async(this, null, function* () {
      const node = figma.getNodeById(params.nodeId);
      if (!node || node.type !== "FRAME") {
        throw new Error(`Starting point node '${params.nodeId}' must be a Frame.`);
      }
      const currentPoints = [...figma.currentPage.flowStartingPoints];
      const filtered = currentPoints.filter((p) => p.nodeId !== params.nodeId);
      filtered.push({
        nodeId: params.nodeId,
        name: params.name
      });
      figma.currentPage.flowStartingPoints = filtered;
      return {
        flowName: params.name,
        startingNodeId: params.nodeId,
        totalFlows: figma.currentPage.flowStartingPoints.length
      };
    });
  }
  function handleGetPrototypeConnections() {
    return __async(this, null, function* () {
      const startingPoints = figma.currentPage.flowStartingPoints.map((sp) => {
        const node = figma.getNodeById(sp.nodeId);
        return {
          flowName: sp.name,
          nodeId: sp.nodeId,
          nodeName: (node == null ? void 0 : node.name) || "Unknown"
        };
      });
      const nodesWithReactions = figma.currentPage.findAll((n) => "reactions" in n && n.reactions.length > 0);
      const connections = nodesWithReactions.map((node) => {
        const reactions = node.reactions;
        return {
          sourceId: node.id,
          sourceName: node.name,
          reactions: reactions.map((r) => {
            var _a, _b;
            const act = r.actions && r.actions[0] || r.action;
            let destName = void 0;
            if (act == null ? void 0 : act.destinationId) {
              const destNode = figma.getNodeById(act.destinationId);
              destName = destNode == null ? void 0 : destNode.name;
            }
            return {
              trigger: (_a = r.trigger) == null ? void 0 : _a.type,
              navigation: (act == null ? void 0 : act.navigation) || (act == null ? void 0 : act.type),
              destinationId: act == null ? void 0 : act.destinationId,
              destinationName: destName,
              transition: (_b = act == null ? void 0 : act.transition) == null ? void 0 : _b.type
            };
          })
        };
      });
      return {
        startingPoints,
        connectionsCount: connections.length,
        connections
      };
    });
  }
  function handleBatchLinkPrototype(params) {
    return __async(this, null, function* () {
      const results = [];
      for (const link of params.links) {
        const res = yield handleSetPrototypeInteraction({
          sourceNodeId: link.sourceId,
          destinationNodeId: link.destinationId,
          triggerType: link.trigger,
          timeout: link.timeout,
          transitionType: link.transition,
          direction: link.direction
        });
        results.push(res);
      }
      return {
        linkedCount: results.length,
        links: results
      };
    });
  }
  function handleSetOverlayInteraction(params) {
    return __async(this, null, function* () {
      var _a;
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
      const duration = (_a = params.duration) != null ? _a : 0.25;
      const easing = { type: params.easing || "EASE_OUT" };
      let transition = null;
      if (transType === "SMART_ANIMATE" || transType === "DISSOLVE") {
        transition = { type: transType, easing, duration };
      } else if (transType === "SLIDE_IN" || transType === "MOVE_IN") {
        transition = {
          type: transType,
          direction: params.direction || "BOTTOM",
          matchLayers: true,
          easing,
          duration
        };
      }
      const overlayBackground = params.backgroundOverlay !== false ? {
        type: "SOLID_COLOR",
        color: hexToFigmaColor(params.overlayColor || "#00000066").rgb
      } : { type: "NONE" };
      const action = {
        type: "NODE",
        destinationId: params.destinationNodeId,
        navigation: "OVERLAY",
        transition,
        overlayPositionType: params.position || "CENTER",
        closeOnClickOutside: params.closeOnClickOutside !== false,
        overlayBackground
      };
      const reaction = {
        trigger,
        actions: [action]
      };
      if ("setReactionsAsync" in sourceNode) {
        yield sourceNode.setReactionsAsync([reaction]);
      } else if ("reactions" in sourceNode) {
        sourceNode.reactions = [reaction];
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
        success: true
      };
    });
  }

  // src/handlers/linter.ts
  function handleLintDesignCompliance(params) {
    return __async(this, null, function* () {
      let rootNode = null;
      if (params.nodeId) {
        rootNode = figma.getNodeById(params.nodeId);
        if (!rootNode) {
          throw new Error(`Target node '${params.nodeId}' not found.`);
        }
      } else {
        rootNode = figma.currentPage;
      }
      const violations = [];
      let nodesAudited = 0;
      function auditNode(node) {
        nodesAudited++;
        if (node.type === "TEXT") {
          const textNode = node;
          const content = textNode.characters || "";
          EMOJI_REGEX.lastIndex = 0;
          if (EMOJI_REGEX.test(content)) {
            violations.push({
              category: "EMOJI",
              severity: "ERROR",
              nodeId: textNode.id,
              nodeName: textNode.name,
              message: `Text contains emoji icons: "${content.slice(0, 35)}..."`,
              recommendation: "Remove emojis and use the 'create_svg_icon' tool with vector SVG paths instead."
            });
          }
          if (textNode.lineHeight && textNode.lineHeight.unit === "AUTO") {
            violations.push({
              category: "TYPOGRAPHY",
              severity: "WARNING",
              nodeId: textNode.id,
              nodeName: textNode.name,
              message: `Uncalibrated line-height (AUTO) detected on '${textNode.name}'.`,
              recommendation: "Set explicit proportional leading (1.15x for display headers, 1.5x for body text)."
            });
          }
        }
        if (node.type === "FRAME" || node.type === "INSTANCE" || node.type === "COMPONENT") {
          const frame = node;
          const lowerName = frame.name.toLowerCase();
          const isInteractive = lowerName.includes("button") || lowerName.includes("btn") || lowerName.includes("cta") || lowerName.includes("tap") || lowerName.includes("input") || lowerName.includes("icon") || "reactions" in frame && frame.reactions.length > 0;
          if (isInteractive) {
            if (frame.width < 44 || frame.height < 44) {
              violations.push({
                category: "TOUCH_TARGET",
                severity: "ERROR",
                nodeId: frame.id,
                nodeName: frame.name,
                message: `Interactive element size is ${Math.round(frame.width)}x${Math.round(
                  frame.height
                )}px, below the 44x44px minimum touch target.`,
                recommendation: "Increase padding or height to >= 44px to comply with Apple HIG, Google Material, and WCAG 2.1 touch ergonomics (Fitts's Law)."
              });
            }
          }
          if (frame.layoutMode && frame.layoutMode !== "NONE") {
            const checkGrid = (val, label) => {
              if (val > 0 && val % 4 !== 0) {
                violations.push({
                  category: "GRID_SPACING",
                  severity: "WARNING",
                  nodeId: frame.id,
                  nodeName: frame.name,
                  message: `${label} is ${val}px, which does not conform to the 4pt/8pt spacing scale.`,
                  recommendation: `Snap to the nearest clean 4pt/8pt grid increment (${Math.round(
                    val / 4
                  ) * 4}px).`
                });
              }
            };
            checkGrid(frame.itemSpacing, "itemSpacing (gap)");
            checkGrid(frame.paddingTop, "paddingTop");
            checkGrid(frame.paddingBottom, "paddingBottom");
            checkGrid(frame.paddingLeft, "paddingLeft");
            checkGrid(frame.paddingRight, "paddingRight");
          }
        }
        if ("children" in node) {
          for (const child of node.children) {
            auditNode(child);
          }
        }
      }
      auditNode(rootNode);
      const errorCount = violations.filter((v) => v.severity === "ERROR").length;
      const warningCount = violations.filter((v) => v.severity === "WARNING").length;
      const penalty = errorCount * 10 + warningCount * 3;
      const complianceScore = Math.max(0, 100 - penalty);
      let grade = "A";
      if (complianceScore < 60) grade = "F";
      else if (complianceScore < 75) grade = "C";
      else if (complianceScore < 90) grade = "B";
      return {
        targetId: rootNode.id,
        targetName: rootNode.name,
        complianceScore,
        grade,
        nodesAudited,
        violationsCount: violations.length,
        errorsCount: errorCount,
        warningsCount: warningCount,
        violations,
        summary: complianceScore >= 90 ? "Excellent design quality! The interface conforms to enterprise typography, HCI touch targets, and the 8pt grid system." : `Design quality score: ${complianceScore} (${grade}). ${violations.length} HCI/design issues found. Review recommendations to achieve enterprise polish.`
      };
    });
  }

  // src/handlers/ux.ts
  function handleGenerateStateMatrix(params) {
    return __async(this, null, function* () {
      var _a, _b;
      yield ensureFontLoaded("Inter", "Regular");
      yield ensureFontLoaded("Inter", "Medium");
      yield ensureFontLoaded("Inter", "Semi Bold");
      yield ensureFontLoaded("Inter", "Bold");
      const title = params.title || "Payment Methods";
      const compType = params.componentType || "card";
      const isDesktop = params.device === "desktop";
      const isDark = params.theme === "dark";
      let width = 343;
      let height = 240;
      if (compType === "screen") {
        width = isDesktop ? 1200 : 375;
        height = isDesktop ? 800 : 812;
      } else if (compType === "button") {
        width = isDesktop ? 220 : 343;
        height = 52;
      } else if (compType === "form") {
        width = isDesktop ? 500 : 343;
        height = 420;
      } else if (compType === "list") {
        width = isDesktop ? 480 : 343;
        height = 360;
      }
      const bg = isDark ? "#0F172A" : "#FFFFFF";
      const cardBg = isDark ? "#1E293B" : "#F8FAFC";
      const border = isDark ? "#334155" : "#E2E8F0";
      const textPrimary = isDark ? "#F8FAFC" : "#0F172A";
      const textSecondary = isDark ? "#94A3B8" : "#64748B";
      const primaryBrand = "#2563EB";
      const errorColor = "#EF4444";
      const skeletonColor = isDark ? "#334155" : "#E2E8F0";
      const states = [
        { key: "ideal", label: "1. Ideal State", desc: "Populated with realistic user data & primary CTA" },
        { key: "empty", label: "2. Empty State", desc: "First-time onboarding with guidance & setup CTA" },
        { key: "loading", label: "3. Loading / Skeleton", desc: "Low-cognitive-friction perceived performance skeleton" },
        { key: "error", label: "4. Error State", desc: "Empathetic failure explanation with immediate 1-click retry" },
        { key: "partial", label: "5. Partial / Edge State", desc: "Single item & boundary stress testing for text truncation" }
      ];
      const createdFrames = [];
      const startX = (_a = params.x) != null ? _a : figma.viewport.center.x - (width * 5 + 40 * 4) / 2;
      const startY = (_b = params.y) != null ? _b : figma.viewport.center.y - height / 2;
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const frame = figma.createFrame();
        frame.name = `State=${s.key.toUpperCase()} (${s.label})`;
        frame.resize(width, height);
        frame.x = startX + i * (width + 48);
        frame.y = startY;
        frame.fills = [createSolidPaint(bg)];
        frame.strokes = [createSolidPaint(border)];
        frame.strokeWeight = 1;
        frame.cornerRadius = 16;
        frame.clipsContent = true;
        frame.layoutMode = "VERTICAL";
        frame.primaryAxisSizingMode = "FIXED";
        frame.counterAxisSizingMode = "FIXED";
        frame.paddingTop = 24;
        frame.paddingBottom = 24;
        frame.paddingLeft = 24;
        frame.paddingRight = 24;
        frame.itemSpacing = 16;
        const stateBadge = figma.createFrame();
        stateBadge.name = "State Indicator Badge";
        stateBadge.layoutMode = "HORIZONTAL";
        stateBadge.primaryAxisSizingMode = "AUTO";
        stateBadge.counterAxisSizingMode = "AUTO";
        stateBadge.paddingTop = 4;
        stateBadge.paddingBottom = 4;
        stateBadge.paddingLeft = 8;
        stateBadge.paddingRight = 8;
        stateBadge.cornerRadius = 6;
        stateBadge.fills = [createSolidPaint(isDark ? "#1E293B" : "#F1F5F9")];
        const badgeText = figma.createText();
        badgeText.fontName = { family: "Inter", style: "Semi Bold" };
        badgeText.characters = s.label.toUpperCase();
        badgeText.fontSize = 10;
        badgeText.fills = [createSolidPaint(s.key === "error" ? errorColor : s.key === "ideal" ? primaryBrand : textSecondary)];
        stateBadge.appendChild(badgeText);
        frame.appendChild(stateBadge);
        if (s.key === "ideal") {
          const h = figma.createText();
          h.fontName = { family: "Inter", style: "Bold" };
          h.fontSize = 18;
          h.characters = title;
          h.fills = [createSolidPaint(textPrimary)];
          frame.appendChild(h);
          const itemCard = figma.createFrame();
          itemCard.name = "Data Item Card";
          itemCard.layoutMode = "HORIZONTAL";
          itemCard.primaryAxisSizingMode = "FIXED";
          itemCard.counterAxisSizingMode = "AUTO";
          itemCard.resize(width - 48, 56);
          itemCard.paddingLeft = 16;
          itemCard.paddingRight = 16;
          itemCard.paddingTop = 12;
          itemCard.paddingBottom = 12;
          itemCard.cornerRadius = 10;
          itemCard.fills = [createSolidPaint(cardBg)];
          itemCard.strokes = [createSolidPaint(border)];
          itemCard.strokeWeight = 1;
          itemCard.itemSpacing = 12;
          itemCard.primaryAxisAlignItems = "SPACE_BETWEEN";
          itemCard.counterAxisAlignItems = "CENTER";
          const itemInfo = figma.createText();
          itemInfo.fontName = { family: "Inter", style: "Medium" };
          itemInfo.fontSize = 14;
          itemInfo.characters = "Visa ending in \u2022\u2022\u2022\u2022 4242";
          itemInfo.fills = [createSolidPaint(textPrimary)];
          itemCard.appendChild(itemInfo);
          const statusTag = figma.createText();
          statusTag.fontName = { family: "Inter", style: "Semi Bold" };
          statusTag.fontSize = 12;
          statusTag.characters = "Default";
          statusTag.fills = [createSolidPaint("#16A34A")];
          itemCard.appendChild(statusTag);
          frame.appendChild(itemCard);
          const btn = figma.createFrame();
          btn.name = "Action Button";
          btn.layoutMode = "HORIZONTAL";
          btn.primaryAxisSizingMode = "FIXED";
          btn.counterAxisSizingMode = "FIXED";
          btn.resize(width - 48, 44);
          btn.cornerRadius = 10;
          btn.fills = [createSolidPaint(primaryBrand)];
          btn.primaryAxisAlignItems = "CENTER";
          btn.counterAxisAlignItems = "CENTER";
          const btnText = figma.createText();
          btnText.fontName = { family: "Inter", style: "Semi Bold" };
          btnText.fontSize = 14;
          btnText.characters = "Add New Payment Method";
          btnText.fills = [createSolidPaint("#FFFFFF")];
          btn.appendChild(btnText);
          frame.appendChild(btn);
        } else if (s.key === "empty") {
          const iconFrame = figma.createFrame();
          iconFrame.name = "Empty State Graphic Container";
          iconFrame.resize(48, 48);
          iconFrame.cornerRadius = 24;
          iconFrame.fills = [createSolidPaint(isDark ? "#334155" : "#E2E8F0")];
          iconFrame.layoutMode = "HORIZONTAL";
          iconFrame.primaryAxisAlignItems = "CENTER";
          iconFrame.counterAxisAlignItems = "CENTER";
          const iconLabel = figma.createText();
          iconLabel.fontName = { family: "Inter", style: "Bold" };
          iconLabel.fontSize = 18;
          iconLabel.characters = "+";
          iconLabel.fills = [createSolidPaint(textSecondary)];
          iconFrame.appendChild(iconLabel);
          frame.appendChild(iconFrame);
          const emptyTitle = figma.createText();
          emptyTitle.fontName = { family: "Inter", style: "Bold" };
          emptyTitle.fontSize = 16;
          emptyTitle.characters = `No ${title} Yet`;
          emptyTitle.fills = [createSolidPaint(textPrimary)];
          frame.appendChild(emptyTitle);
          const emptyBody = figma.createText();
          emptyBody.fontName = { family: "Inter", style: "Regular" };
          emptyBody.fontSize = 13;
          emptyBody.characters = `Add your first ${title.toLowerCase()} to activate automatic billing and seamless checkouts.`;
          emptyBody.fills = [createSolidPaint(textSecondary)];
          emptyBody.resize(width - 48, 38);
          emptyBody.textAutoResize = "HEIGHT";
          frame.appendChild(emptyBody);
          const ctaBtn = figma.createFrame();
          ctaBtn.name = "Onboarding CTA Button";
          ctaBtn.layoutMode = "HORIZONTAL";
          ctaBtn.primaryAxisSizingMode = "FIXED";
          ctaBtn.counterAxisSizingMode = "FIXED";
          ctaBtn.resize(width - 48, 44);
          ctaBtn.cornerRadius = 10;
          ctaBtn.fills = [createSolidPaint(primaryBrand)];
          ctaBtn.primaryAxisAlignItems = "CENTER";
          ctaBtn.counterAxisAlignItems = "CENTER";
          const ctaText = figma.createText();
          ctaText.fontName = { family: "Inter", style: "Semi Bold" };
          ctaText.fontSize = 14;
          ctaText.characters = `Add ${title}`;
          ctaText.fills = [createSolidPaint("#FFFFFF")];
          ctaBtn.appendChild(ctaText);
          frame.appendChild(ctaBtn);
        } else if (s.key === "loading") {
          const bar1 = figma.createRectangle();
          bar1.name = "Skeleton Title";
          bar1.resize(160, 20);
          bar1.cornerRadius = 6;
          bar1.fills = [createSolidPaint(skeletonColor)];
          frame.appendChild(bar1);
          const cardSkeleton = figma.createRectangle();
          cardSkeleton.name = "Skeleton Content Card";
          cardSkeleton.resize(width - 48, 56);
          cardSkeleton.cornerRadius = 10;
          cardSkeleton.fills = [createSolidPaint(skeletonColor)];
          frame.appendChild(cardSkeleton);
          const btnSkeleton = figma.createRectangle();
          btnSkeleton.name = "Skeleton Button";
          btnSkeleton.resize(width - 48, 44);
          btnSkeleton.cornerRadius = 10;
          btnSkeleton.fills = [createSolidPaint(skeletonColor)];
          frame.appendChild(btnSkeleton);
        } else if (s.key === "error") {
          const errHeader = figma.createFrame();
          errHeader.name = "Error Alert Header";
          errHeader.layoutMode = "HORIZONTAL";
          errHeader.primaryAxisSizingMode = "AUTO";
          errHeader.counterAxisSizingMode = "AUTO";
          errHeader.itemSpacing = 8;
          errHeader.counterAxisAlignItems = "CENTER";
          const errDot = figma.createEllipse();
          errDot.resize(10, 10);
          errDot.fills = [createSolidPaint(errorColor)];
          errHeader.appendChild(errDot);
          const errTitle = figma.createText();
          errTitle.fontName = { family: "Inter", style: "Bold" };
          errTitle.fontSize = 16;
          errTitle.characters = `Failed to load ${title.toLowerCase()}`;
          errTitle.fills = [createSolidPaint(errorColor)];
          errHeader.appendChild(errTitle);
          frame.appendChild(errHeader);
          const errDesc = figma.createText();
          errDesc.fontName = { family: "Inter", style: "Regular" };
          errDesc.fontSize = 13;
          errDesc.characters = "A secure connection could not be established with our server. Your existing data remains safe.";
          errDesc.fills = [createSolidPaint(textSecondary)];
          errDesc.resize(width - 48, 40);
          errDesc.textAutoResize = "HEIGHT";
          frame.appendChild(errDesc);
          const retryBtn = figma.createFrame();
          retryBtn.name = "Retry Button";
          retryBtn.layoutMode = "HORIZONTAL";
          retryBtn.primaryAxisSizingMode = "FIXED";
          retryBtn.counterAxisSizingMode = "FIXED";
          retryBtn.resize(width - 48, 44);
          retryBtn.cornerRadius = 10;
          retryBtn.fills = [createSolidPaint(isDark ? "#334155" : "#FEE2E2")];
          retryBtn.strokes = [createSolidPaint("#FCA5A5")];
          retryBtn.strokeWeight = 1;
          retryBtn.primaryAxisAlignItems = "CENTER";
          retryBtn.counterAxisAlignItems = "CENTER";
          const retryText = figma.createText();
          retryText.fontName = { family: "Inter", style: "Semi Bold" };
          retryText.fontSize = 14;
          retryText.characters = "Retry Connection";
          retryText.fills = [createSolidPaint(errorColor)];
          retryBtn.appendChild(retryText);
          frame.appendChild(retryBtn);
        } else if (s.key === "partial") {
          const h = figma.createText();
          h.fontName = { family: "Inter", style: "Bold" };
          h.fontSize = 18;
          h.characters = `${title} (1 item)`;
          h.fills = [createSolidPaint(textPrimary)];
          frame.appendChild(h);
          const truncCard = figma.createFrame();
          truncCard.name = "Boundary Overflow Card";
          truncCard.layoutMode = "HORIZONTAL";
          truncCard.primaryAxisSizingMode = "FIXED";
          truncCard.counterAxisSizingMode = "AUTO";
          truncCard.resize(width - 48, 56);
          truncCard.paddingLeft = 16;
          truncCard.paddingRight = 16;
          truncCard.cornerRadius = 10;
          truncCard.fills = [createSolidPaint(cardBg)];
          truncCard.strokes = [createSolidPaint(border)];
          truncCard.strokeWeight = 1;
          truncCard.primaryAxisAlignItems = "SPACE_BETWEEN";
          truncCard.counterAxisAlignItems = "CENTER";
          const truncText = figma.createText();
          truncText.fontName = { family: "Inter", style: "Medium" };
          truncText.fontSize = 13;
          truncText.characters = "Corporate Platinum Card with Extra Long Org Name...";
          truncText.fills = [createSolidPaint(textPrimary)];
          truncText.resize(width - 120, 20);
          truncText.textTruncation = "ENDING";
          truncCard.appendChild(truncText);
          frame.appendChild(truncCard);
          const noteText = figma.createText();
          noteText.fontName = { family: "Inter", style: "Regular" };
          noteText.fontSize = 11;
          noteText.characters = "Boundary test: 1 item with text truncation enabled.";
          noteText.fills = [createSolidPaint(textSecondary)];
          frame.appendChild(noteText);
        }
        createdFrames.push(frame);
      }
      const section = figma.createSection();
      section.name = `UX Matrix: ${title} (5 Essential States)`;
      section.resize((width + 48) * 5 + 64, height + 140);
      section.x = startX - 32;
      section.y = startY - 70;
      for (const f of createdFrames) {
        section.appendChild(f);
      }
      figma.currentPage.selection = createdFrames;
      figma.viewport.scrollAndZoomIntoView(createdFrames);
      return {
        status: "success",
        title,
        sectionId: section.id,
        sectionName: section.name,
        statesGenerated: states.map((s, idx) => ({
          state: s.key,
          label: s.label,
          frameId: createdFrames[idx].id,
          dimensions: `${width}x${height}px`
        }))
      };
    });
  }
  function handleAuditUXHeuristics(params) {
    return __async(this, null, function* () {
      let targetNode = null;
      if (params.nodeId) {
        targetNode = figma.getNodeById(params.nodeId);
        if (!targetNode) throw new Error(`Node '${params.nodeId}' not found.`);
      } else if (figma.currentPage.selection.length > 0) {
        targetNode = figma.currentPage.selection[0];
      } else {
        targetNode = figma.currentPage;
      }
      const findings = [];
      let interactiveElementsCount = 0;
      let primaryActionButtons = [];
      let destructiveButtons = [];
      let formInputsCount = 0;
      function scanNode(node) {
        const isFrame = node.type === "FRAME" || node.type === "INSTANCE" || node.type === "COMPONENT";
        if (isFrame) {
          const frame = node;
          const lower = frame.name.toLowerCase();
          const hasReactions = "reactions" in frame && frame.reactions.length > 0;
          const isButton = lower.includes("btn") || lower.includes("button") || lower.includes("cta");
          const isInput = lower.includes("input") || lower.includes("field") || lower.includes("text box");
          const isDestructive = lower.includes("delete") || lower.includes("remove") || lower.includes("cancel") || lower.includes("erase");
          if (isButton || hasReactions) {
            interactiveElementsCount++;
            const fills = Array.isArray(frame.fills) ? frame.fills : [];
            const solidFill = fills.find((f) => f.type === "SOLID");
            const hasVibrantFill = solidFill && solidFill.color && (solidFill.color.r < 0.9 || solidFill.color.b > 0.4);
            if (hasVibrantFill && !isDestructive) {
              primaryActionButtons.push(frame);
            }
            if (isDestructive) {
              destructiveButtons.push(frame);
            }
            if (frame.width < 44 || frame.height < 44) {
              findings.push({
                law: "Fitts's Law",
                severity: "HIGH",
                nodeId: frame.id,
                nodeName: frame.name,
                friction: `Touch target size is ${Math.round(frame.width)}x${Math.round(frame.height)}px. Users will experience miss-clicks and input friction.`,
                recommendation: "Expand target bounding box or padding to >= 44x44px for touch ergonomics."
              });
            }
          }
          if (isInput) {
            formInputsCount++;
          }
          if (frame.layoutMode === "VERTICAL" && frame.children.length > 7) {
            const rawChildren = frame.children.filter((c) => c.type === "TEXT" || c.name.toLowerCase().includes("input"));
            if (rawChildren.length > 7) {
              findings.push({
                law: "Miller's Law",
                severity: "MEDIUM",
                nodeId: frame.id,
                nodeName: frame.name,
                friction: `Container contains ${rawChildren.length} unchunked consecutive elements. Working memory limits (7 \xB1 2 items) cause cognitive fatigue.`,
                recommendation: "Group related fields into visual chunks using cards, section headers, or step dividers."
              });
            }
          }
        }
        if ("children" in node) {
          for (const child of node.children) {
            scanNode(child);
          }
        }
      }
      scanNode(targetNode);
      if (primaryActionButtons.length > 1) {
        findings.push({
          law: "Hick's Law",
          severity: "HIGH",
          nodeId: primaryActionButtons[0].id,
          nodeName: targetNode.name,
          friction: `Screen contains ${primaryActionButtons.length} competing primary call-to-actions. Hick's Law states decision time logarithmically increases with choice ambiguity.`,
          recommendation: "Establish one clear primary CTA per viewport. Demote secondary actions to ghost, outline, or text button variants."
        });
      }
      if (interactiveElementsCount > 9) {
        findings.push({
          law: "Hick's Law",
          severity: "MEDIUM",
          nodeId: targetNode.id,
          nodeName: targetNode.name,
          friction: `Viewport contains ${interactiveElementsCount} interactive choices. Exceeds the optimal threshold for rapid decision-making.`,
          recommendation: "Employ progressive disclosure: hide advanced options under an accordion or secondary screen."
        });
      }
      for (const destBtn of destructiveButtons) {
        for (const primBtn of primaryActionButtons) {
          const distance = Math.hypot(destBtn.x - primBtn.x, destBtn.y - primBtn.y);
          if (distance < 60) {
            findings.push({
              law: "Fitts's Law",
              severity: "CRITICAL",
              nodeId: destBtn.id,
              nodeName: destBtn.name,
              friction: `Destructive action is only ${Math.round(distance)}px away from a primary action. High risk of accidental irreversible user error.`,
              recommendation: "Separate destructive actions spatially or isolate behind a confirmation modal."
            });
          }
        }
      }
      let penalty = 0;
      for (const f of findings) {
        if (f.severity === "CRITICAL") penalty += 25;
        else if (f.severity === "HIGH") penalty += 15;
        else if (f.severity === "MEDIUM") penalty += 8;
        else penalty += 4;
      }
      const score = Math.max(10, 100 - penalty);
      let cognitiveLoad = "LOW";
      if (score < 50) cognitiveLoad = "SEVERE_OVERLOAD";
      else if (score < 70) cognitiveLoad = "HIGH";
      else if (score < 85) cognitiveLoad = "BALANCED";
      return {
        status: "success",
        targetNode: { id: targetNode.id, name: targetNode.name, type: targetNode.type },
        uxScore: score,
        cognitiveLoad,
        metrics: {
          interactiveElementsCount,
          primaryActionButtonsCount: primaryActionButtons.length,
          destructiveButtonsCount: destructiveButtons.length,
          formInputsCount
        },
        findingsCount: findings.length,
        findings
      };
    });
  }
  function handleValidateUserJourney() {
    return __async(this, null, function* () {
      var _a, _b;
      const topFrames = figma.currentPage.children.filter((c) => c.type === "FRAME");
      const flowStartingPoints = figma.currentPage.flowStartingPoints || [];
      const flowStartIds = new Set(flowStartingPoints.map((f) => f.nodeId));
      const incomingLinks = /* @__PURE__ */ new Map();
      const outgoingLinks = /* @__PURE__ */ new Map();
      for (const frame of topFrames) {
        incomingLinks.set(frame.id, []);
        outgoingLinks.set(frame.id, []);
      }
      function scanInteractions(node, parentFrameId) {
        var _a2;
        if ("reactions" in node) {
          const reactions = node.reactions || [];
          for (const rx of reactions) {
            if (rx.actions) {
              for (const act of rx.actions) {
                if (act.destinationId && incomingLinks.has(act.destinationId)) {
                  incomingLinks.get(act.destinationId).push(parentFrameId);
                  (_a2 = outgoingLinks.get(parentFrameId)) == null ? void 0 : _a2.push(act.destinationId);
                }
              }
            }
          }
        }
        if ("children" in node) {
          for (const child of node.children) {
            scanInteractions(child, parentFrameId);
          }
        }
      }
      for (const frame of topFrames) {
        scanInteractions(frame, frame.id);
      }
      const orphanScreens = [];
      const deadEndScreens = [];
      const wellConnectedScreens = [];
      for (const frame of topFrames) {
        const isStart = flowStartIds.has(frame.id);
        const inCount = ((_a = incomingLinks.get(frame.id)) == null ? void 0 : _a.length) || 0;
        const outCount = ((_b = outgoingLinks.get(frame.id)) == null ? void 0 : _b.length) || 0;
        if (!isStart && inCount === 0) {
          orphanScreens.push({ id: frame.id, name: frame.name });
        }
        if (outCount === 0) {
          let hasManualBack = false;
          const scanForBack = (n) => {
            const lower = n.name.toLowerCase();
            if (lower.includes("back") || lower.includes("close") || lower.includes("dismiss")) {
              hasManualBack = true;
            }
            if ("children" in n) {
              for (const c of n.children) scanForBack(c);
            }
          };
          scanForBack(frame);
          if (!hasManualBack) {
            deadEndScreens.push({ id: frame.id, name: frame.name });
          }
        }
        if (inCount > 0 && outCount > 0) {
          wellConnectedScreens.push({ id: frame.id, name: frame.name });
        }
      }
      let health = "EXCELLENT";
      if (deadEndScreens.length > 2 || orphanScreens.length > 3) {
        health = "CRITICAL";
      } else if (deadEndScreens.length > 0 || orphanScreens.length > 0) {
        health = "WARNING";
      } else if (wellConnectedScreens.length > 0) {
        health = "EXCELLENT";
      }
      return {
        status: "success",
        totalScreensAudited: topFrames.length,
        flowStartingPointsCount: flowStartingPoints.length,
        journeyHealth: health,
        orphanScreens: {
          count: orphanScreens.length,
          explanation: "Screens with no incoming prototype links and not registered as a flow start.",
          screens: orphanScreens
        },
        deadEndScreens: {
          count: deadEndScreens.length,
          explanation: "Screens with no outgoing interaction links or back navigation affordance. Users get trapped.",
          screens: deadEndScreens
        },
        wellConnectedScreensCount: wellConnectedScreens.length,
        recommendations: deadEndScreens.length > 0 ? "Add explicit 'BACK' or 'CLOSE' interactions on dead-end screens using 'set_prototype_interaction'." : "User journey flow is continuous with zero dead ends."
      };
    });
  }
  function handleGenerateInteractiveVariants(params) {
    return __async(this, null, function* () {
      var _a, _b;
      yield ensureFontLoaded("Inter", "Regular");
      yield ensureFontLoaded("Inter", "Medium");
      yield ensureFontLoaded("Inter", "Semi Bold");
      const elem = params.element || "button";
      const label = params.label || "Confirm & Continue";
      const size = params.size || "medium";
      const style = params.variantStyle || "primary";
      const height = size === "small" ? 36 : size === "large" ? 56 : 44;
      const paddingH = size === "small" ? 14 : size === "large" ? 24 : 18;
      const fontSize = size === "small" ? 13 : size === "large" ? 16 : 14;
      let baseFill = "#2563EB";
      let hoverFill = "#1D4ED8";
      let pressFill = "#1E40AF";
      let textFill = "#FFFFFF";
      if (style === "destructive") {
        baseFill = "#DC2626";
        hoverFill = "#B91C1C";
        pressFill = "#991B1B";
      } else if (style === "secondary") {
        baseFill = "#F1F5F9";
        hoverFill = "#E2E8F0";
        pressFill = "#CBD5E1";
        textFill = "#0F172A";
      } else if (style === "outline") {
        baseFill = "#FFFFFF";
        hoverFill = "#F8FAFC";
        pressFill = "#F1F5F9";
        textFill = "#2563EB";
      }
      const states = [
        { stateName: "Default", bg: baseFill, text: textFill, hasRing: false, opacity: 1 },
        { stateName: "Hover", bg: hoverFill, text: textFill, hasRing: false, opacity: 1 },
        { stateName: "Pressed", bg: pressFill, text: textFill, hasRing: false, opacity: 1 },
        { stateName: "Focused", bg: baseFill, text: textFill, hasRing: true, opacity: 1 },
        { stateName: "Disabled", bg: "#94A3B8", text: "#E2E8F0", hasRing: false, opacity: 0.5 }
      ];
      const components = [];
      const startX = (_a = params.x) != null ? _a : figma.viewport.center.x - 300;
      const startY = (_b = params.y) != null ? _b : figma.viewport.center.y - 100;
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const comp = figma.createComponent();
        comp.name = `State=${s.stateName}`;
        comp.layoutMode = "HORIZONTAL";
        comp.primaryAxisSizingMode = "AUTO";
        comp.counterAxisSizingMode = "FIXED";
        comp.resize(160, height);
        comp.paddingLeft = paddingH;
        comp.paddingRight = paddingH;
        comp.cornerRadius = 8;
        comp.primaryAxisAlignItems = "CENTER";
        comp.counterAxisAlignItems = "CENTER";
        comp.fills = [createSolidPaint(s.bg)];
        comp.opacity = s.opacity;
        if (s.hasRing) {
          comp.strokes = [createSolidPaint("#60A5FA")];
          comp.strokeWeight = 3;
          comp.strokeAlign = "OUTSIDE";
        }
        const textNode = figma.createText();
        textNode.fontName = { family: "Inter", style: "Semi Bold" };
        textNode.fontSize = fontSize;
        textNode.characters = label;
        textNode.fills = [createSolidPaint(s.text)];
        comp.appendChild(textNode);
        comp.x = startX + i * 180;
        comp.y = startY;
        components.push(comp);
      }
      const componentSet = figma.combineAsVariants(components, figma.currentPage);
      componentSet.name = `${style.toUpperCase()} ${elem.toUpperCase()} (Interactive Affordance Set)`;
      const defaultComp = components[0];
      const hoverComp = components[1];
      const pressComp = components[2];
      defaultComp.reactions = [
        {
          trigger: { type: "ON_HOVER" },
          actions: [
            {
              type: "NODE",
              destinationId: hoverComp.id,
              navigation: "CHANGE_TO",
              transition: { type: "SMART_ANIMATE", duration: 0.12, easing: { type: "EASE_IN_AND_OUT" } }
            }
          ]
        }
      ];
      hoverComp.reactions = [
        {
          trigger: { type: "ON_PRESS" },
          actions: [
            {
              type: "NODE",
              destinationId: pressComp.id,
              navigation: "CHANGE_TO",
              transition: { type: "SMART_ANIMATE", duration: 0.08, easing: { type: "EASE_IN_AND_OUT" } }
            }
          ]
        }
      ];
      figma.currentPage.selection = [componentSet];
      figma.viewport.scrollAndZoomIntoView([componentSet]);
      return {
        status: "success",
        componentSetId: componentSet.id,
        componentSetName: componentSet.name,
        variantsCreated: states.map((s, idx) => ({
          state: s.stateName,
          nodeId: components[idx].id,
          interactiveFeedback: s.stateName === "Hover" ? "Smart Animate on hover" : s.stateName === "Focused" ? "WCAG 2.4.7 focus ring" : "Static"
        }))
      };
    });
  }
  function handleLintUXMicrocopy(params) {
    return __async(this, null, function* () {
      let rootNode = null;
      if (params.nodeId) {
        rootNode = figma.getNodeById(params.nodeId);
        if (!rootNode) throw new Error(`Node '${params.nodeId}' not found.`);
      } else if (figma.currentPage.selection.length > 0) {
        rootNode = figma.currentPage.selection[0];
      } else {
        rootNode = figma.currentPage;
      }
      const issues = [];
      let textNodesCount = 0;
      function scanText(node) {
        if (node.type === "TEXT") {
          textNodesCount++;
          const textNode = node;
          const raw = textNode.characters || "";
          const lower = raw.toLowerCase().trim();
          if (lower.includes("lorem ipsum") || lower.includes("dolor sit") || lower.includes("sample text") || lower.includes("placeholder") || lower.includes("test test") || lower === "text") {
            issues.push({
              nodeId: textNode.id,
              nodeName: textNode.name,
              text: raw,
              category: "LOREM_IPSUM",
              severity: "HIGH",
              critique: "Placeholder copy disorients testers and fails to communicate value proposition.",
              recommendedCopy: "Replace with realistic user domain data (e.g. 'Standard Plan \u2022 $12/month')."
            });
          }
          const lazyCTAs = ["submit", "click here", "ok", "go", "button", "yes", "continue", "proceed"];
          if (lazyCTAs.includes(lower)) {
            issues.push({
              nodeId: textNode.id,
              nodeName: textNode.name,
              text: raw,
              category: "LAZY_CTA",
              severity: "HIGH",
              critique: `'${raw}' lacks clarity. Users cannot predict the outcome of clicking this button.`,
              recommendedCopy: lower === "submit" ? "Complete Purchase & Pay" : lower === "continue" ? "Continue to Delivery Details" : "Save Changes"
            });
          }
          if (lower.includes("error occurred") || lower.includes("invalid input") || lower.includes("something went wrong") || lower.includes("bad request")) {
            issues.push({
              nodeId: textNode.id,
              nodeName: textNode.name,
              text: raw,
              category: "BLAMING_ERROR",
              severity: "CRITICAL",
              critique: "Vague error message causes user helplessness. Violates Nielsen Heuristic #9 (constructive error recovery).",
              recommendedCopy: "3-Part Formula: 'Could not connect to payment gateway. Please verify your internet connection and try again.'"
            });
          }
          if (raw.length > 14 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)) {
            issues.push({
              nodeId: textNode.id,
              nodeName: textNode.name,
              text: raw,
              category: "ALL_CAPS_STRAIN",
              severity: "MEDIUM",
              critique: "Long all-caps text reduces human reading speed by ~15% due to uniform rectangular word contours.",
              recommendedCopy: raw.charAt(0) + raw.slice(1).toLowerCase()
            });
          }
        }
        if ("children" in node) {
          for (const child of node.children) {
            scanText(child);
          }
        }
      }
      scanText(rootNode);
      const penalty = issues.reduce((acc, curr) => {
        return acc + (curr.severity === "CRITICAL" ? 25 : curr.severity === "HIGH" ? 15 : 8);
      }, 0);
      const score = Math.max(10, 100 - penalty);
      return {
        status: "success",
        rootAudited: { id: rootNode.id, name: rootNode.name },
        textNodesAudited: textNodesCount,
        microcopyScore: score,
        issuesCount: issues.length,
        issues
      };
    });
  }

  // src/code.ts
  figma.showUI(__html__, { width: 300, height: 280, themeColors: true });
  function sendHandshake() {
    figma.ui.postMessage({
      type: "plugin_handshake",
      payload: {
        fileName: figma.root.name,
        currentPage: figma.currentPage.name
      }
    });
  }
  sendHandshake();
  figma.on("currentpagechange", () => {
    sendHandshake();
  });
  figma.ui.onmessage = (msg) => __async(null, null, function* () {
    if (msg.type !== "mcp_request" || !msg.id || !msg.action) {
      return;
    }
    const { id, action, params = {} } = msg;
    try {
      let result = null;
      switch (action) {
        case "ping": {
          result = {
            echo: params.message || "pong-v2",
            timestamp: Date.now(),
            document: figma.root.name,
            currentPage: figma.currentPage.name
          };
          break;
        }
        case "get_document_info": {
          result = {
            documentId: figma.fileKey || "local",
            documentName: figma.root.name,
            currentPage: {
              id: figma.currentPage.id,
              name: figma.currentPage.name
            },
            pages: figma.root.children.map((page) => ({
              id: page.id,
              name: page.name
            })),
            selectionCount: figma.currentPage.selection.length,
            selection: figma.currentPage.selection.map((node) => ({
              id: node.id,
              name: node.name,
              type: node.type
            }))
          };
          break;
        }
        // Step 3 Primitives
        case "create_frame": {
          result = yield handleCreateFrame(params);
          break;
        }
        case "create_rectangle": {
          result = yield handleCreateRectangle(params);
          break;
        }
        case "create_text": {
          result = yield handleCreateText(params);
          break;
        }
        case "set_autolayout": {
          result = yield handleSetAutolayout(params);
          break;
        }
        case "inspect_node": {
          result = yield handleInspectNode(params);
          break;
        }
        case "get_selection": {
          result = yield handleGetSelection();
          break;
        }
        case "get_design_context": {
          result = yield handleGetDesignContext(params);
          break;
        }
        // Additional Tools
        case "update_node": {
          result = yield handleUpdateNode(params);
          break;
        }
        case "delete_nodes": {
          result = yield handleDeleteNodes(params);
          break;
        }
        case "duplicate_node": {
          result = yield handleDuplicateNode(params);
          break;
        }
        case "set_stroke": {
          result = yield handleSetStroke(params);
          break;
        }
        case "set_text_content": {
          result = yield handleSetTextContent(params);
          break;
        }
        case "find_nodes": {
          result = yield handleFindNodes(params);
          break;
        }
        case "manage_page": {
          result = yield handleManagePage(params);
          break;
        }
        case "export_node_image": {
          result = yield handleExportNodeImage(params);
          break;
        }
        case "get_document_tokens": {
          result = yield handleGetDocumentTokens();
          break;
        }
        // Step 4: Declarative Screen Generator
        case "generate_ui_tree": {
          result = yield handleGenerateUITree(params);
          break;
        }
        // Step 5: Prototyping & Interactions
        case "set_prototype_interaction": {
          result = yield handleSetPrototypeInteraction(params);
          break;
        }
        case "set_flow_starting_point": {
          result = yield handleSetFlowStartingPoint(params);
          break;
        }
        case "get_prototype_connections": {
          result = yield handleGetPrototypeConnections();
          break;
        }
        case "batch_link_prototype": {
          result = yield handleBatchLinkPrototype(params);
          break;
        }
        case "set_overlay_interaction": {
          result = yield handleSetOverlayInteraction(params);
          break;
        }
        // Step 6: Advanced Vector, Components & Effects
        case "create_svg_icon": {
          result = yield handleCreateSvgIcon(params);
          break;
        }
        case "create_ellipse": {
          result = yield handleCreateEllipse(params);
          break;
        }
        case "create_component": {
          result = yield handleCreateComponent(params);
          break;
        }
        case "create_component_instance": {
          result = yield handleCreateComponentInstance(params);
          break;
        }
        case "set_effects": {
          result = yield handleSetEffects(params);
          break;
        }
        case "create_section": {
          result = yield handleCreateSection(params);
          break;
        }
        case "focus_viewport": {
          result = yield handleFocusViewport(params);
          break;
        }
        case "lint_design_compliance": {
          result = yield handleLintDesignCompliance(params);
          break;
        }
        case "generate_state_matrix": {
          result = yield handleGenerateStateMatrix(params);
          break;
        }
        case "audit_ux_heuristics": {
          result = yield handleAuditUXHeuristics(params);
          break;
        }
        case "validate_user_journey": {
          result = yield handleValidateUserJourney();
          break;
        }
        case "generate_interactive_variants": {
          result = yield handleGenerateInteractiveVariants(params);
          break;
        }
        case "lint_ux_microcopy": {
          result = yield handleLintUXMicrocopy(params);
          break;
        }
        default:
          throw new Error(`Unknown action '${action}'`);
      }
      figma.ui.postMessage({
        type: "mcp_response",
        id,
        success: true,
        data: result
      });
    } catch (error) {
      console.error(`[Figma Plugin] Error handling action '${action}':`, error);
      figma.ui.postMessage({
        type: "mcp_response",
        id,
        success: false,
        error: error.message || String(error)
      });
    }
  });
})();
