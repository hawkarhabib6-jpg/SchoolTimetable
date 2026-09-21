export interface AppTheme {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  overlay: string;
  shadow: string;
}

export const lightTheme: AppTheme = {
  mode: 'light',
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F9',
  border: '#DCE3ED',
  text: '#0F172A',
  textMuted: '#64748B',
  primary: '#4F46E5',
  primarySoft: '#EEF0FF',
  onPrimary: '#FFFFFF',
  accent: '#06B6D4',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  overlay: 'rgba(15, 23, 42, 0.45)',
  shadow: '#0F172A',
};

export const darkTheme: AppTheme = {
  mode: 'dark',
  background: '#0B1120',
  surface: '#131C2E',
  surfaceAlt: '#1B263B',
  border: '#27354D',
  text: '#F1F5F9',
  textMuted: '#93A3B8',
  primary: '#818CF8',
  primarySoft: '#1E2542',
  onPrimary: '#0B1120',
  accent: '#22D3EE',
  danger: '#F87171',
  success: '#4ADE80',
  warning: '#FBBF24',
  overlay: 'rgba(2, 6, 23, 0.66)',
  shadow: '#000000',
};

/** Swatches offered by the colour picker. */
export const SWATCHES: string[] = [
  '#FFFFFF', '#F8FAFC', '#E2E8F0', '#94A3B8', '#475569', '#1E293B', '#0F172A', '#000000',
  '#4F46E5', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#DC2626',
  '#EA580C', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4',
  '#0EA5E9', '#3B82F6', '#1D4ED8', '#1E3A8A', '#7C2D12', '#78350F', '#B91C1C', '#831843',
  '#C9A227', '#B08D57', '#8D6E63', '#4E342E', '#D4AF37', '#E5E4E2', '#0D9488', '#134E4A',
];

export const GRADIENT_PRESETS: { colors: string[]; angle: number }[] = [
  { colors: ['#4F46E5', '#06B6D4'], angle: 135 },
  { colors: ['#0F172A', '#334155'], angle: 135 },
  { colors: ['#F43F5E', '#F59E0B'], angle: 120 },
  { colors: ['#10B981', '#065F46'], angle: 135 },
  { colors: ['#7C3AED', '#EC4899'], angle: 110 },
  { colors: ['#111827', '#B08D57'], angle: 160 },
  { colors: ['#0EA5E9', '#1E3A8A'], angle: 135 },
  { colors: ['#FDE68A', '#F97316'], angle: 100 },
  { colors: ['#E5E4E2', '#9CA3AF'], angle: 140 },
  { colors: ['#134E4A', '#14B8A6'], angle: 150 },
];
