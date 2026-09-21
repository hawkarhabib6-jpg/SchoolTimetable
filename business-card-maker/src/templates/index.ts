import {
  SAMPLE_CONTACT,
  contactLines,
  gradientBackground,
  icon,
  patternBackground,
  qr,
  shape,
  solidBackground,
  text,
} from './builders';
import { CARD_HEIGHT, CARD_WIDTH, type CardTemplate, type TemplateCategory } from '@/types/card';

const C = SAMPLE_CONTACT;

/* ------------------------------------------------------------------ *
 * Modern / Tech
 * ------------------------------------------------------------------ */

const auroraTech: CardTemplate = {
  id: 'aurora-tech',
  nameKey: 'auroraTech',
  category: 'modern',
  contact: C,
  front: {
    background: gradientBackground({ colors: ['#0F172A', '#1E3A8A', '#06B6D4'], angle: 135 }),
    elements: [
      shape({ x: 0, y: 0, width: 14, height: CARD_HEIGHT, shape: 'rect', color: '#22D3EE', cornerRadius: 0 }),
      text('poppins', {
        text: C.fullName, x: 70, y: 140, width: 620, height: 86,
        fontSize: 64, fontWeight: '700', color: '#FFFFFF',
      }),
      text('poppins', {
        text: C.jobTitle, x: 70, y: 232, width: 620, height: 44,
        fontSize: 28, fontWeight: '400', color: '#A5F3FC', letterSpacing: 3, uppercase: true,
      }),
      shape({ x: 70, y: 300, width: 120, height: 5, shape: 'rect', color: '#22D3EE', cornerRadius: 3 }),
      ...contactLines({ font: 'inter', color: '#E2E8F0', iconColor: '#22D3EE', startY: 350, x: 70, contact: C }),
      qr({ x: 810, y: 330, width: 170, height: 170, color: '#0F172A', backgroundColor: '#FFFFFF' }),
    ],
  },
  back: {
    background: gradientBackground({ colors: ['#06B6D4', '#1E3A8A'], angle: 315 }),
    elements: [
      text('poppins', {
        text: C.company, x: 125, y: 250, width: 800, height: 80,
        fontSize: 58, fontWeight: '700', color: '#FFFFFF', align: 'center', letterSpacing: 8,
      }),
      text('inter', {
        text: 'DESIGN · TECHNOLOGY · BRANDING', x: 125, y: 340, width: 800, height: 36,
        fontSize: 22, fontWeight: '400', color: '#CFFAFE', align: 'center', letterSpacing: 4,
      }),
    ],
  },
};

const neonGrid: CardTemplate = {
  id: 'neon-grid',
  nameKey: 'neonGrid',
  category: 'modern',
  contact: C,
  front: {
    background: patternBackground('#0B1120', 'grid', '#38BDF8', 0.16),
    elements: [
      shape({ x: 70, y: 70, width: 84, height: 84, shape: 'rect', color: '#38BDF8', cornerRadius: 20 }),
      icon('zap', { x: 92, y: 92, width: 40, height: 40, color: '#0B1120', strokeWidth: 2.5 }),
      text('inter', {
        text: C.fullName, x: 70, y: 210, width: 600, height: 80,
        fontSize: 58, fontWeight: '700', color: '#F8FAFC',
      }),
      text('inter', {
        text: C.jobTitle, x: 70, y: 292, width: 600, height: 40,
        fontSize: 26, fontWeight: '400', color: '#38BDF8',
      }),
      ...contactLines({ font: 'inter', color: '#94A3B8', iconColor: '#38BDF8', startY: 370, x: 70, fontSize: 22, contact: C }),
      qr({ x: 830, y: 360, width: 150, height: 150, color: '#0B1120', backgroundColor: '#38BDF8' }),
    ],
  },
  back: {
    background: patternBackground('#0B1120', 'grid', '#38BDF8', 0.12),
    elements: [
      text('inter', {
        text: C.company, x: 125, y: 265, width: 800, height: 70,
        fontSize: 50, fontWeight: '700', color: '#38BDF8', align: 'center', letterSpacing: 6,
      }),
      shape({ x: 425, y: 355, width: 200, height: 4, shape: 'rect', color: '#F8FAFC', cornerRadius: 2 }),
    ],
  },
};

