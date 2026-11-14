// Minimal RFC 5545 builder (no dependency). Origin: Debs Hair & Beauty.
import { createHmac } from 'node:crypto';
import { SALON, SITE_URL } from '@/config/salon';

export type IcsEvent = { uid: string; start: Date; end: Date; summary: string; description?: string };

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const fold = (line: string) => line.length <= 73 ? line : line.match(/.{1,73}/g)!.join('\r\n ');
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const host = new URL(SITE_URL).host;

export function buildIcs(name: string, events: IcsEvent[]): string {
  const location = `${SALON.address.street}, ${SALON.address.postalCode} ${SALON.address.city}`;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//Robust Code//${SALON.name}//FR`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(name)}`, 'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    ...events.flatMap((e) => [
      'BEGIN:VEVENT', `UID:${e.uid}@${host}`, `DTSTAMP:${utc(new Date())}`, `DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end)}`,
      `SUMMARY:${esc(e.summary)}`, ...(e.description ? [`DESCRIPTION:${esc(e.description)}`] : []),
      `LOCATION:${esc(location)}`, 'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Private, unguessable token for a barber's calendar feed (no DB column needed). */
export function feedToken(staffId: string): string {
  const secret = process.env.AUTH_JWT_SECRET ?? 'dev-only-secret-change-me-dev-only-secret';
  return createHmac('sha256', secret).update(`feed:${staffId}`).digest('hex').slice(0, 32);
}
