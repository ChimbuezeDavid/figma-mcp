/**
 * Enterprise Typography & UI Copy Guardian
 * Enforces professional typographic hierarchy, calibrated leading, optical tracking,
 * standardized type scales, deterministic archetype font pairings, and eliminates emojis.
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

export interface TypeScaleEntry {
  size: number;
  lineHeight: number;
  letterSpacing: number; // in percent
  defaultWeight: string;
}

/**
 * Deterministic Standard Type Scale based on 8pt/4pt mathematical increments
 */
export const STANDARD_TYPE_SCALE: Record<string, TypeScaleEntry> = {
  "display-2xl": { size: 64, lineHeight: 72, letterSpacing: -1.5, defaultWeight: "Bold" },
  "display-xl": { size: 48, lineHeight: 56, letterSpacing: -1.5, defaultWeight: "Bold" },
  "display-lg": { size: 36, lineHeight: 44, letterSpacing: -1.2, defaultWeight: "SemiBold" },
  h1: { size: 30, lineHeight: 38, letterSpacing: -1.0, defaultWeight: "SemiBold" },
  h2: { size: 24, lineHeight: 32, letterSpacing: -0.8, defaultWeight: "SemiBold" },
  h3: { size: 20, lineHeight: 28, letterSpacing: -0.5, defaultWeight: "SemiBold" },
  subheading: { size: 18, lineHeight: 26, letterSpacing: -0.3, defaultWeight: "Medium" },
  "body-lg": { size: 16, lineHeight: 24, letterSpacing: 0, defaultWeight: "Regular" },
  "body-md": { size: 14, lineHeight: 22, letterSpacing: 0, defaultWeight: "Regular" },
  "body-sm": { size: 13, lineHeight: 18, letterSpacing: 0.2, defaultWeight: "Regular" },
  caption: { size: 12, lineHeight: 16, letterSpacing: 1.2, defaultWeight: "Medium" },
  badge: { size: 11, lineHeight: 14, letterSpacing: 1.5, defaultWeight: "SemiBold" },
};

export type TypographyArchetype = "institutional" | "modern-saas" | "corporate" | "creative-editorial";

export const ARCHETYPE_FONT_PAIRINGS: Record<
  TypographyArchetype,
  { headingFamily: string; bodyFamily: string; accentFamily: string }
> = {
  institutional: {
    headingFamily: "Playfair Display",
    bodyFamily: "Inter",
    accentFamily: "Cinzel",
  },
  "modern-saas": {
    headingFamily: "Inter",
    bodyFamily: "Inter",
    accentFamily: "Inter",
  },
  corporate: {
    headingFamily: "Roboto",
    bodyFamily: "Inter",
    accentFamily: "Roboto Mono",
  },
  "creative-editorial": {
    headingFamily: "Playfair Display",
    bodyFamily: "Inter",
    accentFamily: "Playfair Display",
  },
};

export interface TypographyCalculations {
  lineHeight: number;
  letterSpacing: number; // in percent
}

/**
 * Computes optimal proportional leading (line-height) and optical tracking (letter-spacing)
 * based on font size and typographic role.
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
  isUppercase?: boolean,
  variant?: string
) {
  if (variant && STANDARD_TYPE_SCALE[variant]) {
    const scale = STANDARD_TYPE_SCALE[variant];
    textNode.fontSize = scale.size;
    textNode.lineHeight = { value: scale.lineHeight, unit: "PIXELS" };
    textNode.letterSpacing = { value: scale.letterSpacing, unit: "PERCENT" };
    return;
  }

  const size = fontSize ?? (typeof textNode.fontSize === "number" ? textNode.fontSize : 16);
  const { lineHeight, letterSpacing } = calculateTypographyProperties(size, isUppercase);

  textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
  textNode.letterSpacing = { value: letterSpacing, unit: "PERCENT" };
}
