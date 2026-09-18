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