const circuitMono: CardTemplate = {
  id: 'circuit-mono',
  nameKey: 'circuitMono',
  category: 'modern',
  contact: C,
  front: {
    background: solidBackground('#F8FAFC'),
    elements: [
      shape({ x: 0, y: 0, width: CARD_WIDTH, height: 130, shape: 'rect', color: '#111827', cornerRadius: 0 }),
      text('roboto', {
        text: C.company, x: 60, y: 46, width: 600, height: 44,
        fontSize: 30, fontWeight: '700', color: '#FFFFFF', letterSpacing: 6,
      }),
      icon('code', { x: 930, y: 45, width: 46, height: 46, color: '#FFFFFF', strokeWidth: 2 }),
      text('roboto', {
        text: C.fullName, x: 60, y: 200, width: 580, height: 74,
        fontSize: 54, fontWeight: '700', color: '#111827',
      }),
      text('roboto', {
        text: C.jobTitle, x: 60, y: 276, width: 580, height: 40,
        fontSize: 26, fontWeight: '400', color: '#6B7280',
      }),
      ...contactLines({ font: 'roboto', color: '#374151', iconColor: '#111827', startY: 360, x: 60, fontSize: 22, contact: C }),
      qr({ x: 840, y: 330, width: 160, height: 160, color: '#111827', backgroundColor: '#FFFFFF' }),
    ],
  },
  back: {
    background: solidBackground('#111827'),
    elements: [
      text('roboto', {
        text: C.company, x: 125, y: 240, width: 800, height: 70,
        fontSize: 48, fontWeight: '700', color: '#FFFFFF', align: 'center', letterSpacing: 8,
      }),
      text('roboto', {
        text: C.website, x: 125, y: 330, width: 800, height: 40,
        fontSize: 24, fontWeight: '400', color: '#9CA3AF', align: 'center',
      }),
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Executive / Corporate
 * ------------------------------------------------------------------ */

const goldExecutive: CardTemplate = {
  id: 'gold-executive',
  nameKey: 'goldExecutive',
  category: 'executive',
  contact: C,
  front: {
    background: solidBackground('#0F0F0F'),
    elements: [
      shape({ x: 40, y: 40, width: CARD_WIDTH - 80, height: CARD_HEIGHT - 80, shape: 'rect', color: 'transparent', cornerRadius: 4 }),
      shape({ x: 40, y: 40, width: CARD_WIDTH - 80, height: 3, shape: 'rect', color: '#D4AF37', cornerRadius: 0 }),
      shape({ x: 40, y: CARD_HEIGHT - 43, width: CARD_WIDTH - 80, height: 3, shape: 'rect', color: '#D4AF37', cornerRadius: 0 }),
      text('playfair', {
        text: C.fullName, x: 125, y: 190, width: 800, height: 90,
        fontSize: 66, fontWeight: '700', color: '#F5F5F5', align: 'center',
      }),
      text('montserrat', {
        text: C.jobTitle, x: 125, y: 288, width: 800, height: 40,
        fontSize: 24, fontWeight: '400', color: '#D4AF37', align: 'center', letterSpacing: 6, uppercase: true,
      }),
      shape({ x: 465, y: 348, width: 120, height: 2, shape: 'rect', color: '#D4AF37', cornerRadius: 0 }),
      text('montserrat', {
        text: `${C.phone}   ·   ${C.email}`, x: 125, y: 400, width: 800, height: 36,
        fontSize: 22, fontWeight: '400', color: '#CBD5E1', align: 'center',
      }),
      text('montserrat', {
        text: C.website, x: 125, y: 444, width: 800, height: 36,
        fontSize: 22, fontWeight: '400', color: '#94A3B8', align: 'center',
      }),
    ],
  },
  back: {
    background: solidBackground('#D4AF37'),
    elements: [
      text('playfair', {
        text: C.company, x: 125, y: 245, width: 800, height: 84,
        fontSize: 60, fontWeight: '700', color: '#0F0F0F', align: 'center', letterSpacing: 6,
      }),
      text('montserrat', {
        text: 'ESTABLISHED EXCELLENCE', x: 125, y: 340, width: 800, height: 34,
        fontSize: 20, fontWeight: '400', color: '#3F3F3F', align: 'center', letterSpacing: 5,
      }),
    ],
  },
};

const navyBoardroom: CardTemplate = {
  id: 'navy-boardroom',
  nameKey: 'navyBoardroom',
  category: 'executive',
  contact: C,
  front: {
    background: solidBackground('#FFFFFF'),
    elements: [
      shape({ x: 0, y: 0, width: 360, height: CARD_HEIGHT, shape: 'rect', color: '#1E293B', cornerRadius: 0 }),
      icon('building', { x: 140, y: 190, width: 80, height: 80, color: '#FFFFFF', strokeWidth: 1.5 }),
      text('montserrat', {
        text: C.company, x: 40, y: 300, width: 280, height: 44,
        fontSize: 26, fontWeight: '700', color: '#FFFFFF', align: 'center', letterSpacing: 3,
      }),
      text('montserrat', {
        text: C.fullName, x: 420, y: 150, width: 570, height: 74,
        fontSize: 52, fontWeight: '700', color: '#1E293B',
      }),
      text('montserrat', {
        text: C.jobTitle, x: 420, y: 226, width: 570, height: 40,
        fontSize: 24, fontWeight: '400', color: '#64748B', letterSpacing: 2,
      }),
      shape({ x: 420, y: 290, width: 90, height: 4, shape: 'rect', color: '#1E293B', cornerRadius: 2 }),
      ...contactLines({ font: 'montserrat', color: '#334155', iconColor: '#1E293B', startY: 330, x: 420, fontSize: 22, width: 560, contact: C }),
    ],
  },
  back: {
    background: solidBackground('#1E293B'),
    elements: [
      text('montserrat', {
        text: C.company, x: 125, y: 250, width: 800, height: 74,
        fontSize: 50, fontWeight: '700', color: '#FFFFFF', align: 'center', letterSpacing: 6,
      }),
      qr({ x: 845, y: 400, width: 140, height: 140, color: '#1E293B', backgroundColor: '#FFFFFF' }),
      text('montserrat', {
        text: C.address, x: 65, y: 460, width: 700, height: 36,
        fontSize: 22, fontWeight: '400', color: '#94A3B8',
      }),
    ],
  },
};

const marbleChief: CardTemplate = {
  id: 'marble-chief',
  nameKey: 'marbleChief',
  category: 'executive',
  contact: C,
  front: {
    background: patternBackground('#F1F0EC', 'waves', '#B08D57', 0.18),
    elements: [
      text('playfair', {
        text: C.fullName, x: 70, y: 170, width: 700, height: 86,
        fontSize: 62, fontWeight: '700', color: '#2B2B2B',
      }),
      text('montserrat', {
        text: C.jobTitle, x: 72, y: 262, width: 700, height: 40,
        fontSize: 24, fontWeight: '400', color: '#B08D57', letterSpacing: 5, uppercase: true,
      }),
      shape({ x: 72, y: 326, width: 160, height: 3, shape: 'rect', color: '#B08D57', cornerRadius: 0 }),
      ...contactLines({ font: 'montserrat', color: '#4B4B4B', iconColor: '#B08D57', startY: 366, x: 72, fontSize: 22, contact: C }),
      shape({ x: 840, y: 80, width: 140, height: 140, shape: 'circle', color: '#B08D57' }),
      text('playfair', {
        text: 'N', x: 840, y: 112, width: 140, height: 80,
        fontSize: 68, fontWeight: '700', color: '#FFFFFF', align: 'center',
      }),
    ],
  },
  back: {
    background: patternBackground('#2B2B2B', 'waves', '#B08D57', 0.22),
    elements: [
      text('playfair', {
        text: C.company, x: 125, y: 255, width: 800, height: 80,
        fontSize: 54, fontWeight: '700', color: '#F1F0EC', align: 'center', letterSpacing: 5,
      }),
      text('montserrat', {
        text: C.website, x: 125, y: 345, width: 800, height: 36,
        fontSize: 22, fontWeight: '400', color: '#B08D57', align: 'center',
      }),
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Minimalist
 * ------------------------------------------------------------------ */

const pureMinimal: CardTemplate = {
  id: 'pure-minimal',
  nameKey: 'pureMinimal',
  category: 'minimalist',
  contact: C,
  front: {
    background: solidBackground('#FFFFFF'),
    elements: [
      text('inter', {
        text: C.fullName, x: 80, y: 200, width: 620, height: 74,
        fontSize: 52, fontWeight: '600', color: '#111111',
      }),
      text('inter', {
        text: C.jobTitle, x: 80, y: 276, width: 620, height: 38,
        fontSize: 24, fontWeight: '400', color: '#8A8A8A',
      }),
      text('inter', {
        text: `${C.phone}\n${C.email}\n${C.website}`, x: 80, y: 360, width: 620, height: 130,
        fontSize: 21, fontWeight: '400', color: '#555555', lineHeight: 1.6,
      }),
      shape({ x: 900, y: 80, width: 70, height: 70, shape: 'circle', color: '#111111' }),
    ],
  },
  back: {
    background: solidBackground('#111111'),
    elements: [
      text('inter', {
        text: C.company, x: 125, y: 275, width: 800, height: 60,
        fontSize: 38, fontWeight: '600', color: '#FFFFFF', align: 'center', letterSpacing: 10,
      }),
    ],
  },
};

const lineMinimal: CardTemplate = {
  id: 'line-minimal',
  nameKey: 'lineMinimal',
  category: 'minimalist',
  contact: C,
  front: {
    background: solidBackground('#FAFAF9'),
    elements: [
      shape({ x: 80, y: 80, width: 2, height: CARD_HEIGHT - 160, shape: 'rect', color: '#D6D3D1', cornerRadius: 0 }),
      text('montserrat', {
        text: C.fullName, x: 130, y: 190, width: 620, height: 70,
        fontSize: 48, fontWeight: '400', color: '#1C1917', letterSpacing: 2,
      }),
      text('montserrat', {
        text: C.jobTitle, x: 130, y: 264, width: 620, height: 38,
        fontSize: 22, fontWeight: '400', color: '#78716C', letterSpacing: 4, uppercase: true,
      }),
      ...contactLines({
        font: 'montserrat', color: '#57534E', startY: 350, x: 130,
        fontSize: 20, withIcons: false, lineHeight: 42, contact: C,
      }),
      text('montserrat', {
        text: C.company, x: 700, y: 470, width: 280, height: 36,
        fontSize: 20, fontWeight: '600', color: '#1C1917', align: 'right', letterSpacing: 4,
      }),
    ],
  },
  back: {
    background: solidBackground('#FAFAF9'),
    elements: [
      shape({ x: 385, y: 230, width: 280, height: 2, shape: 'rect', color: '#D6D3D1', cornerRadius: 0 }),
      text('montserrat', {
        text: C.company, x: 125, y: 265, width: 800, height: 60,
        fontSize: 34, fontWeight: '600', color: '#1C1917', align: 'center', letterSpacing: 8,
      }),
      shape({ x: 385, y: 360, width: 280, height: 2, shape: 'rect', color: '#D6D3D1', cornerRadius: 0 }),
    ],
  },
};

const softStone: CardTemplate = {
  id: 'soft-stone',
  nameKey: 'softStone',
  category: 'minimalist',
  contact: C,
  front: {
    background: solidBackground('#E7E5E4'),
    elements: [
      shape({ x: 60, y: 60, width: CARD_WIDTH - 120, height: CARD_HEIGHT - 120, shape: 'rect', color: '#FFFFFF', cornerRadius: 28 }),
      text('poppins', {
        text: C.fullName, x: 110, y: 180, width: 600, height: 72,
        fontSize: 48, fontWeight: '600', color: '#292524',
      }),
      text('poppins', {
        text: C.jobTitle, x: 110, y: 254, width: 600, height: 38,
        fontSize: 22, fontWeight: '400', color: '#A8A29E',
      }),
      ...contactLines({ font: 'poppins', color: '#44403C', iconColor: '#A8A29E', startY: 330, x: 110, fontSize: 20, lineHeight: 46, contact: C }),
      qr({ x: 790, y: 330, width: 150, height: 150, color: '#292524', backgroundColor: '#FFFFFF' }),
    ],
  },
  back: {
    background: solidBackground('#292524'),
    elements: [
      text('poppins', {
        text: C.company, x: 125, y: 270, width: 800, height: 60,
        fontSize: 40, fontWeight: '600', color: '#E7E5E4', align: 'center', letterSpacing: 6,
      }),
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Creative / Design
 * ------------------------------------------------------------------ */

const colorSplash: CardTemplate = {
  id: 'color-splash',
  nameKey: 'colorSplash',
  category: 'creative',
  contact: C,
  front: {
    background: solidBackground('#FFFFFF'),
    elements: [
      shape({ x: -120, y: -140, width: 420, height: 420, shape: 'circle', color: '#F43F5E', gradient: { colors: ['#F43F5E', '#F59E0B'], angle: 140 } }),
      shape({ x: 830, y: 400, width: 320, height: 320, shape: 'circle', color: '#6366F1', gradient: { colors: ['#6366F1', '#22D3EE'], angle: 120 } }),
      text('poppins', {
        text: C.fullName, x: 80, y: 250, width: 640, height: 80,
        fontSize: 56, fontWeight: '700', color: '#18181B',
      }),
      text('poppins', {
        text: C.jobTitle, x: 80, y: 330, width: 640, height: 40,
        fontSize: 24, fontWeight: '400', color: '#F43F5E', letterSpacing: 3, uppercase: true,
      }),
      ...contactLines({ font: 'poppins', color: '#3F3F46', iconColor: '#6366F1', startY: 396, x: 80, fontSize: 20, lineHeight: 44, contact: C }),
    ],
  },
  back: {
    background: gradientBackground({ colors: ['#F43F5E', '#6366F1'], angle: 135 }),
    elements: [
      text('poppins', {
        text: C.company, x: 125, y: 240, width: 800, height: 80,
        fontSize: 56, fontWeight: '700', color: '#FFFFFF', align: 'center',
      }),
      text('poppins', {
        text: 'MAKE IT MEMORABLE', x: 125, y: 330, width: 800, height: 36,
        fontSize: 22, fontWeight: '400', color: '#FFE4E6', align: 'center', letterSpacing: 6,
      }),
    ],
  },
};

const studioBold: CardTemplate = {
  id: 'studio-bold',
  nameKey: 'studioBold',
  category: 'creative',
  contact: C,
  front: {
    background: solidBackground('#FACC15'),
    elements: [
      shape({ x: 0, y: 330, width: CARD_WIDTH, height: 270, shape: 'rect', color: '#18181B', cornerRadius: 0 }),
      text('montserrat', {
        text: C.fullName, x: 70, y: 120, width: 700, height: 96,
        fontSize: 72, fontWeight: '700', color: '#18181B', uppercase: true, letterSpacing: -1,
      }),
      text('montserrat', {
        text: C.jobTitle, x: 72, y: 232, width: 700, height: 44,
        fontSize: 26, fontWeight: '600', color: '#3F3F46', letterSpacing: 4, uppercase: true,
      }),
      ...contactLines({ font: 'montserrat', color: '#FAFAFA', iconColor: '#FACC15', startY: 370, x: 70, fontSize: 21, lineHeight: 46, width: 620, contact: C }),
      qr({ x: 820, y: 380, width: 150, height: 150, color: '#18181B', backgroundColor: '#FACC15' }),
    ],
  },
  back: {
    background: solidBackground('#18181B'),
    elements: [
      text('montserrat', {
        text: C.company, x: 125, y: 235, width: 800, height: 90,
        fontSize: 64, fontWeight: '700', color: '#FACC15', align: 'center', uppercase: true,
      }),
      shape({ x: 425, y: 350, width: 200, height: 8, shape: 'rect', color: '#FAFAFA', cornerRadius: 4 }),
    ],
  },
};

const gradientWave: CardTemplate = {
  id: 'gradient-wave',
  nameKey: 'gradientWave',
  category: 'creative',
  contact: C,
  front: {
    background: gradientBackground({ colors: ['#7C3AED', '#EC4899', '#F59E0B'], angle: 120 }),
    elements: [
      shape({ x: 60, y: 60, width: CARD_WIDTH - 120, height: CARD_HEIGHT - 120, shape: 'rect', color: '#FFFFFF', cornerRadius: 24, opacity: 0.94 }),
      text('playfair', {
        text: C.fullName, x: 110, y: 170, width: 600, height: 84,
        fontSize: 58, fontWeight: '700', color: '#3B0764',
      }),
      text('poppins', {
        text: C.jobTitle, x: 112, y: 258, width: 600, height: 40,
        fontSize: 23, fontWeight: '400', color: '#A21CAF', letterSpacing: 3, uppercase: true,
      }),
      ...contactLines({ font: 'poppins', color: '#52525B', iconColor: '#A21CAF', startY: 330, x: 112, fontSize: 20, lineHeight: 44, contact: C }),
      qr({ x: 790, y: 330, width: 150, height: 150, color: '#3B0764', backgroundColor: '#FFFFFF' }),
    ],
  },
  back: {
    background: gradientBackground({ colors: ['#F59E0B', '#EC4899', '#7C3AED'], angle: 300 }),
    elements: [
      text('playfair', {
        text: C.company, x: 125, y: 255, width: 800, height: 84,
        fontSize: 56, fontWeight: '700', color: '#FFFFFF', align: 'center',
      }),
      text('poppins', {
        text: C.website, x: 125, y: 350, width: 800, height: 36,
        fontSize: 22, fontWeight: '400', color: '#FDF4FF', align: 'center', letterSpacing: 2,
      }),
    ],
  },
};

/* ------------------------------------------------------------------ *
 * Classic
 * ------------------------------------------------------------------ */

const classicSerif: CardTemplate = {
  id: 'classic-serif',
  nameKey: 'classicSerif',
  category: 'classic',
  contact: C,
  front: {
    background: solidBackground('#FFFDF8'),
    elements: [
      text('playfair', {
        text: C.company, x: 125, y: 100, width: 800, height: 54,
        fontSize: 32, fontWeight: '400', color: '#7C2D12', align: 'center', letterSpacing: 8, uppercase: true,
      }),
      shape({ x: 445, y: 172, width: 160, height: 2, shape: 'rect', color: '#7C2D12', cornerRadius: 0 }),
      text('playfair', {
        text: C.fullName, x: 125, y: 215, width: 800, height: 86,
        fontSize: 60, fontWeight: '700', color: '#1C1917', align: 'center',
      }),
      text('playfair', {
        text: C.jobTitle, x: 125, y: 310, width: 800, height: 42,
        fontSize: 26, fontWeight: '400', color: '#78716C', align: 'center',
      }),
      text('montserrat', {
        text: `${C.phone}  ·  ${C.email}`, x: 125, y: 410, width: 800, height: 34,
        fontSize: 21, fontWeight: '400', color: '#44403C', align: 'center',
      }),
      text('montserrat', {
        text: C.address, x: 125, y: 450, width: 800, height: 34,
        fontSize: 21, fontWeight: '400', color: '#78716C', align: 'center',
      }),
    ],
  },
  back: {
    background: solidBackground('#7C2D12'),
    elements: [
      text('playfair', {
        text: C.company, x: 125, y: 250, width: 800, height: 80,
        fontSize: 52, fontWeight: '700', color: '#FFFDF8', align: 'center', letterSpacing: 6,
      }),
      text('montserrat', {
        text: C.website, x: 125, y: 345, width: 800, height: 34,
        fontSize: 21, fontWeight: '400', color: '#FED7AA', align: 'center',
      }),
    ],
  },
};

const heritageFrame: CardTemplate = {
  id: 'heritage-frame',
  nameKey: 'heritageFrame',
  category: 'classic',
  contact: C,
  front: {
    background: solidBackground('#F5F5F4'),
    elements: [
      shape({ x: 45, y: 45, width: CARD_WIDTH - 90, height: 4, shape: 'rect', color: '#1C1917', cornerRadius: 0 }),
      shape({ x: 45, y: CARD_HEIGHT - 49, width: CARD_WIDTH - 90, height: 4, shape: 'rect', color: '#1C1917', cornerRadius: 0 }),
      shape({ x: 45, y: 45, width: 4, height: CARD_HEIGHT - 90, shape: 'rect', color: '#1C1917', cornerRadius: 0 }),
      shape({ x: CARD_WIDTH - 49, y: 45, width: 4, height: CARD_HEIGHT - 90, shape: 'rect', color: '#1C1917', cornerRadius: 0 }),
      icon('crown', { x: 490, y: 95, width: 70, height: 70, color: '#1C1917', strokeWidth: 1.5 }),
      text('playfair', {
        text: C.fullName, x: 125, y: 200, width: 800, height: 84,
        fontSize: 56, fontWeight: '700', color: '#1C1917', align: 'center',
      }),
      text('montserrat', {
        text: C.jobTitle, x: 125, y: 292, width: 800, height: 38,
        fontSize: 22, fontWeight: '400', color: '#57534E', align: 'center', letterSpacing: 5, uppercase: true,
      }),
      text('montserrat', {
        text: `${C.phone}   ${C.email}`, x: 125, y: 420, width: 800, height: 34,
        fontSize: 20, fontWeight: '400', color: '#44403C', align: 'center',
      }),
    ],
  },
  back: {
    background: solidBackground('#1C1917'),
    elements: [
      icon('crown', { x: 490, y: 175, width: 70, height: 70, color: '#F5F5F4', strokeWidth: 1.5 }),
      text('playfair', {
        text: C.company, x: 125, y: 285, width: 800, height: 76,
        fontSize: 48, fontWeight: '700', color: '#F5F5F4', align: 'center', letterSpacing: 6,
      }),
    ],
  },
};

const emeraldClassic: CardTemplate = {
  id: 'emerald-classic',
  nameKey: 'emeraldClassic',
  category: 'classic',
  contact: C,
  front: {
    background: solidBackground('#064E3B'),
    elements: [
      shape({ x: 0, y: 0, width: CARD_WIDTH, height: 8, shape: 'rect', color: '#D4AF37', cornerRadius: 0 }),
      text('playfair', {
        text: C.fullName, x: 70, y: 180, width: 660, height: 84,
        fontSize: 56, fontWeight: '700', color: '#ECFDF5',
      }),
      text('montserrat', {
        text: C.jobTitle, x: 72, y: 272, width: 660, height: 38,
        fontSize: 22, fontWeight: '400', color: '#D4AF37', letterSpacing: 5, uppercase: true,
      }),
      ...contactLines({ font: 'montserrat', color: '#D1FAE5', iconColor: '#D4AF37', startY: 350, x: 72, fontSize: 21, lineHeight: 46, contact: C }),
      qr({ x: 810, y: 340, width: 160, height: 160, color: '#064E3B', backgroundColor: '#ECFDF5' }),
    ],
  },
  back: {
    background: solidBackground('#ECFDF5'),
    elements: [
      text('playfair', {
        text: C.company, x: 125, y: 255, width: 800, height: 80,
        fontSize: 52, fontWeight: '700', color: '#064E3B', align: 'center', letterSpacing: 5,
      }),
      shape({ x: 465, y: 355, width: 120, height: 3, shape: 'rect', color: '#D4AF37', cornerRadius: 0 }),
      text('montserrat', {
        text: C.website, x: 125, y: 385, width: 800, height: 34,
        fontSize: 21, fontWeight: '400', color: '#047857', align: 'center',
      }),
    ],
  },
};

export const TEMPLATES: CardTemplate[] = [
  auroraTech,
  neonGrid,
  circuitMono,
  goldExecutive,
  navyBoardroom,
  marbleChief,
  pureMinimal,
  lineMinimal,
  softStone,
  colorSplash,
  studioBold,
  gradientWave,
  classicSerif,
  heritageFrame,
  emeraldClassic,
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'modern',
  'executive',
  'minimalist',
  'creative',
  'classic',
];

export function templatesByCategory(
  category: TemplateCategory | 'all',
): CardTemplate[] {
  if (category === 'all') return TEMPLATES;
  return TEMPLATES.filter((template) => template.category === category);
}

export function findTemplate(id: string): CardTemplate | undefined {
  return TEMPLATES.find((template) => template.id === id);
}
