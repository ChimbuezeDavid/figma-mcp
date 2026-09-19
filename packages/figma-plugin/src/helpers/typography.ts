/**
 * Enterprise Typography & UI Copy Guardian
 * Enforces professional typographic hierarchy, calibrated leading, optical tracking,
 * and eliminates unprofessional emojis from UI designs.
 */

// Regex covering all Unicode emoji blocks (Standard, Emoticons, Symbols, Flags, Modifiers)
export const EMOJI_REGEX =
  /[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

/**
 * Sanitizes UI copy by stripping emojis and cleaning up resulting whitespace.
 * Emojis are strictly disallowed in enterprise UI design.
 */
export function sanitizeUiText(rawText: string): {
  text: string;
  emojisRemoved: boolean;
} {
  if (!rawText) return { text: "", emojisRemoved: false };

  const hasEmoji = EMOJI_REGEX.test(rawText);
  // Reset regex lastIndex
  EMOJI_REGEX.lastIndex = 0;

  if (!hasEmoji) {
    return { text: rawText, emojisRemoved: false };
  }

  // Strip emojis and clean up double spaces
  const cleaned = rawText
    .replace(EMOJI_REGEX, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return {
    text: cleaned,
    emojisRemoved: true,
  };
}

export interface TypographyCalculations {
  lineHeight: number;
  letterSpacing: number; // in percent
}

/**
 * Computes optimal proportional leading (line-height) and optical tracking (letter-spacing)
 * based on font size and typographic role.
 *
 * Rules:
 * - Display / Hero (>= 32px): Tight leading (1.15x), compact tracking (-1.5%) for punchy modern headlines.
 * - Titles (24px - 31px): Balanced leading (1.25x), subtle compact tracking (-1.0%).
 * - Subheadings (18px - 23px): Clear leading (1.35x), tracking (-0.5%).
 * - Body Text (14px - 17px): Ergonomic reading leading (1.50x), neutral tracking (0%).
 * - Captions & Badges (<= 13px): Proportional leading (1.40x), open tracking (+1.5% to +2.5%) for small-scale legibility.
 */
export function calculateTypographyProperties(
  fontSize: number,
  isUppercase: boolean = false
): TypographyCalculations {
  const size = Math.max(8, fontSize);

  if (size >= 32) {
    // Large display headlines (e.g. 32px, 40px, 48px, 64px)
    return {
      lineHeight: Math.round(size * 1.15),
      letterSpacing: -1.5,
    };
  }

  if (size >= 24) {
    // Section headers & modal titles (e.g. 24px, 28px)
    return {
      lineHeight: Math.round(size * 1.25),
      letterSpacing: -1.0,
    };
  }

  if (size >= 18) {
    // Subheadings & card titles (e.g. 18px, 20px)
    return {
      lineHeight: Math.round(size * 1.35),
      letterSpacing: -0.5,
    };
  }

  if (size >= 14) {
    // Body copy & form inputs (e.g. 14px, 15px, 16px)
    return {
      lineHeight: Math.round(size * 1.5),
      letterSpacing: isUppercase ? 1.0 : 0,
    };
  }

  // Micro-copy, pill badges, and captions (<= 13px)
  return {
    lineHeight: Math.round(size * 1.4),
    letterSpacing: isUppercase ? 2.5 : 1.2,
  };
}

/**
 * Applies calibrated leading and tracking to a Figma TextNode.
 */
export function applyIntelligentTypography(
  textNode: TextNode,
  fontSize?: number,
  isUppercase?: boolean
) {
  const size = fontSize ?? (typeof textNode.fontSize === "number" ? textNode.fontSize : 16);
  const { lineHeight, letterSpacing } = calculateTypographyProperties(size, isUppercase);

  textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
  textNode.letterSpacing = { value: letterSpacing, unit: "PERCENT" };
}
