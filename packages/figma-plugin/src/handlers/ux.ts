import { createSolidPaint, hexToFigmaColor, getContrastRatio } from "../helpers/color";
import { ensureFontLoaded } from "../helpers/font";
import { calculateTypographyProperties, sanitizeUiText } from "../helpers/typography";

// ============================================================================
// 1. THE 5 STATES OF UI GENERATOR
// ============================================================================

export interface StateMatrixParams {
  title?: string;
  componentType?: "card" | "screen" | "list" | "form" | "button";
  device?: "mobile" | "desktop";
  theme?: "light" | "dark";
  x?: number;
  y?: number;
  createAsComponentSet?: boolean;
}

export async function handleGenerateStateMatrix(params: StateMatrixParams) {
  await ensureFontLoaded("Inter", "Regular");
  await ensureFontLoaded("Inter", "Medium");
  await ensureFontLoaded("Inter", "Semi Bold");
  await ensureFontLoaded("Inter", "Bold");

  const title = params.title || "Payment Methods";
  const compType = params.componentType || "card";
  const isDesktop = params.device === "desktop";
  const isDark = params.theme === "dark";

  // Dimensions
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

  // Theme palettes
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
    { key: "partial", label: "5. Partial / Edge State", desc: "Single item & boundary stress testing for text truncation" },
  ];

  const createdFrames: FrameNode[] = [];
  const startX = params.x ?? figma.viewport.center.x - (width * 5 + 40 * 4) / 2;
  const startY = params.y ?? figma.viewport.center.y - height / 2;

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

    // Autolayout container
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "FIXED";
    frame.counterAxisSizingMode = "FIXED";
    frame.paddingTop = 24;
    frame.paddingBottom = 24;
    frame.paddingLeft = 24;
    frame.paddingRight = 24;
    frame.itemSpacing = 16;

    // State Badge Header
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

    // Build specific state content
    if (s.key === "ideal") {
      // Title
      const h = figma.createText();
      h.fontName = { family: "Inter", style: "Bold" };
      h.fontSize = 18;
      h.characters = title;
      h.fills = [createSolidPaint(textPrimary)];
      frame.appendChild(h);

      // Data Card
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
      itemInfo.characters = "Visa ending in •••• 4242";
      itemInfo.fills = [createSolidPaint(textPrimary)];
      itemCard.appendChild(itemInfo);

      const statusTag = figma.createText();
      statusTag.fontName = { family: "Inter", style: "Semi Bold" };
      statusTag.fontSize = 12;
      statusTag.characters = "Default";
      statusTag.fills = [createSolidPaint("#16A34A")];
      itemCard.appendChild(statusTag);

      frame.appendChild(itemCard);

      // Action Button
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
      // Empty Icon Placeholder Frame
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

      // Supportive Copy
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

      // Onboarding CTA Button
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
      // Shimmer Skeleton Bars
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
      // Error Header
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

      // Empathetic 3-part Error Copy
      const errDesc = figma.createText();
      errDesc.fontName = { family: "Inter", style: "Regular" };
      errDesc.fontSize = 13;
      errDesc.characters =
        "A secure connection could not be established with our server. Your existing data remains safe.";
      errDesc.fills = [createSolidPaint(textSecondary)];
      errDesc.resize(width - 48, 40);
      errDesc.textAutoResize = "HEIGHT";
      frame.appendChild(errDesc);

      // Retry Action Button
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
      // Partial State (Stress-testing single item and extreme name truncation)
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

  // Create surrounding Section to organize canvas
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
      dimensions: `${width}x${height}px`,
    })),
  };
}

// ============================================================================
// 2. EMPIRICAL "LAWS OF UX" & COGNITIVE LOAD AUDITOR
// ============================================================================

