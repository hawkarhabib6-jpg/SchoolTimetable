import type { CardContact } from '@/types/card';

function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
}

/** RFC 6350 vCard 3.0 — the format every phone contact app can import. */
export function buildVCard(contact: CardContact): string {
  const nameParts = contact.fullName.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : contact.fullName;

  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${escape(lastName)};${escape(firstName)};;;`);
  if (contact.fullName.trim()) lines.push(`FN:${escape(contact.fullName)}`);
  if (contact.company.trim()) lines.push(`ORG:${escape(contact.company)}`);
  if (contact.jobTitle.trim()) lines.push(`TITLE:${escape(contact.jobTitle)}`);
  if (contact.phone.trim()) lines.push(`TEL;TYPE=CELL:${escape(contact.phone)}`);
  if (contact.altPhone.trim()) lines.push(`TEL;TYPE=WORK:${escape(contact.altPhone)}`);
  if (contact.email.trim()) lines.push(`EMAIL;TYPE=INTERNET:${escape(contact.email)}`);
  if (contact.website.trim()) lines.push(`URL:${escape(contact.website)}`);
  if (contact.address.trim()) lines.push(`ADR;TYPE=WORK:;;${escape(contact.address)};;;;`);
  if (contact.note.trim()) lines.push(`NOTE:${escape(contact.note)}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

/** Non-empty vCard payload for a QR code, with a readable fallback. */
export function vcardQrValue(contact: CardContact): string {
  const hasAnything = Object.values(contact).some((value) => value.trim().length > 0);
  return hasAnything ? buildVCard(contact) : 'BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Business Card\r\nEND:VCARD';
}

export function safeFileName(value: string, fallback = 'business-card'): string {
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}\-_ ]/gu, '')
    .replace(/\s+/g, '-')
    .slice(0, 48);
  return cleaned.length ? cleaned : fallback;
}
