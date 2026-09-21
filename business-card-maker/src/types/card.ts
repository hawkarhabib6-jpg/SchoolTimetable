/**
 * Card design space.
 *
 * Every coordinate, size and font size inside a card document is stored in
 * "card units". The card is a standard 3.5in x 2in business card rendered at
 * 300 DPI, which gives us 1050 x 600 units. Rendering at any on-screen size is
 * a single uniform scale (`displayWidth / CARD_WIDTH`), and exporting at
 * print resolution is simply scale = 1. Nothing has to be recalculated.
 */
export const CARD_WIDTH = 1050;
export const CARD_HEIGHT = 600;
export const CARD_DPI = 300;

export type SideKey = 'front' | 'back';

export type TextAlign = 'left' | 'center' | 'right';

export type FontId =
  | 'montserrat'
  | 'poppins'
  | 'inter'
  | 'roboto'
  | 'playfair'
  | 'cairo'
  | 'tajawal'
  | 'notoArabic'
  | 'vazirmatn';

export type FontWeight = '400' | '600' | '700';

export type ImageShape = 'rect' | 'rounded' | 'circle';

export type ShapeKind = 'rect' | 'circle' | 'line' | 'triangle';

export interface BaseElement {
  id: string;
  /** Left edge in card units. */
  x: number;
  /** Top edge in card units. */
  y: number;
  /** Width in card units. */
  width: number;
  /** Height in card units. */
  height: number;
  /** Degrees, clockwise. */
  rotation: number;
  /** 0..1 */
  opacity: number;
  locked: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontId: FontId;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  uppercase: boolean;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  uri: string;
  shape: ImageShape;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
  shadow: number;
  resizeMode: 'cover' | 'contain';
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape: ShapeKind;
  color: string;
  gradient: Gradient | null;
  cornerRadius: number;
}

export interface IconElement extends BaseElement {
  type: 'icon';
  iconName: string;
  color: string;
  strokeWidth: number;
}

export interface QrElement extends BaseElement {
  type: 'qr';
  /** When `source` is 'vcard' the value is generated from the card contact. */
  source: 'vcard' | 'custom';
  value: string;
  color: string;
  backgroundColor: string;
}

export type CardElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | IconElement
  | QrElement;

export interface Gradient {
  colors: string[];
  /** 0 = left→right, 90 = top→bottom, etc. */
  angle: number;
}

export type PatternKind = 'none' | 'dots' | 'grid' | 'diagonal' | 'waves';

export interface CardBackground {
  color: string;
  gradient: Gradient | null;
  pattern: PatternKind;
  patternColor: string;
  patternOpacity: number;
}

export interface CardSide {
  background: CardBackground;
  elements: CardElement[];
}

/** Contact details used for the vCard / QR code. */
export interface CardContact {
  fullName: string;
  jobTitle: string;
  company: string;
  phone: string;
  altPhone: string;
  email: string;
  website: string;
  address: string;
  note: string;
}

export interface CardProject {
  id: string;
  name: string;
  templateId: string | null;
  createdAt: number;
  updatedAt: number;
  contact: CardContact;
  front: CardSide;
  back: CardSide;
}

export type TemplateCategory =
  | 'modern'
  | 'executive'
  | 'minimalist'
  | 'creative'
  | 'classic';

export interface CardTemplate {
  id: string;
  /** i18n key suffix, resolved as `templates.<nameKey>`. */
  nameKey: string;
  category: TemplateCategory;
  /** Direction the layout was designed for; mirrored automatically for RTL. */
  contact: CardContact;
  front: CardSide;
  back: CardSide;
}

export const emptyContact = (): CardContact => ({
  fullName: '',
  jobTitle: '',
  company: '',
  phone: '',
  altPhone: '',
  email: '',
  website: '',
  address: '',
  note: '',
});
