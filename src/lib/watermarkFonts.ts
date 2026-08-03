export type FontFamilyOption = {
  label: string;
  value: string;
};

export type FontFamilyGroup = {
  fonts: readonly FontFamilyOption[];
  label: string;
};

export const DEFAULT_WATERMARK_FONT_FAMILY =
  'Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const MONSERRAT_WATERMARK_FONT_FAMILY = '"Montserrat", sans-serif';

export const GEOMETRIC_SANS_FONT_FAMILY = '"Trebuchet MS", Arial, sans-serif';

const systemFonts: readonly FontFamilyOption[] = [
  { label: "System Sans", value: DEFAULT_WATERMARK_FONT_FAMILY },
  { label: "Geometric Sans", value: GEOMETRIC_SANS_FONT_FAMILY },
  { label: "Serif", value: 'Georgia, "Times New Roman", serif' },
  { label: "Monospace", value: '"Courier New", Courier, monospace' },
  { label: "Condensed", value: 'Impact, "Arial Narrow", sans-serif' },
  { label: "Script", value: '"Brush Script MT", "Segoe Script", cursive' },
];

const googleSansFonts: readonly FontFamilyOption[] = [
  { label: "Roboto", value: '"Roboto", sans-serif' },
  { label: "Open Sans", value: '"Open Sans", sans-serif' },
  { label: "Lato", value: '"Lato", sans-serif' },
  { label: "Montserrat", value: MONSERRAT_WATERMARK_FONT_FAMILY },
  { label: "Poppins", value: '"Poppins", sans-serif' },
  { label: "Inter", value: '"Inter", sans-serif' },
  { label: "Raleway", value: '"Raleway", sans-serif' },
  { label: "Nunito", value: '"Nunito", sans-serif' },
  { label: "Ubuntu", value: '"Ubuntu", sans-serif' },
  { label: "Oswald", value: '"Oswald", sans-serif' },
  { label: "Rubik", value: '"Rubik", sans-serif' },
  { label: "Work Sans", value: '"Work Sans", sans-serif' },
  { label: "Barlow", value: '"Barlow", sans-serif' },
  { label: "DM Sans", value: '"DM Sans", sans-serif' },
  { label: "Plus Jakarta Sans", value: '"Plus Jakarta Sans", sans-serif' },
  { label: "Outfit", value: '"Outfit", sans-serif' },
  { label: "Manrope", value: '"Manrope", sans-serif' },
  { label: "Quicksand", value: '"Quicksand", sans-serif' },
  { label: "Mulish", value: '"Mulish", sans-serif' },
  { label: "Karla", value: '"Karla", sans-serif' },
  { label: "Fira Sans", value: '"Fira Sans", sans-serif' },
  { label: "Source Sans 3", value: '"Source Sans 3", sans-serif' },
  { label: "PT Sans", value: '"PT Sans", sans-serif' },
  { label: "Josefin Sans", value: '"Josefin Sans", sans-serif' },
  { label: "Exo 2", value: '"Exo 2", sans-serif' },
];

const googleSerifFonts: readonly FontFamilyOption[] = [
  { label: "Merriweather", value: '"Merriweather", serif' },
  { label: "Playfair Display", value: '"Playfair Display", serif' },
  { label: "Lora", value: '"Lora", serif' },
  { label: "PT Serif", value: '"PT Serif", serif' },
  { label: "Libre Baskerville", value: '"Libre Baskerville", serif' },
  { label: "Crimson Text", value: '"Crimson Text", serif' },
  { label: "Bitter", value: '"Bitter", serif' },
  { label: "EB Garamond", value: '"EB Garamond", serif' },
  { label: "Cormorant Garamond", value: '"Cormorant Garamond", serif' },
  { label: "Domine", value: '"Domine", serif' },
  { label: "Noto Serif", value: '"Noto Serif", serif' },
  { label: "Spectral", value: '"Spectral", serif' },
];

const googleMonoFonts: readonly FontFamilyOption[] = [
  { label: "Roboto Mono", value: '"Roboto Mono", monospace' },
  { label: "Source Code Pro", value: '"Source Code Pro", monospace' },
  { label: "Fira Code", value: '"Fira Code", monospace' },
  { label: "JetBrains Mono", value: '"JetBrains Mono", monospace' },
  { label: "IBM Plex Mono", value: '"IBM Plex Mono", monospace' },
];

const googleDisplayFonts: readonly FontFamilyOption[] = [
  { label: "Bebas Neue", value: '"Bebas Neue", sans-serif' },
  { label: "Anton", value: '"Anton", sans-serif' },
  { label: "Pacifico", value: '"Pacifico", cursive' },
  { label: "Lobster", value: '"Lobster", cursive' },
  { label: "Dancing Script", value: '"Dancing Script", cursive' },
  { label: "Great Vibes", value: '"Great Vibes", cursive' },
  { label: "Caveat", value: '"Caveat", cursive' },
  { label: "Permanent Marker", value: '"Permanent Marker", cursive' },
];

export const watermarkFontFamilyGroups: readonly FontFamilyGroup[] = [
  { label: "System", fonts: systemFonts },
  { label: "Sans Serif", fonts: googleSansFonts },
  { label: "Serif", fonts: googleSerifFonts },
  { label: "Monospace", fonts: googleMonoFonts },
  { label: "Display & Script", fonts: googleDisplayFonts },
];

export const watermarkFontFamilies: readonly FontFamilyOption[] =
  watermarkFontFamilyGroups.flatMap((group) => group.fonts);

const googleFontNames = [
  ...googleSansFonts,
  ...googleSerifFonts,
  ...googleMonoFonts,
  ...googleDisplayFonts,
].map((font) => font.label);

const GOOGLE_FONTS_CHUNK_SIZE = 20;

function buildGoogleFontsFamilyParam(fontName: string) {
  return `family=${fontName.replace(/ /g, "+")}:wght@400;700`;
}

export function buildGoogleFontsStylesheetUrls() {
  const urls: string[] = [];

  for (let index = 0; index < googleFontNames.length; index += GOOGLE_FONTS_CHUNK_SIZE) {
    const chunk = googleFontNames.slice(index, index + GOOGLE_FONTS_CHUNK_SIZE);
    const query = chunk.map(buildGoogleFontsFamilyParam).join("&");
    urls.push(`https://fonts.googleapis.com/css2?${query}&display=swap`);
  }

  return urls;
}

export function extractPrimaryFontFamily(fontFamily: string) {
  const match = fontFamily.match(/"([^"]+)"/);
  return match?.[1] ?? fontFamily.split(",")[0]?.trim() ?? fontFamily;
}

export function isGoogleWatermarkFont(fontFamily: string) {
  const primary = extractPrimaryFontFamily(fontFamily);
  return googleFontNames.includes(primary);
}

export async function loadWatermarkFont(
  fontFamily: string,
  fontWeight: 400 | 700 = 700,
  fontSize = 48,
) {
  if (typeof document === "undefined" || !document.fonts) {
    return;
  }

  const primary = extractPrimaryFontFamily(fontFamily);
  await document.fonts.load(`${fontWeight} ${fontSize}px "${primary}"`);
}