export async function handleAuditUXHeuristics(params: { nodeId?: string }) {
  let targetNode: BaseNode | null = null;
  if (params.nodeId) {
    targetNode = figma.getNodeById(params.nodeId);
    if (!targetNode) throw new Error(`Node '${params.nodeId}' not found.`);
  } else if (figma.currentPage.selection.length > 0) {
    targetNode = figma.currentPage.selection[0];
  } else {
    targetNode = figma.currentPage;
  }

  const findings: Array<{
    law: "Hick's Law" | "Fitts's Law" | "Miller's Law" | "Jakob's Law";
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    nodeId: string;
    nodeName: string;
    friction: string;
    recommendation: string;
  }> = [];

  let interactiveElementsCount = 0;
  let primaryActionButtons: FrameNode[] = [];
  let destructiveButtons: FrameNode[] = [];
  let formInputsCount = 0;

  function scanNode(node: BaseNode) {
    const isFrame = node.type === "FRAME" || node.type === "INSTANCE" || node.type === "COMPONENT";

    if (isFrame) {
      const frame = node as FrameNode;
      const lower = frame.name.toLowerCase();
      const hasReactions = "reactions" in frame && (frame as any).reactions.length > 0;
      const isButton = lower.includes("btn") || lower.includes("button") || lower.includes("cta");
      const isInput = lower.includes("input") || lower.includes("field") || lower.includes("text box");
      const isDestructive = lower.includes("delete") || lower.includes("remove") || lower.includes("cancel") || lower.includes("erase");

      if (isButton || hasReactions) {
        interactiveElementsCount++;

        // Distinguish primary vs secondary button by fill color saturation/opacity
        const fills = Array.isArray(frame.fills) ? frame.fills : [];
        const solidFill = fills.find((f: any) => f.type === "SOLID");
        const hasVibrantFill = solidFill && solidFill.color && (solidFill.color.r < 0.9 || solidFill.color.b > 0.4);

        if (hasVibrantFill && !isDestructive) {
          primaryActionButtons.push(frame);
        }
        if (isDestructive) {
          destructiveButtons.push(frame);
        }

        // Fitts's Law: Minimum touch target ergonomics (44x44)
        if (frame.width < 44 || frame.height < 44) {
          findings.push({
            law: "Fitts's Law",
            severity: "HIGH",
            nodeId: frame.id,
            nodeName: frame.name,
            friction: `Touch target size is ${Math.round(frame.width)}x${Math.round(frame.height)}px. Users will experience miss-clicks and input friction.`,
            recommendation: "Expand target bounding box or padding to >= 44x44px for touch ergonomics.",
          });
        }
      }

      if (isInput) {
        formInputsCount++;
      }

      // Miller's Law: Visual Chunking in vertical AutoLayouts
      if (frame.layoutMode === "VERTICAL" && frame.children.length > 7) {
        // Count how many children are raw items vs grouped subframes
        const rawChildren = frame.children.filter((c) => c.type === "TEXT" || c.name.toLowerCase().includes("input"));
        if (rawChildren.length > 7) {
          findings.push({
            law: "Miller's Law",
            severity: "MEDIUM",
            nodeId: frame.id,
            nodeName: frame.name,
            friction: `Container contains ${rawChildren.length} unchunked consecutive elements. Working memory limits (7 ± 2 items) cause cognitive fatigue.`,
            recommendation: "Group related fields into visual chunks using cards, section headers, or step dividers.",
          });
        }
      }
    }

    if ("children" in node) {
      for (const child of (node as any).children) {
        scanNode(child);
      }
    }
  }

  scanNode(targetNode);

  // Evaluate Hick's Law (Choice Overload & Competing Primary Actions)
  if (primaryActionButtons.length > 1) {
    findings.push({
      law: "Hick's Law",
      severity: "HIGH",
      nodeId: primaryActionButtons[0].id,
      nodeName: targetNode.name,
      friction: `Screen contains ${primaryActionButtons.length} competing primary call-to-actions. Hick's Law states decision time logarithmically increases with choice ambiguity.`,
      recommendation: "Establish one clear primary CTA per viewport. Demote secondary actions to ghost, outline, or text button variants.",
    });
  }

  if (interactiveElementsCount > 9) {
    findings.push({
      law: "Hick's Law",
      severity: "MEDIUM",
      nodeId: targetNode.id,
      nodeName: targetNode.name,
      friction: `Viewport contains ${interactiveElementsCount} interactive choices. Exceeds the optimal threshold for rapid decision-making.`,
      recommendation: "Employ progressive disclosure: hide advanced options under an accordion or secondary screen.",
    });
  }

  // Fitts's Law Proximity Check: Destructive vs Primary Actions
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
          recommendation: "Separate destructive actions spatially or isolate behind a confirmation modal.",
        });
      }
    }
  }

  // Score calculation
  let penalty = 0;
  for (const f of findings) {
    if (f.severity === "CRITICAL") penalty += 25;
    else if (f.severity === "HIGH") penalty += 15;
    else if (f.severity === "MEDIUM") penalty += 8;
    else penalty += 4;
  }
  const score = Math.max(10, 100 - penalty);

  let cognitiveLoad: "LOW" | "BALANCED" | "HIGH" | "SEVERE_OVERLOAD" = "LOW";
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
      formInputsCount,
    },
    findingsCount: findings.length,
    findings,
  };
}

// ============================================================================
// 3. USER JOURNEY CONTINUUM & ZERO DEAD-END VALIDATOR
// ============================================================================

