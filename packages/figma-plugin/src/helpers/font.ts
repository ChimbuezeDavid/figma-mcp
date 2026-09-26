/**
 * Helper to ensure a font is loaded before setting text characters.
 */
const loadedFonts = new Set<string>();

export async function ensureFontLoaded(family: string = "Inter", style: string = "Regular"): Promise<FontName> {
  const key = `${family}::${style}`;
  if (loadedFonts.has(key)) {
    return { family, style };
  }

  // Handle common style naming variations across Figma desktop and web installations
  const styleCandidates: string[] = [
    style,
    style === "SemiBold" ? "Semi Bold" : undefined,
    style === "Semi Bold" ? "SemiBold" : undefined,
    style === "Medium" ? "Regular" : undefined,
    style === "Bold" ? "Semi Bold" : undefined,
    "Regular"
  ].filter((s): s is string => Boolean(s));

  for (const candidate of styleCandidates) {
    try {
      const fontName: FontName = { family, style: candidate };
      await figma.loadFontAsync(fontName);
      loadedFonts.add(key);
      return fontName;
    } catch {
      // Try next candidate
    }
  }

  // Absolute fallback
  const fallback: FontName = { family: "Inter", style: "Regular" };
  try {
    await figma.loadFontAsync(fallback);
  } catch (err) {
    console.warn("Failed to load even fallback font:", err);
  }
  loadedFonts.add(key);
  return fallback;
}
