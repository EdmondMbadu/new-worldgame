// Cloud Function for the live guessing game at /unmet/play.
//
// playLeadCreated: when a player leaves their email at the end of a game
// (a document in playLeads, written from the browser under firestore.rules),
// send them one message with their result and a sign-up link that has their
// name filled in.
//
// Players are not signed in, so anything in the document is treated as
// untrusted: it is re-validated, the score is taken from the room itself
// when the room can be read, the message is a fixed template, and one
// address is written to at most once a day.
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as sgMail from '@sendgrid/mail';
import { buildLeadEmail, safeName, validLead, type PlayLead, type PlaySettings } from './play-core';

const FROM = { email: 'newworld@newworld-game.org', name: 'Global Solutions Lab' };
const ONE_DAY = 24 * 60 * 60 * 1000;

/** What the room itself says about this player, or null when it cannot vouch for them. */
async function fromRoom(lead: PlayLead): Promise<Partial<PlayLead> | null | 'unknown'> {
  if (lead.room.startsWith('SOLO')) return {};
  let pub: any;
  try {
    pub = (await admin.database().ref(`play/rooms/${lead.room}/pub`).get()).val();
  } catch (error) {
    functions.logger.warn('playLeadCreated: could not read the room', { room: lead.room, error: String(error) });
    return 'unknown';
  }
  const player = pub?.players?.[lead.pid];
  if (!pub || !player || pub.state?.phase !== 'final') return null;
  const scores = pub.scores || {};
  const mine = scores[lead.pid];
  return {
    name: safeName(player.name),
    score: Number(mine?.s) || 0,
    rank: Number(mine?.r) || 0,
    of: Object.keys(scores).length,
  };
}

export const playLeadCreated = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB', maxInstances: 5 })
  .firestore.document('playLeads/{leadId}')
  .onCreate(async (snap) => {
    const raw = snap.data() as Partial<PlayLead>;
    const mark = (status: string) => snap.ref.set({ status, handledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    if (!validLead(raw)) return mark('skipped-invalid');
    const lead: PlayLead = { ...raw, email: raw.email.trim() };

    // One message per address per day, however many rooms or devices ask.
    const earlier = await admin.firestore().collection('playLeads').where('email', '==', lead.email).limit(20).get();
    const since = Date.now() - ONE_DAY;
    const already = earlier.docs.some((d) => d.id !== snap.id && d.get('status') === 'sent' && (d.get('handledAt')?.toMillis?.() || 0) > since);
    if (already) return mark('skipped-recent');

    const room = await fromRoom(lead);
    if (room === null) return mark('skipped-not-in-room');
    if (room !== 'unknown') Object.assign(lead, room);
    lead.name = safeName(lead.name);

    let settings: PlaySettings = {};
    try {
      settings = ((await admin.firestore().doc('playSettings/main').get()).data() as PlaySettings) || {};
    } catch {
      /* the defaults are fine */
    }
    const message = buildLeadEmail(lead, settings);
    try {
      await sgMail.send({ to: lead.email, from: FROM, subject: message.subject, text: message.text, html: message.html });
    } catch (error) {
      functions.logger.error('playLeadCreated: send failed', { leadId: snap.id, error: String(error) });
      return mark('failed');
    }
    return mark('sent');
  });