export async function handleValidateUserJourney() {
  const topFrames = figma.currentPage.children.filter((c) => c.type === "FRAME") as FrameNode[];
  const flowStartingPoints = figma.currentPage.flowStartingPoints || [];
  const flowStartIds = new Set(flowStartingPoints.map((f) => f.nodeId));

  const incomingLinks = new Map<string, string[]>(); // destId -> [sourceId]
  const outgoingLinks = new Map<string, string[]>(); // sourceFrameId -> [destFrameId]

  // Initialize
  for (const frame of topFrames) {
    incomingLinks.set(frame.id, []);
    outgoingLinks.set(frame.id, []);
  }

  // Scan all prototype reactions
  function scanInteractions(node: BaseNode, parentFrameId: string) {
    if ("reactions" in node) {
      const reactions = (node as any).reactions || [];
      for (const rx of reactions) {
        if (rx.actions) {
          for (const act of rx.actions) {
            if (act.destinationId && incomingLinks.has(act.destinationId)) {
              incomingLinks.get(act.destinationId)!.push(parentFrameId);
              outgoingLinks.get(parentFrameId)?.push(act.destinationId);
            }
          }
        }
      }
    }
    if ("children" in node) {
      for (const child of (node as any).children) {
        scanInteractions(child, parentFrameId);
      }
    }
  }

  for (const frame of topFrames) {
    scanInteractions(frame, frame.id);
  }

  // Detect Orphan Screens & Dead Ends
  const orphanScreens: Array<{ id: string; name: string }> = [];
  const deadEndScreens: Array<{ id: string; name: string }> = [];
  const wellConnectedScreens: Array<{ id: string; name: string }> = [];

  for (const frame of topFrames) {
    const isStart = flowStartIds.has(frame.id);
    const inCount = incomingLinks.get(frame.id)?.length || 0;
    const outCount = outgoingLinks.get(frame.id)?.length || 0;

    if (!isStart && inCount === 0) {
      orphanScreens.push({ id: frame.id, name: frame.name });
    }

    if (outCount === 0) {
      // Check if it has a manual back button
      let hasManualBack = false;
      const scanForBack = (n: BaseNode) => {
        const lower = n.name.toLowerCase();
        if (lower.includes("back") || lower.includes("close") || lower.includes("dismiss")) {
          hasManualBack = true;
        }
        if ("children" in n) {
          for (const c of (n as any).children) scanForBack(c);
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

  // Calculate Health
  let health: "EXCELLENT" | "GOOD" | "WARNING" | "CRITICAL" = "EXCELLENT";
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
      screens: orphanScreens,
    },
    deadEndScreens: {
      count: deadEndScreens.length,
      explanation: "Screens with no outgoing interaction links or back navigation affordance. Users get trapped.",
      screens: deadEndScreens,
    },
    wellConnectedScreensCount: wellConnectedScreens.length,
    recommendations:
      deadEndScreens.length > 0
        ? "Add explicit 'BACK' or 'CLOSE' interactions on dead-end screens using 'set_prototype_interaction'."
        : "User journey flow is continuous with zero dead ends.",
  };
}

// ============================================================================
// 4. INTERACTIVE AFFORDANCE & VARIANT COMPONENT GENERATOR
// ============================================================================

export interface InteractiveVariantParams {
  element?: "button" | "input" | "toggle" | "tab" | "card";
  label?: string;
  size?: "small" | "medium" | "large";
  variantStyle?: "primary" | "secondary" | "destructive" | "outline";
  x?: number;
  y?: number;
}

export async function handleGenerateInteractiveVariants(params: InteractiveVariantParams) {
  await ensureFontLoaded("Inter", "Regular");
  await ensureFontLoaded("Inter", "Medium");
  await ensureFontLoaded("Inter", "Semi Bold");

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
    { stateName: "Disabled", bg: "#94A3B8", text: "#E2E8F0", hasRing: false, opacity: 0.5 },
  ];

  const components: ComponentNode[] = [];
  const startX = params.x ?? figma.viewport.center.x - 300;
  const startY = params.y ?? figma.viewport.center.y - 100;

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

    // Accessible Focus Ring (WCAG 2.4.7: 2px high-contrast outline with 2px offset)
    if (s.hasRing) {
      comp.strokes = [createSolidPaint("#60A5FA")];
      comp.strokeWeight = 3;
      comp.strokeAlign = "OUTSIDE";
    }

    // Label
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

  // Combine into a Figma Component Set
  const componentSet = figma.combineAsVariants(components, figma.currentPage);
  componentSet.name = `${style.toUpperCase()} ${elem.toUpperCase()} (Interactive Affordance Set)`;

  // Auto-wire prototyping reactions:
  // Default -> Hover (ON_HOVER)
  // Hover -> Pressed (ON_PRESS)
  const defaultComp = components[0];
  const hoverComp = components[1];
  const pressComp = components[2];

  (defaultComp as any).reactions = [
    {
      trigger: { type: "ON_HOVER" },
      actions: [
        {
          type: "NODE",
          destinationId: hoverComp.id,
          navigation: "CHANGE_TO",
          transition: { type: "SMART_ANIMATE", duration: 0.12, easing: { type: "EASE_IN_AND_OUT" } },
        },
      ],
    },
  ];

  (hoverComp as any).reactions = [
    {
      trigger: { type: "ON_PRESS" },
      actions: [
        {
          type: "NODE",
          destinationId: pressComp.id,
          navigation: "CHANGE_TO",
          transition: { type: "SMART_ANIMATE", duration: 0.08, easing: { type: "EASE_IN_AND_OUT" } },
        },
      ],
    },
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
      interactiveFeedback: s.stateName === "Hover" ? "Smart Animate on hover" : s.stateName === "Focused" ? "WCAG 2.4.7 focus ring" : "Static",
    })),
  };
}

