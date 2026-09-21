import {
  createIconElement,
  createQrElement,
  createShapeElement,
  createTextElement,
} from '@/utils/cardFactory';
import type {
  CardBackground,
  CardContact,
  CardElement,
  FontId,
  Gradient,
  IconElement,
  QrElement,
  ShapeElement,
  TextElement,
} from '@/types/card';

export const SAMPLE_CONTACT: CardContact = {
  fullName: 'Aram Karim',
  jobTitle: 'Creative Director',
  company: 'NOVA STUDIO',
  phone: '+964 750 123 4567',
  altPhone: '',
  email: 'aram@novastudio.co',
  website: 'www.novastudio.co',
  address: 'Erbil · Kurdistan Region',
  note: '',
};

export const text = (
  font: FontId,
  overrides: Partial<TextElement> & { text: string },
): TextElement => createTextElement(font, overrides);

export const shape = (overrides: Partial<ShapeElement>): ShapeElement =>
  createShapeElement(overrides);

export const icon = (
  name: string,
  overrides: Partial<IconElement> = {},
): IconElement => createIconElement(name, overrides);

export const qr = (overrides: Partial<QrElement> = {}): QrElement =>
  createQrElement(overrides);

export const solidBackground = (color: string): CardBackground => ({
  color,
  gradient: null,
  pattern: 'none',
  patternColor: '#000000',
  patternOpacity: 0.08,
});

export const gradientBackground = (
  gradient: Gradient,
  base = gradient.colors[0],
): CardBackground => ({
  color: base,
  gradient,
  pattern: 'none',
  patternColor: '#FFFFFF',
  patternOpacity: 0.08,
});

export const patternBackground = (
  color: string,
  pattern: CardBackground['pattern'],
  patternColor: string,
  patternOpacity = 0.1,
): CardBackground => ({
  color,
  gradient: null,
  pattern,
  patternColor,
  patternOpacity,
});

interface ContactLinesOptions {
  font: FontId;
  color: string;
  iconColor?: string;
  startY: number;
  /** Left edge of the icon column. */
  x: number;
  lineHeight?: number;
  fontSize?: number;
  align?: 'left' | 'right';
  width?: number;
  contact: CardContact;
  withIcons?: boolean;
}

/**
 * Builds the phone / email / website / address stack that almost every
 * business card layout needs, with optional Lucide icons in a left column.
 */
export function contactLines({
  font,
  color,
  iconColor,
  startY,
  x,
  lineHeight = 52,
  fontSize = 24,
  align = 'left',
  width = 460,
  contact,
  withIcons = true,
}: ContactLinesOptions): CardElement[] {
  const rows: { icon: string; value: string }[] = [
    { icon: 'phone', value: contact.phone },
    { icon: 'mail', value: contact.email },
    { icon: 'globe', value: contact.website },
    { icon: 'map-pin', value: contact.address },
  ].filter((row) => row.value.trim().length > 0);

  const elements: CardElement[] = [];
  const iconSize = 30;
  const gap = withIcons ? 44 : 0;

  rows.forEach((row, index) => {
    const y = startY + index * lineHeight;
    if (withIcons) {
      elements.push(
        icon(row.icon, {
          x: align === 'left' ? x : x + width - iconSize,
          y: y + 2,
          width: iconSize,
          height: iconSize,
          color: iconColor ?? color,
          strokeWidth: 2,
        }),
      );
    }
    elements.push(
      text(font, {
        text: row.value,
        x: align === 'left' ? x + gap : x,
        y,
        width: width - gap,
        height: 36,
        fontSize,
        fontWeight: '400',
        color,
        align,
        lineHeight: 1.2,
      }),
    );
  });

  return elements;
}
