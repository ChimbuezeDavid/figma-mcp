import { EMOJI_REGEX } from "../helpers/typography";

export interface LintViolation {
  category: "EMOJI" | "TOUCH_TARGET" | "GRID_SPACING" | "TYPOGRAPHY";
  severity: "ERROR" | "WARNING";
  nodeId: string;
  nodeName: string;
  message: string;
  recommendation: string;
}

export async function handleLintDesignCompliance(params: { nodeId?: string }) {
  let rootNode: BaseNode | null = null;

  if (params.nodeId) {
    rootNode = figma.getNodeById(params.nodeId);
    if (!rootNode) {
      throw new Error(`Target node '${params.nodeId}' not found.`);
    }
  } else {
    rootNode = figma.currentPage;
  }

  const violations: LintViolation[] = [];
  let nodesAudited = 0;

  function auditNode(node: BaseNode) {
    nodesAudited++;

    // 1. Audit Text Nodes (Emojis & Typography)
    if (node.type === "TEXT") {
      const textNode = node as TextNode;
      const content = textNode.characters || "";

      // Check for disallowed emojis
      EMOJI_REGEX.lastIndex = 0;
      if (EMOJI_REGEX.test(content)) {
        violations.push({
          category: "EMOJI",
          severity: "ERROR",
          nodeId: textNode.id,
          nodeName: textNode.name,
          message: `Text contains emoji icons: "${content.slice(0, 35)}..."`,
          recommendation:
            "Remove emojis and use the 'create_svg_icon' tool with vector SVG paths instead.",
        });
      }

      // Check for Line Height (Leading)
      if (textNode.lineHeight && (textNode.lineHeight as any).unit === "AUTO") {
        violations.push({
          category: "TYPOGRAPHY",
          severity: "WARNING",
          nodeId: textNode.id,
          nodeName: textNode.name,
          message: `Uncalibrated line-height (AUTO) detected on '${textNode.name}'.`,
          recommendation:
            "Set explicit proportional leading (1.15x for display headers, 1.5x for body text).",
        });
      }
    }

    // 2. Audit Frame Nodes (Touch targets & 8pt Grid)
    if (node.type === "FRAME" || node.type === "INSTANCE" || node.type === "COMPONENT") {
      const frame = node as FrameNode;
      const lowerName = frame.name.toLowerCase();
      const isInteractive =
        lowerName.includes("button") ||
        lowerName.includes("btn") ||
        lowerName.includes("cta") ||
        lowerName.includes("tap") ||
        lowerName.includes("input") ||
        lowerName.includes("icon") ||
        ("reactions" in frame && (frame as any).reactions.length > 0);

      // Touch Target Check (Apple HIG / WCAG: min 44x44px)
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
            recommendation:
              "Increase padding or height to >= 44px to comply with Apple HIG, Google Material, and WCAG 2.1 touch ergonomics (Fitts's Law).",
          });
        }
      }

      // 8-Point Grid Spacing Check
      if (frame.layoutMode && frame.layoutMode !== "NONE") {
        const checkGrid = (val: number, label: string) => {
          if (val > 0 && val % 4 !== 0) {
            violations.push({
              category: "GRID_SPACING",
              severity: "WARNING",
              nodeId: frame.id,
              nodeName: frame.name,
              message: `${label} is ${val}px, which does not conform to the 4pt/8pt spacing scale.`,
              recommendation: `Snap to the nearest clean 4pt/8pt grid increment (${Math.round(
                val / 4
              ) * 4}px).`,
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

    // Recurse children
    if ("children" in node) {
      for (const child of (node as ChildrenMixin).children) {
        auditNode(child);
      }
    }
  }

  auditNode(rootNode);

  const errorCount = violations.filter((v) => v.severity === "ERROR").length;
  const warningCount = violations.filter((v) => v.severity === "WARNING").length;

  // Deduct 10 points per error, 3 points per warning
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
    summary:
      complianceScore >= 90
        ? "Excellent design quality! The interface conforms to enterprise typography, HCI touch targets, and the 8pt grid system."
        : `Design quality score: ${complianceScore} (${grade}). ${violations.length} HCI/design issues found. Review recommendations to achieve enterprise polish.`,
  };
}
