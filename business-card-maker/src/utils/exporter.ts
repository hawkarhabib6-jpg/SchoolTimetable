import type { RefObject } from 'react';
import type { View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { CARD_HEIGHT, CARD_WIDTH } from '@/types/card';
import { buildVCard, safeFileName } from './vcard';
import type { CardContact } from '@/types/card';

export type ImageFormat = 'png' | 'jpg';
export type SideSelection = 'both' | 'front' | 'back';

const CARD_WIDTH_IN = 3.5;
const CARD_HEIGHT_IN = 2;
/** 3 mm expressed in inches, added on every edge when bleed is requested. */
const BLEED_IN = 0.118;

function outputDirectory(): string {
  return FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
}

async function ensureUniquePath(name: string, extension: string): Promise<string> {
  const base = `${outputDirectory()}${name}`;
  let candidate = `${base}.${extension}`;
  let counter = 1;
  // Never silently overwrite a previous export.
  while ((await FileSystem.getInfoAsync(candidate)).exists) {
    candidate = `${base}-${counter}.${extension}`;
    counter += 1;
  }
  return candidate;
}

/** Captures one off-screen card view at exactly 1050 × 600 px (300 DPI). */
export async function captureSide(
  ref: RefObject<View | null>,
  format: ImageFormat,
  quality = 1,
): Promise<string> {
  if (!ref.current) throw new Error('Card view is not mounted yet');
  return captureRef(ref, {
    format,
    quality,
    result: 'tmpfile',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
}

async function captureBase64(
  ref: RefObject<View | null>,
  format: ImageFormat,
  quality = 1,
): Promise<string> {
  if (!ref.current) throw new Error('Card view is not mounted yet');
  return captureRef(ref, {
    format,
    quality,
    result: 'base64',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  });
}

export interface ExportResult {
  uri: string;
  fileName: string;
}

/** Exports a single side as PNG or JPEG and returns the saved file. */
export async function exportImage(
  ref: RefObject<View | null>,
  cardName: string,
  suffix: string,
  format: ImageFormat,
  quality = 1,
): Promise<ExportResult> {
  const temporary = await captureSide(ref, format, quality);
  const fileName = `${safeFileName(cardName)}-${suffix}`;
  const target = await ensureUniquePath(fileName, format);
  await FileSystem.copyAsync({ from: temporary, to: target });
  return { uri: target, fileName: target.split('/').pop() ?? fileName };
}

/**
 * Builds a print-ready PDF. Page size matches the card exactly, so no printer
 * scaling is applied; with bleed, 3 mm is added on every edge.
 */
export async function exportPdf(
  frontRef: RefObject<View | null>,
  backRef: RefObject<View | null>,
  cardName: string,
  sides: SideSelection,
  withBleed: boolean,
): Promise<ExportResult> {
  const pages: string[] = [];

  if (sides === 'both' || sides === 'front') {
    pages.push(await captureBase64(frontRef, 'png'));
  }
  if (sides === 'both' || sides === 'back') {
    pages.push(await captureBase64(backRef, 'png'));
  }

  const pageWidth = CARD_WIDTH_IN + (withBleed ? BLEED_IN * 2 : 0);
  const pageHeight = CARD_HEIGHT_IN + (withBleed ? BLEED_IN * 2 : 0);
  const margin = withBleed ? BLEED_IN : 0;

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: ${pageWidth}in ${pageHeight}in; margin: 0; }
      html, body { margin: 0; padding: 0; background: #ffffff; }
      .page {
        width: ${pageWidth}in;
        height: ${pageHeight}in;
        display: flex;
        align-items: center;
        justify-content: center;
        page-break-after: always;
        box-sizing: border-box;
        padding: ${margin}in;
      }
      .page:last-child { page-break-after: auto; }
      img { width: ${CARD_WIDTH_IN}in; height: ${CARD_HEIGHT_IN}in; display: block; }
    </style>
  </head>
  <body>
    ${pages
      .map((data) => `<div class="page"><img src="data:image/png;base64,${data}" /></div>`)
      .join('\n')}
  </body>
</html>`;

  const { uri } = await Print.printToFileAsync({
    html,
    width: pageWidth * 72,
    height: pageHeight * 72,
    base64: false,
  });

  const target = await ensureUniquePath(safeFileName(cardName), 'pdf');
  await FileSystem.copyAsync({ from: uri, to: target });
  return { uri: target, fileName: target.split('/').pop() ?? `${cardName}.pdf` };
}

/** Writes the contact as a .vcf file that any phone can import. */
export async function exportVCard(
  contact: CardContact,
  cardName: string,
): Promise<ExportResult> {
  const target = await ensureUniquePath(safeFileName(cardName), 'vcf');
  await FileSystem.writeAsStringAsync(target, buildVCard(contact), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { uri: target, fileName: target.split('/').pop() ?? `${cardName}.vcf` };
}

export async function shareFile(uri: string, mimeType: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType, UTI: mimeType });
  return true;
}

export function mimeTypeFor(kind: 'png' | 'jpg' | 'pdf' | 'vcf'): string {
  switch (kind) {
    case 'png':
      return 'image/png';
    case 'jpg':
      return 'image/jpeg';
    case 'pdf':
      return 'application/pdf';
    case 'vcf':
      return 'text/vcard';
    default:
      return 'application/octet-stream';
  }
}

export { CARD_WIDTH, CARD_HEIGHT };
