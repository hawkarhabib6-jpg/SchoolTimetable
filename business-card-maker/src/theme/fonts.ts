import type { FontId, FontWeight } from '@/types/card';

export interface FontDefinition {
  id: FontId;
  label: string;
  /** Scripts the font renders well. */
  scripts: ('latin' | 'arabic')[];
  weights: Record<FontWeight, string>;
}

/**
 * Font family names must match the keys registered with `useFonts` in
 * `src/theme/useAppFonts.ts`.
 */
export const FONTS: FontDefinition[] = [
  {
    id: 'montserrat',
    label: 'Montserrat',
    scripts: ['latin'],
    weights: {
      '400': 'Montserrat_400Regular',
      '600': 'Montserrat_600SemiBold',
      '700': 'Montserrat_700Bold',
    },
  },
  {
    id: 'poppins',
    label: 'Poppins',
    scripts: ['latin'],
    weights: {
      '400': 'Poppins_400Regular',
      '600': 'Poppins_600SemiBold',
      '700': 'Poppins_700Bold',
    },
  },
  {
    id: 'inter',
    label: 'Inter',
    scripts: ['latin'],
    weights: {
      '400': 'Inter_400Regular',
      '600': 'Inter_600SemiBold',
      '700': 'Inter_700Bold',
    },
  },
  {
    id: 'roboto',
    label: 'Roboto',
    scripts: ['latin'],
    weights: {
      '400': 'Roboto_400Regular',
      '600': 'Roboto_500Medium',
      '700': 'Roboto_700Bold',
    },
  },
  {
    id: 'playfair',
    label: 'Playfair Display',
    scripts: ['latin'],
    weights: {
      '400': 'PlayfairDisplay_400Regular',
      '600': 'PlayfairDisplay_600SemiBold',
      '700': 'PlayfairDisplay_700Bold',
    },
  },
  {
    id: 'cairo',
    label: 'Cairo — القاهرة',
    scripts: ['arabic', 'latin'],
    weights: {
      '400': 'Cairo_400Regular',
      '600': 'Cairo_600SemiBold',
      '700': 'Cairo_700Bold',
    },
  },
  {
    id: 'tajawal',
    label: 'Tajawal — تجوال',
    scripts: ['arabic', 'latin'],
    weights: {
      '400': 'Tajawal_400Regular',
      '600': 'Tajawal_500Medium',
      '700': 'Tajawal_700Bold',
    },
  },
  {
    id: 'notoArabic',
    label: 'Noto Sans Arabic',
    scripts: ['arabic', 'latin'],
    weights: {
      '400': 'NotoSansArabic_400Regular',
      '600': 'NotoSansArabic_600SemiBold',
      '700': 'NotoSansArabic_700Bold',
    },
  },
  {
    id: 'vazirmatn',
    label: 'Vazirmatn — وزیرمتن',
    scripts: ['arabic', 'latin'],
    weights: {
      '400': 'Vazirmatn_400Regular',
      '600': 'Vazirmatn_600SemiBold',
      '700': 'Vazirmatn_700Bold',
    },
  },
];

const FONT_MAP: Record<FontId, FontDefinition> = FONTS.reduce((acc, font) => {
  acc[font.id] = font;
  return acc;
}, {} as Record<FontId, FontDefinition>);

export function fontFamily(fontId: FontId, weight: FontWeight): string {
  const definition = FONT_MAP[fontId] ?? FONT_MAP.inter;
  return definition.weights[weight] ?? definition.weights['400'];
}

export function fontLabel(fontId: FontId): string {
  return (FONT_MAP[fontId] ?? FONT_MAP.inter).label;
}

/** Fonts that shape Arabic/Kurdish text correctly. */
export const ARABIC_FONTS: FontId[] = FONTS.filter((f) =>
  f.scripts.includes('arabic'),
).map((f) => f.id);

export function isArabicScriptFont(fontId: FontId): boolean {
  return ARABIC_FONTS.includes(fontId);
}

/** Picks a sensible default font for a language. */
export function defaultFontFor(language: 'ckb' | 'ar' | 'en'): FontId {
  return language === 'en' ? 'montserrat' : 'cairo';
}