// ============================================================================
// 5. EMPATHETIC MICROCOPY & UX WRITING LINTER
// ============================================================================

export async function handleLintUXMicrocopy(params: { nodeId?: string }) {
  let rootNode: BaseNode | null = null;
  if (params.nodeId) {
    rootNode = figma.getNodeById(params.nodeId);
    if (!rootNode) throw new Error(`Node '${params.nodeId}' not found.`);
  } else if (figma.currentPage.selection.length > 0) {
    rootNode = figma.currentPage.selection[0];
  } else {
    rootNode = figma.currentPage;
  }

  const issues: Array<{
    nodeId: string;
    nodeName: string;
    text: string;
    category: "LOREM_IPSUM" | "LAZY_CTA" | "BLAMING_ERROR" | "ALL_CAPS_STRAIN";
    severity: "CRITICAL" | "HIGH" | "MEDIUM";
    critique: string;
    recommendedCopy: string;
  }> = [];

  let textNodesCount = 0;

  function scanText(node: BaseNode) {
    if (node.type === "TEXT") {
      textNodesCount++;
      const textNode = node as TextNode;
      const raw = textNode.characters || "";
      const lower = raw.toLowerCase().trim();

      // 1. Placeholder & Lorem Ipsum Detection
      if (
        lower.includes("lorem ipsum") ||
        lower.includes("dolor sit") ||
        lower.includes("sample text") ||
        lower.includes("placeholder") ||
        lower.includes("test test") ||
        lower === "text"
      ) {
        issues.push({
          nodeId: textNode.id,
          nodeName: textNode.name,
          text: raw,
          category: "LOREM_IPSUM",
          severity: "HIGH",
          critique: "Placeholder copy disorients testers and fails to communicate value proposition.",
          recommendedCopy: "Replace with realistic user domain data (e.g. 'Standard Plan • $12/month').",
        });
      }

      // 2. Lazy / Ambiguous CTA Detection
      const lazyCTAs = ["submit", "click here", "ok", "go", "button", "yes", "continue", "proceed"];
      if (lazyCTAs.includes(lower)) {
        issues.push({
          nodeId: textNode.id,
          nodeName: textNode.name,
          text: raw,
          category: "LAZY_CTA",
          severity: "HIGH",
          critique: `'${raw}' lacks clarity. Users cannot predict the outcome of clicking this button.`,
          recommendedCopy:
            lower === "submit"
              ? "Complete Purchase & Pay"
              : lower === "continue"
              ? "Continue to Delivery Details"
              : "Save Changes",
        });
      }

      // 3. Robotic or Blaming Error Copy
      if (
        lower.includes("error occurred") ||
        lower.includes("invalid input") ||
        lower.includes("something went wrong") ||
        lower.includes("bad request")
      ) {
        issues.push({
          nodeId: textNode.id,
          nodeName: textNode.name,
          text: raw,
          category: "BLAMING_ERROR",
          severity: "CRITICAL",
          critique: "Vague error message causes user helplessness. Violates Nielsen Heuristic #9 (constructive error recovery).",
          recommendedCopy:
            "3-Part Formula: 'Could not connect to payment gateway. Please verify your internet connection and try again.'",
        });
      }

      // 4. All-Caps Cognitive Strain (>14 characters)
      if (raw.length > 14 && raw === raw.toUpperCase() && /[A-Z]/.test(raw)) {
        issues.push({
          nodeId: textNode.id,
          nodeName: textNode.name,
          text: raw,
          category: "ALL_CAPS_STRAIN",
          severity: "MEDIUM",
          critique: "Long all-caps text reduces human reading speed by ~15% due to uniform rectangular word contours.",
          recommendedCopy: raw.charAt(0) + raw.slice(1).toLowerCase(),
        });
      }
    }

    if ("children" in node) {
      for (const child of (node as any).children) {
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
    issues,
  };
}
