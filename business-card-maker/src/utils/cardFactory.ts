import { createId } from './id';
import {
  CARD_HEIGHT,
  CARD_WIDTH,
  emptyContact,
  type CardElement,
  type CardProject,
  type CardSide,
  type CardTemplate,
  type FontId,
  type IconElement,
  type ImageElement,
  type QrElement,
  type ShapeElement,
  type TextElement,
} from '@/types/card';

export function blankSide(color = '#FFFFFF'): CardSide {
  return {
    background: {
      color,
      gradient: null,
      pattern: 'none',
      patternColor: '#000000',
      patternOpacity: 0.08,
    },
    elements: [],
  };
}

export function createBlankCard(name: string, fontId: FontId): CardProject {
  const now = Date.now();
  return {
    id: createId('card'),
    name,
    templateId: null,
    createdAt: now,
    updatedAt: now,
    contact: emptyContact(),
    front: {
      ...blankSide(),
      elements: [
        createTextElement(fontId, {
          text: 'Your Name',
          x: 80,
          y: 190,
          width: 620,
          height: 90,
          fontSize: 62,
          fontWeight: '700',
          color: '#0F172A',
        }),
        createTextElement(fontId, {
          text: 'Job title',
          x: 80,
          y: 290,
          width: 620,
          height: 56,
          fontSize: 34,
          fontWeight: '400',
          color: '#64748B',
        }),
      ],
    },
    back: blankSide('#0F172A'),
  };
}

export function createTextElement(
  fontId: FontId,
  overrides: Partial<TextElement> = {},
): TextElement {
  return {
    id: createId('txt'),
    type: 'text',
    x: 120,
    y: 240,
    width: 500,
    height: 80,
    rotation: 0,
    opacity: 1,
    locked: false,
    text: 'Text',
    fontId,
    fontSize: 44,
    fontWeight: '400',
    color: '#0F172A',
    align: 'left',
    lineHeight: 1.25,
    letterSpacing: 0,
    uppercase: false,
    ...overrides,
  };
}

export function createImageElement(
  uri: string,
  overrides: Partial<ImageElement> = {},
): ImageElement {
  return {
    id: createId('img'),
    type: 'image',
    x: 80,
    y: 80,
    width: 260,
    height: 260,
    rotation: 0,
    opacity: 1,
    locked: false,
    uri,
    shape: 'rounded',
    cornerRadius: 24,
    borderWidth: 0,
    borderColor: '#FFFFFF',
    shadow: 0,
    resizeMode: 'cover',
    ...overrides,
  };
}

export function createShapeElement(
  overrides: Partial<ShapeElement> = {},
): ShapeElement {
  return {
    id: createId('shp'),
    type: 'shape',
    x: 100,
    y: 100,
    width: 300,
    height: 160,
    rotation: 0,
    opacity: 1,
    locked: false,
    shape: 'rect',
    color: '#4F46E5',
    gradient: null,
    cornerRadius: 16,
    ...overrides,
  };
}

export function createIconElement(
  iconName: string,
  overrides: Partial<IconElement> = {},
): IconElement {
  return {
    id: createId('icn'),
    type: 'icon',
    x: 120,
    y: 400,
    width: 60,
    height: 60,
    rotation: 0,
    opacity: 1,
    locked: false,
    iconName,
    color: '#0F172A',
    strokeWidth: 2,
    ...overrides,
  };
}

export function createQrElement(overrides: Partial<QrElement> = {}): QrElement {
  return {
    id: createId('qr'),
    type: 'qr',
    x: CARD_WIDTH - 260,
    y: CARD_HEIGHT - 260,
    width: 180,
    height: 180,
    rotation: 0,
    opacity: 1,
    locked: false,
    source: 'vcard',
    value: '',
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    ...overrides,
  };
}

/** Deep clone that also gives every element a fresh id. */
export function cloneSide(side: CardSide): CardSide {
  return {
    background: { ...side.background, gradient: side.background.gradient ? { ...side.background.gradient, colors: [...side.background.gradient.colors] } : null },
    elements: side.elements.map(cloneElement),
  };
}

export function cloneElement(element: CardElement): CardElement {
  const copy = JSON.parse(JSON.stringify(element)) as CardElement;
  copy.id = createId(element.type);
  return copy;
}

export function projectFromTemplate(
  template: CardTemplate,
  name: string,
): CardProject {
  const now = Date.now();
  return {
    id: createId('card'),
    name,
    templateId: template.id,
    createdAt: now,
    updatedAt: now,
    contact: { ...template.contact },
    front: cloneSide(template.front),
    back: cloneSide(template.back),
  };
}

export function duplicateProject(
  project: CardProject,
  name: string,
): CardProject {
  const now = Date.now();
  return {
    ...project,
    id: createId('card'),
    name,
    createdAt: now,
    updatedAt: now,
    contact: { ...project.contact },
    front: cloneSide(project.front),
    back: cloneSide(project.back),
  };
}
