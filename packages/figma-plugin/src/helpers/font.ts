/**
 * Helper to ensure a font is loaded before setting text characters.
 */
const loadedFonts = new Set<string>();

export async function ensureFontLoaded(family: string = "Inter", style: string = "Regular"): Promise<FontName> {
  const key = `${family}::${style}`;
  if (loadedFonts.has(key)) {
    return { family, style };
  }

  try {
    const fontName: FontName = { family, style };
    await figma.loadFontAsync(fontName);
    loadedFonts.add(key);
    return fontName;
  } catch (error) {
    console.warn(`[Figma Plugin] Failed to load font ${family} ${style}, falling back to Inter Regular:`, error);
    const fallback: FontName = { family: "Inter", style: "Regular" };
    await figma.loadFontAsync(fallback);
    loadedFonts.add("Inter::Regular");
    return fallback;
  }
}
