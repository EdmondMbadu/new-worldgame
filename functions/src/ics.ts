// lib/ics.ts
import { randomUUID } from 'crypto';

/** Helper – turn a JS Date into the YYYYMMDDTHHMMSSZ format */
const toICS = (d: Date) =>
  d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

/** Builds a 30-min Global Solutions Lab invite */
export function buildICS(
  startUTC: Date, // workshop start, already in UTC
  name: string,
  email: string,
  meetingLink: string,
  summary = 'Global Solutions Lab Workshop',
  description = 'Live hands-on workshop with the Global Solutions Lab team'
) {
  const endUTC = new Date(startUTC.getTime() + 30 * 60_000);
  const uid = randomUUID();

  return `
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Global Solutions Lab//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${toICS(new Date())}
DTSTART:${toICS(startUTC)}
DTEND:${toICS(endUTC)}
SUMMARY:${summary}
DESCRIPTION:${description} - ${meetingLink}
LOCATION:${meetingLink}
ORGANIZER;CN=Global Solutions Lab Team:MAILTO:newworld@newworld-game.org
ATTENDEE;CN=${name};RSVP=TRUE:MAILTO:${email}
END:VEVENT
END:VCALENDAR`.trim();
}
