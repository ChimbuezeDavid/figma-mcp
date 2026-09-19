/**
 * Converts Hex string (#RGB, #RRGGBB, #RRGGBBAA) to Figma RGB/RGBA objects (0..1)
 */
export function hexToFigmaColor(hex: string): { rgb: RGB; opacity: number } {
  let cleaned = hex.replace("#", "").trim();

  if (cleaned.length === 3) {
    cleaned = cleaned
      .split("")
      .map((c) => c + c)
      .join("");
  }

  if (cleaned.length === 6) {
    const num = parseInt(cleaned, 16);
    return {
      rgb: {
        r: ((num >> 16) & 255) / 255,
        g: ((num >> 8) & 255) / 255,
        b: (num & 255) / 255,
      },
      opacity: 1,
    };
  }

  if (cleaned.length === 8) {
    const num = parseInt(cleaned, 16);
    return {
      rgb: {
        r: ((num >> 24) & 255) / 255,
        g: ((num >> 16) & 255) / 255,
        b: ((num >> 8) & 255) / 255,
      },
      opacity: (num & 255) / 255,
    };
  }

  // Fallback to black
  return {
    rgb: { r: 0, g: 0, b: 0 },
    opacity: 1,
  };
}

export function createSolidPaint(hex: string): SolidPaint {
  const { rgb, opacity } = hexToFigmaColor(hex);
  return {
    type: "SOLID",
    color: rgb,
    opacity,
  };
}

/**
 * Calculates WCAG 2.1 relative luminance for an RGB object (values 0..1).
 */
export function getRelativeLuminance(rgb: RGB): number {
  const transform = (c: number) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = transform(rgb.r);
  const g = transform(rgb.g);
  const b = transform(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates WCAG contrast ratio between two hex colors (e.g. text color vs background).
 * Returns a number between 1 and 21 (e.g. 4.5).
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const color1 = hexToFigmaColor(hex1).rgb;
  const color2 = hexToFigmaColor(hex2).rgb;
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

