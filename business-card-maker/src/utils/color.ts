/** Converts `#RGB` / `#RRGGBB` to `rgba()` with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const normalised = normaliseHex(hex);
  if (!normalised) return hex;
  const { r, g, b } = normalised;
  const clamped = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

export function normaliseHex(hex: string): { r: number; g: number; b: number } | null {
  let value = hex.trim().replace('#', '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** Picks black or white text so it stays readable on `background`. */
export function contrastColor(background: string): string {
  const rgb = normaliseHex(background);
  if (!rgb) return '#000000';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.6 ? '#0F172A' : '#FFFFFF';
}

export function isValidHex(value: string): boolean {
  return normaliseHex(value) !== null;
}

/**
 * Converts a gradient angle in degrees into the start/end points that
 * `expo-linear-gradient` expects (unit square coordinates).
 */
export function angleToPoints(angle: number): {
  start: { x: number; y: number };
  end: { x: number; y: number };
} {
  const radians = ((angle - 90) * Math.PI) / 180;
  const x = Math.cos(radians);
  const y = Math.sin(radians);
  return {
    start: { x: 0.5 - x / 2, y: 0.5 - y / 2 },
    end: { x: 0.5 + x / 2, y: 0.5 + y / 2 },
  };
}
