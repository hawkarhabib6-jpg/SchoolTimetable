import { CARD_HEIGHT, CARD_WIDTH, type CardElement } from '@/types/card';

export const GRID_STEP = 10;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snap(value: number, enabled: boolean, step = GRID_STEP): number {
  return enabled ? Math.round(value / step) * step : Math.round(value);
}

/** Keeps an element at least partly on the card after a drag. */
export function clampToCard(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const margin = 40;
  return {
    x: clamp(x, -width + margin, CARD_WIDTH - margin),
    y: clamp(y, -height + margin, CARD_HEIGHT - margin),
  };
}

export function centerHorizontally(element: CardElement): number {
  return Math.round((CARD_WIDTH - element.width) / 2);
}

export function centerVertically(element: CardElement): number {
  return Math.round((CARD_HEIGHT - element.height) / 2);
}

export function minSizeFor(element: CardElement): { width: number; height: number } {
  if (element.type === 'text') return { width: 60, height: 24 };
  return { width: 24, height: 24 };
}
