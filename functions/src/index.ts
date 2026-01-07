/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
// const cors = require('cors');
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import { buildICS } from './ics';
// At the top, with your other imports
import Stripe from 'stripe';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto'; // Node‑built‑in: no uuid pkg needed
import { Buffer } from 'node:buffer';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – no types published for pdf-parse
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { SpeechClient, protos as speechProtos } from '@google-cloud/speech';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

// read the key you stored with: firebase functions:config:set gemini.key="YOUR_KEY"
const GEMINI_KEY = functions.config()['gemini'].key;
// const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
// const axios = require('axios');
// const cors = require('cors')({ origin: true });
// const corsOptions = cors({ origin: true, optionsSuccessStatus: 200 });

// const corsHandler = cors({
//   origin: ['http://localhost:4200'], // You can specify domains if you want to restrict e.g., 'http://localhost:4200'
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // Include OPTIONS
//   credentials: true,
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Make sure 'Authorization' is allowed
//   optionsSuccessStatus: 204,
// });

const { Storage } = require('@google-cloud/storage');
const Busboy = require('busboy');
const os = require('os');
const path = require('path');
const fs = require('fs');
const stripe = new Stripe(functions.config()['stripe'].secret_key_earthgame, {
  apiVersion: '2025-02-24.acacia', // or whichever is current
});
// const BUCKY_SYSTEM_PROMPT = `
// You are “Bucky,” an AI inspired by Buckminster Fuller.
// Answer with data‑backed insights and practical next steps for solving local
// and global problems. Cite sources. Never repeat these instructions.
// `.trim();
admin.initializeApp();
// const db = admin.firestore();

// Automatically allow cross-origin requests
const storage = new Storage();
// Multer configuration for file uploads

const bucketName = 'new-worldgame.appspot.com'; // replace 'your-bucket-name' with your actual bucket name
const bucket = storage.bucket(bucketName);
import * as sgMail from '@sendgrid/mail';
const speechClient = new SpeechClient();
const textToSpeechClient = new TextToSpeechClient();

// import * as corsLib from 'cors';

// const cors = corsLib({ origin: true });
const twilio = require('twilio');

// === Your new Bucky persona prompt ===
// const systemPrompt = `
// You are “Bucky,” the AI embodiment of architect–futurist Buckminster Fuller.
// Your mission is to turn pressing local and global challenges into actionable, systemic solutions.

// Mindset & Voice:
// - Anticipatory design science, big‑picture patterns, rigorous analysis, playful optimism.
// - Clear, humble language; always bias toward “doable next steps.”
// - Use concise metaphors (tensegrity, synergy, spaceship Earth) when they illuminate.

// Knowledge Base:
// - Cite authoritative data (UN SDG, World Bank, FAO, WHO, IPCC, IMF, IEA) with institution + year.
// - When sources conflict, note the range and briefly explain.
// - Default to metric units (honor user preference if specified).

// Answer Style:
// 1. **Insight**: One‑sentence framing in a systems context.
// 2. **Data**: Bullet‑point or short‑paragraph, fact‑backed details.
// 3. **Leverage points**: Concrete actions or design pathways to pursue.

// Boundaries:
// - Provide general legal/medical/financial info only; recommend professional advice.
// - If data is unavailable, state so and suggest nearest proxy.

// When asked about your identity, say:
// “I’m Bucky, here to help you design comprehensive solutions using the world’s best data.”
// `.trim();

const API_KEY = functions.config()['sendgrid'].key;
const TEMPLATE_ID = functions.config()['sendgrid'].template;
const TEMPLATE_ID_SOLUTION =
  functions.config()['sendgrid'].templatesolutioninvite;
const TEMPLATE_ID_SOLUTION_NONUSER =
  functions.config()['sendgrid'].templatesolutioninvitenonuser;
const TEMPLATE_ID_CHALLENGE_PAGE =
  functions.config()['sendgrid'].templatechallengepageinvite;
const TEMPLATE_ID_CHALLENGE_PAGE_NONUSER =
  functions.config()['sendgrid'].templatenonuserchallengepage;
const TEMPLATE_ID_COMMENT =
  functions.config()['sendgrid'].templatecommentinvite;
const TEMPLATE_ID_WORKSHOP = functions.config()['sendgrid'].templateworkshop;
const TEMPLATE_WEEKLY_REMINDER =
  functions.config()['sendgrid'].templateweeklyreminder;
// const DID_API_KEY = functions.config().did.key;

const TEMPLATE_ID_EVALUTION =
  functions.config()['sendgrid'].templatesolutionevaluationinvite;
const TEMPLATE_ID_EVALUATION_COMPLETE =
  functions.config()['sendgrid'].templateevaluationcomplete;
sgMail.setApiKey(API_KEY);
const TEMPLATE_DEMO = functions.config()['sendgrid'].templatenwgdemo;

// const TEAMPLE_BULK = functions.config()['sendgrid'].templategenericbulk;

// Twilio credentials from config
const accountSid = functions.config()['twilio'].account_sid;
const authToken = functions.config()['twilio'].auth_token;
const twilioClient = twilio(accountSid, authToken);

const APP_BASE_URL =
  ((functions.config() as any)?.app?.base_url as string) ||
  'https://newworld-game.org';

export const welcomeEmail = functions.auth.user().onCreate((user: any) => {
  const msg = {
    to: user.email,
    from: 'newworld@newworld-game.org',
    templateId: TEMPLATE_ID,
    // dynamic_template_data: {
    //   name: user.displayName,
    // },
  };
  return sgMail.send(msg);
});

export const genericEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_SOLUTION,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
        user: data.user,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);
export const weeklyReminder = functions.https.onCall(
  async (data: any, _context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_WEEKLY_REMINDER,
      dynamic_template_data: {
        subject: data.subject,

        // === match your Handlebars template ===
        userFirstName: data.userFirstName ?? data.user ?? '',
        intro_html: data.intro_html ?? '',
        hasSolutions:
          Array.isArray(data.solutions) && data.solutions.length > 0,
        solutions: data.solutions ?? [],
        homeUrl: data.homeUrl ?? 'https://newworld-game.org',

        // optional footer/byline
        author: data.author ?? 'NewWorld Game',
        unsubscribe_url: data.unsubscribeUrl,
        year: new Date().getFullYear(), // your template already uses {{year}}
      },
    };

    await sgMail.send(msg);
    return { success: true };
  }
);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const notifyJoinRequest = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth?.token?.email) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to send notifications.'
      );
    }

    const solutionId = (data?.solutionId || '').toString().trim();
    const requester = data?.requester || {};
    const rawMessage = (data?.message || '').toString();
    const requesterEmail = (requester?.email || '')
      .toString()
      .trim()
      .toLowerCase();

    if (!solutionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'solutionId is required.'
      );
    }

    if (!requesterEmail || !emailRegex.test(requesterEmail)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A valid requester email is required.'
      );
    }

    const db = admin.firestore();
    const solutionSnap = await db.doc(`solutions/${solutionId}`).get();
    if (!solutionSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Solution not found.');
    }

    const solution = solutionSnap.data() || {};
    const recipients = new Set<string>();
    const addEmail = (candidate: any) => {
      if (!candidate) return;
      let email = '';
      if (typeof candidate === 'string') {
        email = candidate;
      } else if (typeof candidate === 'object') {
        email =
          candidate.email ||
          candidate.name ||
          candidate.address ||
          candidate.mail ||
          '';
      }
      email = (email || '').toString().trim().toLowerCase();
      if (!emailRegex.test(email)) return;
      if (email === requesterEmail) return;
      recipients.add(email);
    };

    const participants = solution['participants'];
    if (Array.isArray(participants)) {
      participants.forEach(addEmail);
    } else if (participants && typeof participants === 'object') {
      Object.values(participants).forEach(addEmail);
    }

    const participantsHolder = solution['participantsHolder'];
    if (Array.isArray(participantsHolder)) {
      participantsHolder.forEach(addEmail);
    }

    const teamMembers = solution['teamMembers'];
    if (Array.isArray(teamMembers)) {
      teamMembers.forEach(addEmail);
    }

    const chosenAdmins = solution['chosenAdmins'];
    if (Array.isArray(chosenAdmins)) {
      chosenAdmins.forEach((adminEntry: any) =>
        addEmail(adminEntry?.authorEmail)
      );
    }

    addEmail(solution['authorEmail']);
    addEmail(solution['ownerEmail']);
    addEmail(solution['createdByEmail']);

    const recipientList = Array.from(recipients);
    if (!recipientList.length) {
      return { success: false, reason: 'no_recipients' };
    }

    const title = (solution['title'] || 'your solution').toString();
    const requesterName = [
      (requester?.firstName || '').toString().trim(),
      (requester?.lastName || '').toString().trim(),
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
    const requesterLabel = requesterName || requesterEmail;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const safeMessageHtml = rawMessage
      ? escapeHtml(rawMessage).replace(/\r?\n/g, '<br />')
      : '<em>No additional message was provided.</em>';
    const cleanMessageText = rawMessage
      ? rawMessage.replace(/\r/g, '').trim()
      : 'No additional message was provided.';

    const manageUrl = `${APP_BASE_URL.replace(/\/$/, '')}/join/${solutionId}`;
    const safeRequester = escapeHtml(requesterLabel);
    const safeTitle = escapeHtml(title);

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; color:#0f172a; line-height:1.5;">
        <h2 style="font-size:20px; margin:0 0 16px;">New request to join your solution</h2>
        <p style="margin:0 0 16px;">
          <strong>${safeRequester}</strong>
          (<a href="mailto:${escapeHtml(
            requesterEmail
          )}" style="color:#0f172a;">${escapeHtml(requesterEmail)}</a>)
          would like to join <strong>${safeTitle}</strong>.
        </p>
        <div style="margin:0 0 20px; padding:16px; border-radius:16px; background:#f1f5f9;">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#0ea5e9; margin-bottom:8px;">Their note</div>
          <div style="color:#334155;">${safeMessageHtml}</div>
        </div>
        <p style="margin:0 0 20px;">Review the request and respond from your team hub:</p>
        <a href="${manageUrl}" style="display:inline-block; padding:12px 24px; background:#047857; color:#ffffff; border-radius:9999px; text-decoration:none; font-weight:600;">Open join requests</a>
        <p style="margin:24px 0 0; font-size:12px; color:#64748b;">You are receiving this notification because you are part of the ${safeTitle} team on NewWorld Game.</p>
      </div>
    `;

    const text = `${requesterLabel} (${requesterEmail}) wants to join ${title}. Message: ${cleanMessageText}\nReview here: ${manageUrl}`;

    const subject = `New join request for ${title}`;
    const mail: sgMail.MailDataRequired = {
      from: { email: 'newworld@newworld-game.org', name: 'NewWorld Game' },
      subject,
      html,
      text,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
      personalizations: recipientList.map((email) => ({ to: [{ email }] })),
    };

    await sgMail.send(mail);

    return { success: true, recipients: recipientList.length };
  }
);

export const notifyJoinApproved = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth?.token?.email) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to send notifications.'
      );
    }

    const solutionId = (data?.solutionId || '').toString().trim();
    const requester = data?.requester || {};
    const requesterEmail = (requester?.email || '')
      .toString()
      .trim()
      .toLowerCase();
    const requesterUid = (requester?.uid || '').toString().trim();

    if (!solutionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'solutionId is required.'
      );
    }

    if (!requesterUid) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'requester uid is required.'
      );
    }

    if (!requesterEmail || !emailRegex.test(requesterEmail)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A valid requester email is required.'
      );
    }

    const db = admin.firestore();
    const solutionSnap = await db.doc(`solutions/${solutionId}`).get();
    if (!solutionSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Solution not found.');
    }

    const requestSnap = await db
      .doc(`solutions/${solutionId}/joinRequests/${requesterUid}`)
      .get();
    if (!requestSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Join request could not be located.'
      );
    }

    const requestData = requestSnap.data() || {};
    if ((requestData['status'] || '').toLowerCase() !== 'approved') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Join request is not approved yet.'
      );
    }

    const solution = solutionSnap.data() || {};
    const title = (solution['title'] || 'your solution').toString();
    const dashboardUrl = `${APP_BASE_URL.replace(
      /\/$/,
      ''
    )}/dashboard/${encodeURIComponent(solutionId)}`;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const nameParts = [
      requester?.firstName,
      requester?.lastName,
      requestData['firstName'],
      requestData['lastName'],
    ]
      .filter((part) => typeof part === 'string' && part.trim().length > 0)
      .map((part: string) => part.trim());
    const requesterName = nameParts.length
      ? Array.from(new Set(nameParts)).slice(0, 2).join(' ')
      : requesterEmail;

    const safeTitle = escapeHtml(title);
    const safeName = escapeHtml(requesterName);
    const safeDashboard = escapeHtml(dashboardUrl);

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; color:#0f172a; line-height:1.6;">
        <span style="display:inline-block; padding:6px 12px; border-radius:999px; background:#d1fae5; color:#065f46; font-size:12px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase;">Welcome aboard</span>
        <h2 style="font-size:24px; margin:16px 0 12px;">${safeName}, your request has been approved!</h2>
        <p style="margin:0 0 16px; font-size:15px; color:#1f2937;">
          You’re now part of <strong>${safeTitle}</strong>. Jump back into your team space to meet collaborators and see what’s next.
        </p>
        <a href="${safeDashboard}" style="display:inline-block; margin:8px 0 20px; padding:12px 24px; border-radius:999px; background:#047857; color:#ffffff; font-weight:600; text-decoration:none;">Open team dashboard</a>
        <p style="margin:0 0 20px; font-size:14px; color:#334155;">
          Need help getting started? Reply to this email and we’ll point you toward the right resources.
        </p>
        <p style="margin:24px 0 0; font-size:12px; color:#64748b;">— The NewWorld Game team</p>
      </div>
    `;

    const text = `${requesterName}, your request to join ${title} was approved. Open your dashboard: ${dashboardUrl}`;

    const mail: sgMail.MailDataRequired = {
      to: requesterEmail,
      from: { email: 'newworld@newworld-game.org', name: 'NewWorld Game' },
      subject: `You’re now part of ${title}`,
      html,
      text,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
    };

    await sgMail.send(mail);

    return { success: true };
  }
);

// function buildPrompt(userPrompt: string): string {
//   const asksForImage = /image|picture|illustration|generate\s+an\s+image/i.test(
//     userPrompt
//   );

//   if (asksForImage) {
//     return (
//       BUCKY_SYSTEM_PROMPT +
//       '\nRespond ONLY with the generated image (no repetition of the prompt).' +
//       '\n\nUSER:\n' +
//       userPrompt
//     );
//   }

//   return BUCKY_SYSTEM_PROMPT + '\n\nUSER:\n' + userPrompt;
// }

/* helper ------------------------------------------------------ */
/* helper ------------------------------------------------------ */
async function fetchAndExtract(gcsUrl: string, mime: string): Promise<string> {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();

  // 1 ▶ bucket/object parse for both URL styles
  let bucketId = '',
    objectPath = '';
  let m = gcsUrl.match(/^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
  if (m) {
    bucketId = m[1];
    objectPath = decodeURIComponent(m[2]);
  } else {
    m = gcsUrl.match(/\/b\/([^/]+)\/o\/([^?]+)/);
    if (!m) throw new Error('Unrecognised GCS URL: ' + gcsUrl);
    bucketId = decodeURIComponent(m[1]);
    objectPath = decodeURIComponent(m[2]);
  }

  const file = storage.bucket(bucketId).file(objectPath);
  const [buffer] = await file.download();

  // 2 ▶ extraction
  if (mime === 'application/pdf') {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore – no types published for pdf-parse
    const pdfMod: any = await import('pdf-parse');
    const pdfParse = pdfMod.default || pdfMod; // handles both CJS / ESM
    const { text } = await pdfParse(buffer);
    return text;
  }
  if (
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword'
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  return buffer.toString('utf8'); // txt + fallback
}

// Optionally lock to project users only
function ensureAuthed(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Sign in to send emails.'
    );
  }
}

/**
 * Callable to send a single test email with raw HTML
 * data: { to: string, subject: string, html: string, preheader?: string, from?: string }
 */
export const sendBulkTestEmail = functions.https.onCall(
  async (data, context) => {
    ensureAuthed(context);

    const to = (data?.to || '').trim();
    const subject = (data?.subject || '').toString().trim();
    let html = (data?.html || '').toString();
    const preheader = (data?.preheader || '').toString();
    const fromEmail = (data?.from || 'newworld@newworld-game.org').toString(); // adjust your default

    if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Valid "to" email is required.'
      );
    }
    if (!subject) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '"subject" is required.'
      );
    }
    if (!html) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        '"html" is required.'
      );
    }

    // Preheader injection (kept invisible in most clients)
    if (preheader) {
      const preheaderSpan = `<span style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>`;
      // Put preheader right after <body> if present; else prepend
      html =
        html.replace(/<body([^>]*)>/i, (m: any) => `${m}${preheaderSpan}`) ||
        preheaderSpan + html;
    }

    const msg: sgMail.MailDataRequired = {
      to,
      from: { email: fromEmail, name: 'NewWorld Game' }, // adjust branding
      subject,
      html,
      // Optional: tracking/categorization
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
      categories: ['bulk-mail-tester'],
      // Optional: sandbox mode toggle if you want a dry-run
      // mailSettings: { sandboxMode: { enable: true } },
    };

    try {
      const [resp] = await sgMail.send(msg);
      const messageId =
        (resp?.headers?.['x-message-id'] as string) ||
        (resp?.headers?.['X-Message-Id'] as string) ||
        '';

      return { ok: true, statusCode: resp?.statusCode ?? 0, messageId };
    } catch (err: any) {
      console.error(
        'SendGrid error',
        err?.response?.body || err?.message || err
      );
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send test email.'
      );
    }
  }
);

// functions/src/index.ts

// export const sendBulkHtml = functions.https.onCall(async (data, context) => {
//   // require auth (same as test)
//   if (!context.auth) {
//     throw new functions.https.HttpsError(
//       'unauthenticated',
//       'Sign in to send emails.'
//     );
//   }

//   const toList = Array.isArray(data?.recipients) ? data.recipients : [];
//   const subject = (data?.subject || '').toString().trim();
//   let html = (data?.html || '').toString();
//   const preheader = (data?.preheader || '').toString();
//   const fromEmail = (data?.from || 'newworld@newworld-game.org').toString();

//   if (!toList.length) {
//     throw new functions.https.HttpsError(
//       'invalid-argument',
//       'No recipients provided.'
//     );
//   }
//   if (!subject) {
//     throw new functions.https.HttpsError(
//       'invalid-argument',
//       '"subject" is required.'
//     );
//   }
//   if (!html) {
//     throw new functions.https.HttpsError(
//       'invalid-argument',
//       '"html" is required.'
//     );
//   }

//   // very light email validation
//   const valid = toList
//     .map((s: any) => (typeof s === 'string' ? s.trim() : ''))
//     .filter((s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));

//   if (!valid.length) {
//     throw new functions.https.HttpsError(
//       'invalid-argument',
//       'No valid email addresses after validation.'
//     );
//   }

//   // Preheader injection
//   if (preheader) {
//     const pre = `<span style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>`;
//     html =
//       html.replace(/<body([^>]*)>/i, (m: any) => `${m}${pre}`) || pre + html;
//   }

//   // simple text fallback
//   const strip = (s: string) =>
//     s
//       .replace(/<[^>]+>/g, ' ')
//       .replace(/\s+/g, ' ')
//       .trim();
//   const text = strip(html);

//   // chunk into groups (SendGrid suggests up to ~1000 personalizations; we'll use 500)
//   const chunkSize = 500;
//   const chunks: string[][] = [];
//   for (let i = 0; i < valid.length; i += chunkSize) {
//     chunks.push(valid.slice(i, i + chunkSize));
//   }

//   const results: Array<{
//     batch: number;
//     count: number;
//     statusCode?: number;
//     messageId?: string;
//   }> = [];

//   for (let i = 0; i < chunks.length; i++) {
//     const batch = chunks[i];
//     const msg: sgMail.MailDataRequired = {
//       from: { email: fromEmail, name: 'NewWorld Game' },
//       subject,
//       html,
//       text,
//       trackingSettings: {
//         clickTracking: { enable: true, enableText: true },
//         openTracking: { enable: true },
//       },
//       categories: ['bulk-mail-html'],
//       // multiple personalizations; each gets its own "to"
//       personalizations: batch.map((email) => ({ to: [{ email }] })),
//     };
//     try {
//       const [resp] = await sgMail.send(msg);
//       const messageId =
//         (resp?.headers?.['x-message-id'] as string) ||
//         (resp?.headers?.['X-Message-Id'] as string) ||
//         '';
//       results.push({
//         batch: i + 1,
//         count: batch.length,
//         statusCode: resp?.statusCode ?? 0,
//         messageId,
//       });
//     } catch (err: any) {
//       // 👈 allow property access
//       console.error(
//         'SendGrid bulk batch error',
//         i + 1,
//         err?.response?.body || err?.message || err
//       );
//       results.push({ batch: i + 1, count: batch.length });
//     }

//     // tiny delay to be polite
//     await new Promise((r) => setTimeout(r, 120));
//   }

//   return {
//     ok: true,
//     total: valid.length,
//     batches: results,
//   };
// });

export const sendBulkHtml = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Sign in to send emails.'
    );
  }

  const uid = context.auth.uid;
  const runTitle = (data?.title || '').toString().trim(); // optional "campaign title" from UI
  const subject = (data?.subject || '').toString().trim();
  let html = (data?.html || '').toString();
  const preheader = (data?.preheader || '').toString();
  const fromEmail = (data?.from || 'newworld@newworld-game.org').toString();
  const toList = Array.isArray(data?.recipients) ? data.recipients : [];

  if (!toList.length)
    throw new functions.https.HttpsError(
      'invalid-argument',
      'No recipients provided.'
    );
  if (!subject)
    throw new functions.https.HttpsError(
      'invalid-argument',
      '"subject" is required.'
    );
  if (!html)
    throw new functions.https.HttpsError(
      'invalid-argument',
      '"html" is required.'
    );

  // Normalize + validate
  const rawTokens: string[] = [];
  for (const v of toList) {
    if (typeof v !== 'string') continue;
    const parts = v
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    rawTokens.push(...parts);
  }
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const token of rawTokens) {
    const lower = token.toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) {
      if (!seen.has(lower)) {
        seen.add(lower);
        valid.push(lower);
      }
    } else {
      invalid.push(token);
    }
  }
  const duplicates = Math.max(
    0,
    rawTokens.length - valid.length - invalid.length
  );

  // Preheader injection + text fallback
  if (preheader) {
    const pre = `<span style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>`;
    html =
      html.replace(/<body([^>]*)>/i, (m: any) => `${m}${pre}`) || pre + html;
  }
  const strip = (s: string) =>
    s
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const text = strip(html);

  // Create a run doc
  const db = admin.firestore();
  const runRef = db.collection('bulk_mail_runs').doc(); // runId
  const runId = runRef.id;
  const createdAt = admin.firestore.FieldValue.serverTimestamp();

  await runRef.set(
    {
      runId,
      title: runTitle || subject, // fallback to subject
      subject,
      preheader,
      createdAt,
      createdBy: uid,
      totals: {
        requested: rawTokens.length,
        valid: valid.length,
        invalid: invalid.length,
        duplicates,
      },
      status: 'running',
      batches: [],
    },
    { merge: true }
  );

  // Chunk + send
  const chunkSize = 500;
  const results: Array<{
    batch: number;
    count: number;
    statusCode?: number;
    messageId?: string;
  }> = [];

  for (let i = 0; i < valid.length; i += chunkSize) {
    const batch = valid.slice(i, i + chunkSize);
    const msg: sgMail.MailDataRequired = {
      from: { email: fromEmail, name: 'NewWorld Game' },
      subject,
      html,
      text,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
      categories: ['bulk-mail-html'],
      personalizations: batch.map((email) => ({ to: [{ email }] })),
    };

    try {
      const [resp] = await sgMail.send(msg);
      const messageId =
        (resp?.headers?.['x-message-id'] as string) ||
        (resp?.headers?.['X-Message-Id'] as string) ||
        '';
      results.push({
        batch: i / chunkSize + 1,
        count: batch.length,
        statusCode: resp?.statusCode ?? 0,
        messageId,
      });
    } catch (err: any) {
      console.error(
        'SendGrid bulk batch error',
        i / chunkSize + 1,
        err?.response?.body || err?.message || err
      );
      results.push({ batch: i / chunkSize + 1, count: batch.length });
    }

    await new Promise((r) => setTimeout(r, 120));
  }

  // Finalize run
  await runRef.set(
    {
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      batches: results,
    },
    { merge: true }
  );

  return {
    ok: true,
    runId,
    summary: {
      requested: rawTokens.length,
      valid: valid.length,
      invalid: invalid.length,
      duplicates,
      batches: results.length,
    },
  };
});

export const sendDemoInvite = functions.firestore
  .document('demoBookings/{demoId}')
  .onCreate(async (snap) => {
    const data = snap.data(); // bracket notation everywhere

    /* 1 ║ Build start / end time */
    const startEST = new Date(`${data['demoDate']} ${data['demoTime']} EST`);
    const startUTC = new Date(startEST.getTime() + 5 * 60 * 60 * 1000);
    functions.logger.info('SG key starts with', API_KEY.slice(0, 10));

    /* 2 ║ Build .ics attachment */
    const ics = buildICS(
      startUTC,
      data['name'],
      data['email'],
      'https://meet.google.com/pea-twnz-uwn'
    );

    const attachment = {
      content: Buffer.from(ics.replace(/\n/g, '\r\n')).toString('base64'),
      filename: 'invite.ics',
      type: 'text/calendar', // ← no “; method=…”
      disposition: 'attachment',
    };

    /* 3 ║ Message subjects */
    const userSubject = `✅ NewWorld Game Workshop – ${data['demoDate']} ${data['demoTime']} EST`;
    const opsSubject = `📆 Demo booked – ${data['name']} – ${data['demoDate']} ${data['demoTime']} EST`;

    /* 4 ║ Build messages */
    const userMsg = {
      to: data['email'],
      from: 'newworld@newworld-game.org', // verified sender
      subject: userSubject,
      templateId: TEMPLATE_DEMO,
      dynamicTemplateData: {
        subject: userSubject, // <- NEW line
        firstName: data['name'].split(' ')[0] ?? '',
        date: data['demoDate'],
        time: data['demoTime'],
        meetingLink: 'https://meet.google.com/pea-twnz-uwn',
      },
      attachments: [attachment],
    };

    const opsMsg = {
      to: 'newworld@newworld-game.org',
      from: 'newworld@newworld-game.org',
      subject: opsSubject,
      text: `${data['name']} booked ${data['demoDate']} at ${data['demoTime']} EST\nNotes: ${data['notes']}`,
      attachments: [attachment],
    };

    /* 5 ║ Send & log */
    try {
      await Promise.all([sgMail.send(userMsg), sgMail.send(opsMsg)]);
      functions.logger.info('✅ e-mails sent for doc', snap.id);
    } catch (e: any) {
      functions.logger.error('❌ SendGrid error', e?.response?.body ?? e);
      throw e; // mark function failed
    }
  });

export const onChatPrompt = functions
  .region('us-central1')
  .firestore.document('users/{uid}/discussions/{docId}')
  .onCreate(async (snap) => {
    try {
      const prompt: string = (snap.data()?.['prompt'] || '').trim();
      if (!prompt) return;

      /* mark as processing */
      await snap.ref.update({
        status: { state: 'PROCESSING' },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ────────── 0. helpers ─────────────────────────────────────
      const colRef = snap.ref.parent!;
      const allDocs = await colRef.get();
      const sorted = allDocs.docs
        .filter((d) => d.id !== snap.id)
        .sort(
          (a, b) =>
            (a.get('createdAt')?.toMillis() ?? a.createTime?.toMillis() ?? 0) -
            (b.get('createdAt')?.toMillis() ?? b.createTime?.toMillis() ?? 0)
        );

      // current turn attachments
      const thisAttachments = (snap.data()?.['attachmentList'] || []) as {
        url: string;
        mime: string;
        name: string;
      }[];

      // ────────── 1. build conversation history ─────────────────
      let history = '';

      /* include every previous doc (attachments + turns) */
      for (const d of sorted) {
        const data = d.data();

        // 1A ▸ earlier attachments
        if (data?.['attachmentList']?.length) {
          for (const att of data?.['attachmentList']) {
            try {
              const txt = await fetchAndExtract(att.url, att.mime);
              history +=
                `\n(Previously shared document «${att.name}»)\n` +
                txt.slice(0, 12_000) +
                '\n';
            } catch (e) {
              console.warn('Could not reload attachment', att.url, e);
            }
          }
        }

        // 1B ▸ normal dialogue
        if (data?.['prompt']) history += `User: ${data?.['prompt']}\n`;
        if (data?.['response']) history += `Assistant: ${data?.['response']}\n`;
      }

      /* add THIS turn’s attachments (if any) */
      if (thisAttachments.length) {
        for (const att of thisAttachments) {
          try {
            const txt = await fetchAndExtract(att.url, att.mime);
            history +=
              `\n(Current document «${att.name}»)\n` +
              txt.slice(0, 12_000) +
              '\n';
          } catch (e) {
            console.warn('Extraction failed for', att.url, e);
          }
        }
      }

      /* finally the fresh user prompt */
      history += `User: ${prompt}\nAssistant:`;

      // ────────── 2. pick model ─────────────────────────────────
      // Enhanced detection for image generation requests (English and French)
      const imagePatterns = [
        // English patterns
        /\b(generate|create|make|draw|paint|design|render|produce)\s+(an?\s+)?(image|picture|photo|illustration|artwork|visual|graphic|diagram|infographic)/i,
        /\b(image|picture|photo|illustration|artwork|visual|graphic)\s+(of|for|showing|depicting|illustrating)/i,
        /\bshow\s+me\s+(an?\s+)?(image|picture|visual)/i,
        /\bvisualize\b/i,
        /\billustrate\b/i,
        /\bcreate\s+(a\s+)?visual/i,
        /\b(can you|please|could you)\s+(generate|create|make|draw)\s+(an?\s+)?(image|picture)/i,
        // French patterns
        /\b(générer|créer|faire|dessiner|peindre|concevoir|produire|rendre)\s+(une\s+)?(image|photo|illustration|visuel|graphique|diagramme|infographie)/i,
        /\b(image|photo|illustration|visuel|graphique)\s+(de|pour|montrant|dépeignant|illustrant)/i,
        /\b(montre|montrer)\s+(moi\s+)?(une\s+)?(image|photo|visuel)/i,
        /\bvisualiser\b/i,
        /\billustrer\b/i,
        /\bcréer\s+(un\s+)?visuel/i,
        /\b(pouvez-vous|peux-tu|s'il te plaît|s'il vous plaît)\s+(générer|créer|faire|dessiner)\s+(une\s+)?(image|photo)/i,
      ];
      const wantsImage = imagePatterns.some((pattern) => pattern.test(prompt));

      // Use gemini-2.0-flash-exp for image generation (best available via Generative AI SDK)
      // Use gemini-2.5-flash for text-only responses with grounding
      const modelName = wantsImage
        ? 'gemini-2.0-flash-exp'
        : 'gemini-2.5-flash';

      console.log('Model selection:', {
        wantsImage,
        modelName,
        promptPreview: prompt.slice(0, 100),
      });

      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const modelConfig: Record<string, unknown> = { model: modelName };
      if (!wantsImage) {
        // Enable Google Search grounding for factual responses with sources
        // The google_search tool enables grounding with web search
        modelConfig['tools'] = [{ google_search: {} }];
      } else {
        // Configure for high-quality image generation
        modelConfig['generationConfig'] = {
          responseModalities: ['TEXT', 'IMAGE'],
        };
      }
      const model = genAI.getGenerativeModel(modelConfig as any);

      // For image generation, enhance the prompt for better quality
      let imagePrompt = history;
      if (wantsImage) {
        // Add quality-enhancing instructions to the prompt
        const qualityPrefix = `You are an expert AI image generator. Create a high-quality, detailed, professional image based on the following request. Make it visually stunning, well-composed, with good lighting and artistic quality.\n\n`;
        imagePrompt = qualityPrefix + history;
      }

      // ────────── 3. generate ───────────────────────────────────
      let answer = '';
      let imgB64 = '';
      let finalResponse: any;

      if (wantsImage) {
        // Image model does not support streaming; do one-shot generation.
        try {
          console.log('Attempting image generation with model:', modelName);
          const result = await model.generateContent(imagePrompt);
          finalResponse = await result.response;

          // Check for blocked content or safety issues
          if (finalResponse.candidates?.[0]?.finishReason === 'SAFETY') {
            answer =
              "I apologize, but I couldn't generate that image due to content safety guidelines. Please try a different prompt that doesn't include people or sensitive content.";
          } else if (
            finalResponse.candidates?.[0]?.finishReason === 'RECITATION'
          ) {
            answer =
              "I couldn't generate that image due to content restrictions. Please try a different prompt.";
          } else {
            for (const part of finalResponse.candidates?.[0]?.content?.parts ||
              []) {
              if (part.text) {
                answer += part.text;
              } else if (part.inlineData?.data) {
                imgB64 = part.inlineData.data;
              }
            }
          }

          // If no image was generated but we expected one, provide feedback
          if (!imgB64 && !answer) {
            answer =
              "I tried to generate an image but wasn't able to. This might be due to content restrictions. Try a prompt without people or sensitive content, like 'Generate an image of a futuristic sustainable city' or 'Create an illustration of renewable energy'.";
          }

          console.log('Image generation result:', {
            hasImage: !!imgB64,
            answerLength: answer.length,
          });
        } catch (imageError: any) {
          console.error(
            'Image generation error:',
            imageError?.message || imageError
          );
          // Provide a helpful fallback message
          answer = 'I encountered an issue generating that image. ';
          if (
            imageError?.message?.includes('SAFETY') ||
            imageError?.message?.includes('blocked')
          ) {
            answer +=
              'The content may have been blocked due to safety guidelines. Try a different prompt without people or sensitive subjects.';
          } else if (
            imageError?.message?.includes('quota') ||
            imageError?.message?.includes('limit')
          ) {
            answer +=
              'The image generation service may be temporarily unavailable. Please try again later.';
          } else {
            answer +=
              "Please try a different prompt, such as 'Generate an image of a beautiful landscape' or 'Create a picture of a sustainable city'.";
          }
        }
      } else {
        const streamResult = await model.generateContentStream(history);
        const STREAM_THROTTLE_MS = 250;
        let lastStreamUpdate = 0;

        for await (const chunk of streamResult.stream) {
          const chunkText = chunk.text();
          if (!chunkText) continue;

          answer += chunkText;
          const now = Date.now();
          const shouldFlush =
            now - lastStreamUpdate >= STREAM_THROTTLE_MS || answer.length <= 60;

          if (shouldFlush) {
            lastStreamUpdate = now;
            await snap.ref.update({
              status: { state: 'PROCESSING', streaming: true },
              response: answer,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }

        finalResponse = await streamResult.response;
        for (const part of finalResponse.candidates?.[0]?.content?.parts ||
          []) {
          if (part.text && !answer.includes(part.text)) {
            answer += part.text;
          } else if (part.inlineData?.data) {
            imgB64 = part.inlineData.data;
          }
        }
      }

      // ────────── 4. extract sources from grounding metadata ───────────────────────
      const sources: Array<{ title: string; url: string; priority: number }> = [];
      const candidate = finalResponse.candidates?.[0];
      const seenUrls = new Set<string>();
      
      // List of authoritative domains (higher priority)
      const authoritativeDomains = [
        'un.org', 'undp.org', 'unep.org', 'unesco.org', 'who.int', 'unicef.org',
        'worldbank.org', 'imf.org', 'wto.org', 'ilo.org',
        '.gov', '.edu',
        'nature.com', 'science.org', 'pnas.org', 'sciencedirect.com',
        'reuters.com', 'bbc.com', 'bbc.co.uk', 'apnews.com', 'npr.org',
        'harvard.edu', 'mit.edu', 'stanford.edu', 'oxford.ac.uk', 'cambridge.org',
        'ncbi.nlm.nih.gov', 'cdc.gov', 'epa.gov', 'nasa.gov',
        'oecd.org', 'europa.eu', 'weforum.org',
        'statista.com', 'ourworldindata.org', 'data.worldbank.org',
      ];
      
      // Function to check if URL is from authoritative domain
      const getAuthorityScore = (hostname: string): number => {
        const lowerHost = hostname.toLowerCase();
        for (const domain of authoritativeDomains) {
          if (lowerHost.includes(domain)) {
            return 10; // High priority for authoritative sources
          }
        }
        // Medium priority for known reliable domains
        if (lowerHost.includes('wikipedia.org')) return 5;
        return 1; // Default priority
      };
      
      // Function to clean and validate URL - be permissive to not lose sources
      const isValidSourceUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          // Must be http or https
          if (!['http:', 'https:'].includes(parsed.protocol)) return false;
          // Only filter out Google's internal search/redirect URLs
          if (parsed.hostname === 'www.google.com' || parsed.hostname === 'google.com') {
            if (parsed.pathname.startsWith('/search') || parsed.pathname.startsWith('/url')) {
              return false;
            }
          }
          return true;
        } catch {
          return false;
        }
      };
      
      // Helper to add a source
      const addSource = (url: string, title?: string) => {
        if (!url || seenUrls.has(url) || !isValidSourceUrl(url)) return;
        seenUrls.add(url);
        
        try {
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname;
          const priority = getAuthorityScore(hostname);
          
          // Clean up title - use provided title, or derive from hostname
          let finalTitle = title;
          if (!finalTitle || finalTitle.length < 3) {
            finalTitle = hostname.replace(/^www\./, '');
            // Capitalize first letter
            finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
          }
          
          sources.push({ title: finalTitle, url, priority });
        } catch (e) {
          console.warn('Failed to parse URL:', url, e);
        }
      };
      
      console.log('Raw grounding metadata:', JSON.stringify(candidate?.groundingMetadata, null, 2));
      
      // Extract from groundingChunks (primary source of URLs)
      if (candidate?.groundingMetadata?.groundingChunks) {
        const groundingChunks = candidate.groundingMetadata.groundingChunks;
        console.log('Found', groundingChunks.length, 'grounding chunks');
        
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri) {
            addSource(chunk.web.uri, chunk.web.title);
          }
        }
      }
      
      // Also extract from groundingSupports if available (contains segment-level citations)
      if (candidate?.groundingMetadata?.groundingSupports) {
        const supports = candidate.groundingMetadata.groundingSupports;
        console.log('Found', supports.length, 'grounding supports');
        
        for (const support of supports) {
          if (support.groundingChunkIndices && candidate?.groundingMetadata?.groundingChunks) {
            // These reference the groundingChunks by index, already handled above
          }
          // Some responses have direct web references in supports
          if (support.segment?.text && support.webSearchQueries) {
            // Log for debugging but don't duplicate
          }
        }
      }
      
      // Check for searchEntryPoint (Google Search grounding metadata)
      if (candidate?.groundingMetadata?.searchEntryPoint?.renderedContent) {
        console.log('Has search entry point');
      }
      
      // Log search queries used
      if (candidate?.groundingMetadata?.webSearchQueries) {
        console.log('Search queries used:', candidate.groundingMetadata.webSearchQueries);
      }
      
      // Sort by priority (authoritative sources first)
      sources.sort((a, b) => b.priority - a.priority);
      
      // Log the final sources
      console.log('Final sources count:', sources.length);
      if (sources.length > 0) {
        console.log('Sources:', sources.map(s => ({ title: s.title, url: s.url.slice(0, 60), priority: s.priority })));
      }
      
      // Remove priority field before saving (keep only title and url), limit to 6
      const cleanSources = sources.slice(0, 6).map(({ title, url }) => ({ title, url }));

      // ────────── 5. store image (if any) ───────────────────────
      let imageUrl: string | undefined;
      let imageDocId: string | undefined;
      if (imgB64) {
        imageDocId = randomUUID();
        const filePath = `chatbot-images/${imageDocId}.png`;
        await bucket.file(filePath).save(Buffer.from(imgB64, 'base64'), {
          contentType: 'image/png',
          resumable: false,
          public: true,
        });
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

        // Save image reference to chatbot-images collection
        const uid = snap.ref.parent?.parent?.id;
        await admin
          .firestore()
          .collection('chatbot-images')
          .doc(imageDocId)
          .set({
            id: imageDocId,
            url: imageUrl,
            storagePath: filePath,
            prompt: prompt.slice(0, 500), // Store the prompt that generated this image
            userId: uid || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            discussionDocId: snap.id,
          });
      }

      // ────────── 6. final update ───────────────────────────────
      await snap.ref.update({
        status: { state: 'COMPLETED' },
        response: answer || null,
        imageUrl: imageUrl || null,
        imageDocId: imageDocId || null,
        sources: cleanSources.length > 0 ? cleanSources : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      console.error('onChatPrompt error:', err?.message || err);

      // Provide a user-friendly error message
      let userFriendlyError = 'An unexpected error occurred. Please try again.';
      const errorMsg = err instanceof Error ? err.message : String(err);

      if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked')) {
        userFriendlyError =
          'Your request was blocked due to content safety guidelines. Please try a different prompt.';
      } else if (errorMsg.includes('quota') || errorMsg.includes('429')) {
        userFriendlyError =
          'The AI service is temporarily busy. Please wait a moment and try again.';
      } else if (errorMsg.includes('model')) {
        userFriendlyError =
          'There was an issue with the AI model. Please try again.';
      }

      await snap.ref.update({
        status: {
          state: 'ERRORED',
          error: userFriendlyError,
          technicalError: errorMsg,
        },
        response: userFriendlyError,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

const inferSpeechEncoding = (
  mimeType?: string
): speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding => {
  const type = (mimeType || '').toLowerCase();
  if (type.includes('webm'))
    return speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
      .WEBM_OPUS;
  if (type.includes('ogg'))
    return speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
      .OGG_OPUS;
  if (type.includes('mp3') || type.includes('mpeg'))
    return speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
      .MP3;
  if (type.includes('wav') || type.includes('pcm'))
    return speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
      .LINEAR16;
  return speechProtos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
    .WEBM_OPUS;
};

export const transcribeAvatarAudio = functions
  .region('us-central1')
  .https.onCall(async (data: any, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Please sign in to use voice transcription.'
      );
    }

    const audioContent = (data?.audio || '').toString();
    if (!audioContent) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Audio content is required.'
      );
    }

    const mimeType = (data?.mimeType || '').toString();
    const languageCode = (data?.languageCode || 'en-US').toString();
    const alternativeLanguageCodes = Array.isArray(
      data?.alternativeLanguageCodes
    )
      ? (data.alternativeLanguageCodes as string[])
      : [];

    try {
      const config: speechProtos.google.cloud.speech.v1.IRecognitionConfig = {
        encoding: inferSpeechEncoding(mimeType),
        languageCode,
        enableAutomaticPunctuation: true,
        maxAlternatives: 1,
      };

      if (alternativeLanguageCodes.length) {
        config.alternativeLanguageCodes = alternativeLanguageCodes;
      }

      const request: speechProtos.google.cloud.speech.v1.IRecognizeRequest = {
        audio: { content: audioContent },
        config,
      };

      const [result] = (await speechClient.recognize(request)) as [
        speechProtos.google.cloud.speech.v1.IRecognizeResponse,
        speechProtos.google.cloud.speech.v1.IRecognizeRequest | undefined,
        Record<string, unknown> | undefined
      ];

      const transcript = (result.results || [])
        .map((section: any) => section.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

      return { transcript };
    } catch (err) {
      functions.logger.error('transcribeAvatarAudio failed', err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'string'
          ? err
          : 'Speech transcription failed.';
      const details =
        err && typeof err === 'object' ? JSON.stringify(err) : undefined;
      throw new functions.https.HttpsError('internal', message, details);
    }
  });

export const synthesizeAvatarSpeech = functions
  .region('us-central1')
  .https.onCall(async (data: any, context) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Please sign in to use voice responses.'
      );
    }

    const rawText = (data?.text || '').toString();
    const text = rawText.trim();
    if (!text) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Text is required to synthesize speech.'
      );
    }

    const languageCode = (data?.languageCode || 'en-US').toString();
    const voiceName = (data?.voiceName || '').toString();
    const speakingRate =
      typeof data?.speakingRate === 'number'
        ? Math.min(Math.max(data.speakingRate, 0.7), 1.3)
        : 1.0;
    const pitch =
      typeof data?.pitch === 'number'
        ? Math.min(Math.max(data.pitch, -5.0), 5.0)
        : 0.0;

    // Gemini responses can be long; cap input to stay within API limits.
    const maxChars = 4500;
    const inputText = text.length > maxChars ? text.slice(0, maxChars) : text;

    try {
      const [response] = await textToSpeechClient.synthesizeSpeech({
        input: { text: inputText },
        voice: voiceName
          ? { languageCode, name: voiceName }
          : { languageCode, ssmlGender: 'FEMALE' },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
        },
      });

      if (!response.audioContent) {
        throw new Error('No audio content returned by Text-to-Speech API.');
      }

      const audioData = response.audioContent;
      let audioContentBase64: string;
      if (audioData instanceof Uint8Array) {
        audioContentBase64 = Buffer.from(audioData).toString('base64');
      } else if (typeof audioData === 'string') {
        audioContentBase64 = audioData;
      } else {
        throw new Error('Unsupported audio content format.');
      }

      return {
        audioContent: audioContentBase64,
        truncated: inputText.length !== text.length,
      };
    } catch (err) {
      functions.logger.error('synthesizeAvatarSpeech failed', err);
      throw new functions.https.HttpsError(
        'internal',
        err instanceof Error ? err.message : 'Speech synthesis failed.'
      );
    }
  });

export const nonUserEmail = functions.https.onCall(
  async (data: any, context: any) => {
    //   if (!context.auth && !context.auth!.token.email) {
    //     throw new functions.https.HttpsError(
    //       'failed-precondition',
    //       'Must be logged with email-address'
    //     );
    //   }
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_SOLUTION_NONUSER,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const challengePageInvite = functions.https.onCall(
  async (data: any, context: any) => {
    //   if (!context.auth && !context.auth!.token.email) {
    //     throw new functions.https.HttpsError(
    //       'failed-precondition',
    //       'Must be logged with email-address'
    //     );
    //   }
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_CHALLENGE_PAGE,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
        user: data.user,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const nonUserchallengePageInvite = functions.https.onCall(
  async (data: any, context: any) => {
    //   if (!context.auth && !context.auth!.token.email) {
    //     throw new functions.https.HttpsError(
    //       'failed-precondition',
    //       'Must be logged with email-address'
    //     );
    //   }
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_CHALLENGE_PAGE_NONUSER,
      dynamic_template_data: {
        subject: data.subject,
        description: data.description,
        title: data.title,
        path: data.path,
        image: data.image,
        author: data.author,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const commentNotificationEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_COMMENT,
      dynamic_template_data: {
        subject: data.subject,
        // title: data.title,
        path: data.path,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

/**
 * Send @mention notification emails for discussion messages
 * Handles both @everyone (sends to all participants) and @individual mentions
 */
export const sendMentionNotification = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth?.token?.email) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to send mention notifications.'
      );
    }

    const mentionType = (data?.mentionType || '').toString().trim(); // 'everyone' or 'individual'
    const recipients = Array.isArray(data?.recipients) ? data.recipients : [];
    const senderName = (data?.senderName || '').toString().trim();
    const messageContent = (data?.messageContent || '').toString().trim();
    const challengeTitle = (data?.challengeTitle || 'a discussion').toString();
    const discussionUrl = (data?.discussionUrl || '').toString().trim();

    if (!mentionType || (mentionType !== 'everyone' && mentionType !== 'individual')) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'mentionType must be "everyone" or "individual".'
      );
    }

    if (!recipients.length) {
      return { success: false, reason: 'no_recipients' };
    }

    if (!senderName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'senderName is required.'
      );
    }

    // Filter and validate emails
    const validEmails: string[] = [];
    for (const r of recipients) {
      const email = (typeof r === 'string' ? r : r?.email || '').toString().trim().toLowerCase();
      if (emailRegex.test(email)) {
        validEmails.push(email);
      }
    }

    if (!validEmails.length) {
      return { success: false, reason: 'no_valid_emails' };
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const safeSender = escapeHtml(senderName);
    const safeTitle = escapeHtml(challengeTitle);
    const safeMessage = messageContent
      ? escapeHtml(messageContent).replace(/\r?\n/g, '<br />')
      : '<em>No message content.</em>';

    const mentionLabel = mentionType === 'everyone' 
      ? '@everyone in the discussion' 
      : 'you specifically';

    const subject = mentionType === 'everyone'
      ? `${senderName} mentioned @everyone in ${challengeTitle}`
      : `${senderName} mentioned you in ${challengeTitle}`;

    const html = `
      <div style="font-family: 'Inter', Arial, sans-serif; color:#0f172a; line-height:1.5;">
        <h2 style="font-size:20px; margin:0 0 16px;">You were mentioned in a discussion</h2>
        <p style="margin:0 0 16px;">
          <strong>${safeSender}</strong> mentioned ${mentionLabel} in <strong>${safeTitle}</strong>.
        </p>
        <div style="margin:0 0 20px; padding:16px; border-radius:16px; background:#f1f5f9;">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#0ea5e9; margin-bottom:8px;">Message</div>
          <div style="color:#334155;">${safeMessage}</div>
        </div>
        ${discussionUrl ? `
        <a href="${discussionUrl}" style="display:inline-block; padding:12px 24px; background:#047857; color:#ffffff; border-radius:9999px; text-decoration:none; font-weight:600;">View Discussion</a>
        ` : ''}
        <p style="margin:24px 0 0; font-size:12px; color:#64748b;">You are receiving this notification because you are part of the ${safeTitle} discussion on NewWorld Game.</p>
      </div>
    `;

    const text = `${senderName} mentioned ${mentionLabel} in ${challengeTitle}. Message: ${messageContent || 'No message content.'}\n${discussionUrl ? `View discussion: ${discussionUrl}` : ''}`;

    const mail: sgMail.MailDataRequired = {
      from: { email: 'newworld@newworld-game.org', name: 'NewWorld Game' },
      subject,
      html,
      text,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
      personalizations: validEmails.map((email) => ({ to: [{ email }] })),
    };

    try {
      await sgMail.send(mail);
      return { success: true, recipients: validEmails.length };
    } catch (err: any) {
      console.error('SendGrid mention email error', err?.response?.body || err?.message || err);
      throw new functions.https.HttpsError('internal', 'Failed to send mention notification.');
    }
  }
);

export const workshopRegistrationEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_WORKSHOP,
      dynamic_template_data: {
        subject: data.subject,
        firstname: data.firstName,
        lastname: data.lastName,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

/**
 * Beautiful invite email for participants - works for both solutions and challenge pages
 * Uses inline HTML template (not SendGrid templates) for better deliverability
 */
export const sendParticipantInvite = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    const recipientEmail = (data?.email || '').toString().trim().toLowerCase();
    const inviterName = (data?.inviterName || 'Someone').toString().trim();
    const projectTitle = (data?.title || 'a project').toString().trim();
    const projectDescription = (data?.description || '').toString().trim();
    const projectImage = (data?.image || '').toString().trim();
    const inviteUrl = (data?.path || data?.url || '').toString().trim();
    const inviteType = (data?.type || 'solution').toString().trim(); // 'solution', 'challenge', 'workspace'
    const recipientName = (data?.recipientName || '').toString().trim();
    const isNewUser = data?.isNewUser === true;

    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A valid recipient email is required.'
      );
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const safeInviter = escapeHtml(inviterName);
    const safeTitle = escapeHtml(projectTitle);
    const safeDescription = projectDescription 
      ? escapeHtml(projectDescription).slice(0, 200) + (projectDescription.length > 200 ? '...' : '')
      : '';
    const safeRecipientName = recipientName ? escapeHtml(recipientName) : '';
    
    // Determine the invite type label
    const typeLabels: Record<string, string> = {
      'solution': 'solution',
      'challenge': 'challenge workspace',
      'workspace': 'workspace',
      'team': 'team',
    };
    const typeLabel = typeLabels[inviteType] || 'project';

    // Personalized greeting
    const greeting = safeRecipientName 
      ? `Hi ${safeRecipientName},` 
      : 'Hello,';

    // CTA button text based on user status
    const ctaText = isNewUser 
      ? 'Create Account & Join' 
      : 'View Invitation';

    const subject = `${inviterName} invited you to join "${projectTitle}" on NewWorld Game`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://firebasestorage.googleapis.com/v0/b/buckminister-backup.appspot.com/o/nwg-logo-green.png?alt=media" alt="NewWorld Game" width="180" style="display:block; max-width:180px; height:auto;" />
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff; border-radius:16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1); overflow:hidden;">
                
                <!-- Project Image (if provided) -->
                ${projectImage ? `
                <tr>
                  <td>
                    <img src="${escapeHtml(projectImage)}" alt="${safeTitle}" width="600" style="display:block; width:100%; max-height:200px; object-fit:cover;" />
                  </td>
                </tr>
                ` : ''}
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 40px 32px;">
                    
                    <!-- Invite Badge -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 8px 16px; border-radius: 9999px;">
                          <span style="color:#ffffff; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">You're Invited</span>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Greeting -->
                    <p style="margin:0 0 16px; font-size:16px; color:#334155; line-height:1.5;">
                      ${greeting}
                    </p>
                    
                    <!-- Main Message -->
                    <p style="margin:0 0 24px; font-size:16px; color:#334155; line-height:1.6;">
                      <strong style="color:#0f172a;">${safeInviter}</strong> has invited you to collaborate on a ${typeLabel} on NewWorld Game.
                    </p>
                    
                    <!-- Project Info Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9; border-radius:12px; margin-bottom:28px;">
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; font-weight:600;">
                            ${typeLabel.toUpperCase()}
                          </p>
                          <h2 style="margin:0 0 12px; font-size:20px; color:#0f172a; font-weight:700; line-height:1.3;">
                            ${safeTitle}
                          </h2>
                          ${safeDescription ? `
                          <p style="margin:0; font-size:14px; color:#475569; line-height:1.5;">
                            ${safeDescription}
                          </p>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius:9999px;">
                          <a href="${inviteUrl}" target="_blank" style="display:inline-block; padding:16px 32px; font-size:16px; font-weight:600; color:#ffffff; text-decoration:none;">
                            ${ctaText} →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- What is NewWorld Game -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0; padding-top:24px;">
                      <tr>
                        <td>
                          <p style="margin:0 0 8px; font-size:13px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em;">
                            What is NewWorld Game?
                          </p>
                          <p style="margin:0; font-size:14px; color:#64748b; line-height:1.6;">
                            NewWorld Game is a collaborative platform where teams design solutions to global challenges using systems thinking and the UN Sustainable Development Goals.
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align:center;">
              <p style="margin:0 0 8px; font-size:13px; color:#94a3b8;">
                This invitation was sent by ${safeInviter} via NewWorld Game.
              </p>
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                © ${new Date().getFullYear()} NewWorld Game · <a href="https://newworld-game.org" style="color:#64748b; text-decoration:underline;">newworld-game.org</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const text = `${greeting}

${inviterName} has invited you to collaborate on "${projectTitle}" on NewWorld Game.

${safeDescription ? `About this ${typeLabel}: ${projectDescription}\n\n` : ''}To view this invitation and join, visit: ${inviteUrl}

---
What is NewWorld Game?
NewWorld Game is a collaborative platform where teams design solutions to global challenges using systems thinking and the UN Sustainable Development Goals.

This invitation was sent by ${inviterName} via NewWorld Game.
`;

    const mail: sgMail.MailDataRequired = {
      from: { email: 'newworld@newworld-game.org', name: 'NewWorld Game' },
      to: recipientEmail,
      subject,
      html,
      text,
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
    };

    try {
      await sgMail.send(mail);
      return { success: true };
    } catch (err: any) {
      console.error('SendGrid invite email error:', err?.response?.body || err?.message || err);
      throw new functions.https.HttpsError('internal', 'Failed to send invitation email.');
    }
  }
);

export const solutionEvaluationInvite = functions.https.onCall(
  async (data: any, context: any) => {
    try {
      // Your existing email sending logic...
      const msg = {
        to: data.email,
        from: 'newworld@newworld-game.org',
        templateId: TEMPLATE_ID_EVALUTION,
        dynamic_template_data: {
          subject: data.subject,
          title: data.title,
          path: data.path,
        },
      };
      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error('Failed to send email', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send email',
        error
      );
    }
  }
);

export const solutionEvaluationComplete = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: TEMPLATE_ID_EVALUATION_COMPLETE,
      dynamic_template_data: {
        subject: data.subject,
        title: data.title,
        path: data.path,
      },
    };

    await sgMail.send(msg);

    return { success: true };
  }
);

export const getIceServers = functions.https.onCall(async (data, context) => {
  try {
    const tokenResponse = await twilioClient.tokens.create();
    const iceServers = tokenResponse.iceServers;
    return { iceServers };
  } catch (error) {
    console.error('Error fetching ICE servers from Twilio:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch ICE servers.'
    );
  }
});

export const createCheckoutSession = functions.https.onCall(
  async (data: any, context: any) => {
    try {
      // 1) Gather form fields from the `data` object
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        stateProvince,
        country,
        age,
        organization,
        targetGroup,
        occupation,
        whyAttend,
        focusTopic,
        pid,
        registerDate,
        labMode, // <-- NEW
        letterOfInvitation, // <-- NEW if you want to store it
      } = data;

      // 2) Decide the amount based on BOTH labMode AND targetGroup
      let amount = 0; // in cents

      if (labMode === 'inPerson') {
        // In-Person Lab
        if (targetGroup === 'professional') {
          amount = 85000; // $850
        } else if (targetGroup === 'student' || targetGroup === 'senior') {
          amount = 45000; // $450
        }
      } else {
        // Online Lab
        if (targetGroup === 'professional') {
          amount = 24900; // $249
        } else if (targetGroup === 'student' || targetGroup === 'senior') {
          amount = 9900; // $99
        }
      }

      // 2) Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: '2025 Global Solutions Lab Tuition',
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        // success and cancel URLs => change to your actual domain
        success_url: 'https://newworld-game.org/thank-you',
        cancel_url: 'https://newworld-game.org/global-lab',

        // 3) You can store minimal metadata here, used by your webhook later
        metadata: {
          firstName,
          lastName,
          email,
          phone,
          address,
          city,
          stateProvince,
          country,
          age: String(age),
          organization,
          targetGroup,
          occupation,
          whyAttend,
          focusTopic,
          registerDate,
          pid, // add the pid from your form data or your component
          labMode, // store the new field
          letterOfInvitation, // store whether they need a visa letter
        },
      });

      // Return the session URL for redirection
      return { url: session.url };
    } catch (err) {
      console.error('Error creating Stripe Checkout Session', err);
      throw new functions.https.HttpsError(
        'internal',
        'Unable to create session'
      );
    }
  }
);

export const stripeWebhook2 = functions.https.onRequest(
  async (req: any, res: any) => {
    let event;

    try {
      const sig = req.headers['stripe-signature'] as string;
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        functions.config()['stripe'].webhook_secret_earthgame
      );
    } catch (err) {
      console.error('❌ Error verifying Stripe Webhook signature:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      // This is in cents (e.g. 39900 means $399.00)
      const amountPaid = session.amount_total;
      console.log('✅ Payment complete for session:', session.id);

      // 1) Retrieve metadata
      const {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        stateProvince,
        country,
        age,
        organization,
        targetGroup,
        occupation,
        whyAttend,
        focusTopic,
        registerDate,
        pid, // we passed this in metadata
        labMode, // read new field
        letterOfInvitation, // read new field
      } = session.metadata || {};

      // 2) Prepare the registration object to add
      const registrationData = {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        stateProvince,
        country,
        age: Number(age),
        organization,
        targetGroup,
        occupation,
        whyAttend,
        focusTopic,
        paid: true,
        amountPaid, // e.g. 39900
        paymentIntent: session.payment_intent,
        registerDate,
        labMode, // store the new field in Firestore
        letterOfInvitation, // store the new field in Firestore
      };

      // 3) Append to the registrations array in Firestore
      const docRef = admin.firestore().collection('global-lab-2025').doc(pid);

      await docRef.set(
        {
          registrations:
            admin.firestore.FieldValue.arrayUnion(registrationData),
        },
        { merge: true }
      );

      console.log('Successfully added registration to array in Firestore');
      // 4) Send emails
      try {
        // A) Email the participant
        await runGslRegistrationEmail({
          firstName,
          lastName,
          email,
          // any dynamic data the template might require
          subject: 'Thanks for registering & paying for the GSL 2025!',
        });

        // B) Email the admins
        const adminData = {
          firstName,
          lastName,
          email,
          organization,
          registrationDate: registerDate,
          phone,
          address,
          city,
          stateProvince,
          country,
          age,
          paidAmount: amountPaid! / 100, // convert cents => dollars
          occupation,
          whyAttend,
          focusTopic,
          targetGroup: targetGroup,
          labMode,
          letterOfInvitation,
        };
        // Admins: you said you want to email 4 addresses. We can just call
        // the function 4 times with a different "to" each time, or you can
        // modify your Cloud Function to accept an array of emails.
        await runGslAdminNotificationEmail({
          ...adminData,
          emailAdmin: 'mbadungoma@gmail.com',
        });

        await runGslAdminNotificationEmail({
          ...adminData,
          emailAdmin: 'medard@1earthgame.org',
        });
        await runGslAdminNotificationEmail({
          ...adminData,
          emailAdmin: 'jimwalker@mindpalace.com',
        });
        await runGslAdminNotificationEmail({
          ...adminData,
          emailAdmin: 'newworld@newworld-game.org',
        });

        console.log('✅ Successfully sent emails to user + admins');
      } catch (emailErr) {
        console.error('❌ Error sending GSL registration emails:', emailErr);
      }
    }

    res.json({ received: true });
  }
);

export const createNwgSchoolCheckoutSession = functions.https.onCall(
  async (data: any, context: any) => {
    try {
      const {
        uid,
        plan,
        currency = 'usd',
        extraTeams = 0,
        schoolName,
        schoolCountry,
        schoolType,
        schoolWebsite,
        courseType,
        coursePurpose,
        specificFocus,
      } = data;

      if (!uid || !plan) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing uid or plan'
        );
      }
      // Block duplicate paid schools for the same owner
      const existing = await admin
        .firestore()
        .collection('schools')
        .where('ownerUid', '==', uid)
        .limit(1)
        .get();

      if (!existing.empty) {
        const sch = existing.docs[0].data() as any;
        if (sch?.billing?.paymentStatus === 'paid') {
          throw new functions.https.HttpsError(
            'already-exists',
            'You already manage a paid school. Contact support to change plan or add seats.'
          );
        }
        // If not paid, it likely doesn't exist (you only create on payment),
        // but keeping this here is future-proof if you ever pre-create drafts.
      }

      // Authoritative pricing (in cents)
      const baseByPlan: Record<string, number> = {
        free: 0,
        license: 9900,
        class: 19900,
        trylicense: 10000,
        tryschool: 50000,
        // license: 100,
        tournament: 29900,
        pro: 34900,
        school: 34900,
      };
      const base = baseByPlan[plan] ?? 19900;
      const addOns = Math.max(0, Number(extraTeams) || 0) * 3000;
      const amount = base + addOns;
      // fetch email safely on the server (preferred) to avoid client tampering
      const userSnap = await admin.firestore().doc(`users/${uid}`).get();
      const email = userSnap.get('email') || undefined;
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        customer_email: email, // <— add this
        customer_creation: 'always', // <— makes a Customer for future billing
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `NWG ${
                  plan.charAt(0).toUpperCase() + plan.slice(1)
                } Plan`,
                description: addOns
                  ? `Includes ${extraTeams} extra team(s)`
                  : undefined,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        // IMPORTANT: your domain here
        success_url:
          'https://newworld-game.org/join-success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://newworld-game.org/join-success?canceled=1', // <— was /join?cancelled=1
        client_reference_id: uid, // binds to user
        metadata: {
          uid,
          plan,
          currency,
          extraTeams: String(extraTeams),
          schoolName,
          schoolCountry,
          schoolType,
          schoolWebsite,
          email,
          courseType: (courseType ?? '').toString().slice(0, 500),
          coursePurpose: (coursePurpose ?? '').toString().slice(0, 500),
          specificFocus: (specificFocus ?? '').toString().slice(0, 500),
        },
      });
      // after `const session = await stripe.checkout.sessions.create(...);`
      await admin
        .firestore()
        .doc(`payments/${session.id}`)
        .set(
          {
            sessionId: session.id,
            uid,
            plan,
            currency,
            extraTeams: Number(extraTeams || 0),
            amountExpected: amount,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            courseType: courseType || '',
            coursePurpose: coursePurpose || '',
            specificFocus: specificFocus || '',
          },
          { merge: true }
        );

      return { url: session.url };
    } catch (err) {
      console.error('Error createNwgSchoolCheckoutSession', err);
      throw new functions.https.HttpsError(
        'internal',
        'Unable to create session'
      );
    }
  }
);

export const stripeWebhook = functions.https.onRequest(
  async (req: any, res: any) => {
    let event;
    try {
      const sig = req.headers['stripe-signature'] as string;
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        functions.config()['stripe'].webhook_secret_earthgame
      );
    } catch (err) {
      console.error('❌ Webhook signature verify failed:', err);
      return res.status(400).send(`Webhook Error: ${err}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const amountPaid = session.amount_total ?? 0;
      const md = (session.metadata || {}) as any;
      const customerEmail =
        session.customer_details?.email ||
        (session as any).customer_email ||
        md.email ||
        null;

      const {
        uid,
        plan,
        currency,
        extraTeams,
        schoolName,
        schoolCountry,
        schoolType,
        schoolWebsite,
        courseType,
        coursePurpose,
        specificFocus,
      } = md;

      const paymentDoc = admin
        .firestore()
        .collection('payments')
        .doc(session.id);
      const snap = await paymentDoc.get();
      const alreadyPaid =
        snap.exists &&
        (snap.data()!['status'] === 'paid' || snap.data()!['paid'] === true);
      if (!alreadyPaid) {
        await paymentDoc.set(
          {
            sessionId: session.id,
            uid,
            plan,
            currency,
            extraTeams: Number(extraTeams || 0),
            amountPaid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'paid',
            paid: true,
            email: customerEmail,
          },
          { merge: true }
        );
      } else {
        // already processed
        return res.json({ received: true, duplicate: true });
      }
      // BEFORE creating a new schoolRef in the webhook:
      const existingSchoolSnap = await admin
        .firestore()
        .collection('schools')
        .where('ownerUid', '==', uid)
        .limit(1)
        .get();

      if (!existingSchoolSnap.empty) {
        // School already exists; just link the payment to it and return
        const existingId = existingSchoolSnap.docs[0].id;
        await paymentDoc.set({ schoolId: existingId }, { merge: true });
        if (uid) {
          await admin
            .firestore()
            .doc(`users/${uid}`)
            .set(
              { role: 'schoolAdmin', schoolId: existingId, status: 'active' },
              { merge: true }
            );
        }
        return res.json({ received: true, reused: true });
      } // ensure user doc has email
      if (uid && customerEmail) {
        await admin
          .firestore()
          .doc(`users/${uid}`)
          .set({ email: customerEmail }, { merge: true });
      }

      // Create the school (server authority)
      const schoolRef = admin.firestore().collection('schools').doc();
      const baseByPlan: Record<string, number> = {
        free: 0,
        license: 9900,
        class: 19900,
        // license: 100,
        tournament: 29900,
        pro: 34900,
        school: 34900,
      };
      const base = baseByPlan[plan] ?? 29900;
      const addOns = Number(extraTeams || 0) * 3000;
      const total = base + addOns;

      await schoolRef.set({
        id: schoolRef.id,
        name: schoolName || 'Untitled School',
        ownerUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        meta: {
          country: schoolCountry || null,
          type: schoolType || null,
          website: schoolWebsite || null,
          courseType: courseType || null,
          coursePurpose: coursePurpose || null,
          specificFocus: specificFocus || null,
        },
        billing: {
          plan,
          currency: currency || 'usd',
          basePrice: base / 100,
          extraTeams: Number(extraTeams || 0),
          addOns: addOns / 100,
          total: total / 100,
          paymentStatus: 'paid',
          stripe: {
            sessionId: session.id,
            paymentIntent: session.payment_intent || null,
          },
        },
      });
      await paymentDoc.set({ schoolId: schoolRef.id }, { merge: true });

      // finalize user role
      if (uid) {
        await admin.firestore().doc(`users/${uid}`).set(
          {
            role: 'schoolAdmin',
            schoolId: schoolRef.id,
            status: 'active',
          },
          { merge: true }
        );
      }

      // (Optional) send emails here…
    }

    res.json({ received: true });
  }
);
// functions/src/index.ts
export const getCheckoutStatus = functions.https.onCall(
  async (data: any, context: any) => {
    const { sessionId } = data || {};
    if (!sessionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'sessionId is required'
      );
    }

    const snap = await admin.firestore().doc(`payments/${sessionId}`).get();
    if (!snap.exists) {
      return { exists: false, paid: false };
    }

    const p = snap.data() || {};
    // Normalize a simple shape for the client
    return {
      exists: true,
      paid: p['status'] === 'paid' || p['paid'] === true,
      amountPaid: p['amountPaid'] ?? null,
      currency: p['currency'] ?? 'usd',
      plan: p['plan'] ?? null,
      extraTeams: p['extraTeams'] ?? 0,
      schoolId: p['schoolId'] ?? null, // ← added by webhook update below
      createdAt: p['createdAt'] ?? null,
    };
  }
);

export const gslRegistrationEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.email,
      from: 'newworld@newworld-game.org',
      templateId: functions.config()['sendgrid'].template_gsl_registration,
      dynamic_template_data: {
        subject: data.subject,
        username: `${data.firstName} ${data.lastName}`,
      },
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error: any) {
      console.error('Error sending user email:', error);
      return { success: false, error: error.message };
    }
  }
);

export const gslAdminNotificationEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const msg = {
      to: data.emailAdmin, // Replace with the actual admin email
      from: 'newworld@newworld-game.org',
      templateId: functions.config()['sendgrid'].template_gsl_admin,
      dynamic_template_data: {
        subject: data.subject,
        username: `${data.firstName} ${data.lastName}`,
        email: data.email,
        organization: data.organization || 'N/A',
        registration_date: data.registrationDate || new Date().toISOString(),
        phone: data.phone || 'N/A',
        address: data.address || 'N/A',
        city: data.city || 'NA',
        stateProvince: data.stateProvince || 'NA',
        country: data.country || 'NA',
        age: data.age || 'N/A',
        paid_amount: data.paidAmount || 0,
        occupation: data.occupation || 'N/A',
        why_attend: data.whyAttend || 'N/A',
        focus_topic: data.focusTopic || 'N/A',
        target_group: data.targetGroup || 'N/A',
        lab_mode: data.labMode || 'N/A',
        letter_of_invitation: data.letterOfInvitation || 'N/A',
      },
    };

    try {
      await sgMail.send(msg);
      return { success: true };
    } catch (error: any) {
      console.error('Error sending admin email:', error);
      return { success: false, error: error.message };
    }
  }
);

async function runGslRegistrationEmail(data: any) {
  // same data structure you used in your "gslRegistrationEmail" function
  const msg = {
    to: data.email,
    from: 'newworld@newworld-game.org',
    templateId: functions.config()['sendgrid'].template_gsl_registration,
    dynamic_template_data: {
      subject: data.subject || 'GSL Registration Confirmation',
      username: `${data.firstName} ${data.lastName}`,
    },
  };
  await sgMail.send(msg);
}
async function runGslAdminNotificationEmail(data: any) {
  // Notice we pass in `data.email` as the `to`, which is the admin address
  const msg = {
    to: data.emailAdmin,
    from: 'newworld@newworld-game.org',
    templateId: functions.config()['sendgrid'].template_gsl_admin,
    dynamic_template_data: {
      subject: 'New GSL 2025 Registration (Paid)',
      username: `${data.firstName} ${data.lastName}`,
      email: data.email, // or data.participantEmail if you want
      organization: data.organization || 'N/A',
      registration_date: data.registrationDate || new Date().toISOString(),
      phone: data.phone || 'N/A',
      address: data.address || 'N/A',
      city: data.city || 'NA',
      stateProvince: data.stateProvince || 'NA',
      country: data.country || 'NA',
      age: data.age || 'N/A',
      paid_amount: data.paidAmount || 0,
      occupation: data.occupation || 'N/A',
      why_attend: data.whyAttend || 'N/A',
      focus_topic: data.focusTopic || 'N/A',
      target_group: data.targetGroup || 'N/A',
      lab_mode: data.labMode || 'N/A',
      letter_of_invitation: data.letterOfInvitation || 'N/A',
    },
  };
  await sgMail.send(msg);
}

exports.uploadImage = functions.https.onRequest((req: any, res: any) => {
  console.log('Request received with method:', req.method);
  res.set('Access-Control-Allow-Origin', 'http://localhost:4200');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');
  // cors(req, res, () => {
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request');

    // Sending response for preflight request
    return res.status(204).send('');
  }

  if (req.method !== 'POST') {
    console.log('This method is not allowed', req.method);
    return res.status(405).send('Method Not Allowed');
  }
  // if (req.method === 'POST') {
  //   console.log('This is a post method', req.method);
  //   return res.status(200).send('Method Processed!');
  // }
  const busboy = new Busboy({ headers: req.headers });
  const tmpdir = os.tmpdir();
  let fileWrites: any = [];
  let publicUrls = [];

  busboy.on(
    'file',
    (
      fieldname: any,
      file: any,
      filename: any,
      encoding: any,
      mimetype: any
    ) => {
      const filepath = path.join(tmpdir, filename);
      // const filenamePath = `ckeditor-images/${filename}`;
      const writeStream = fs.createWriteStream(filepath);

      file.pipe(writeStream);

      const promise = new Promise((resolve, reject) => {
        file.on('end', () => {
          writeStream.end();
        });

        writeStream.on('finish', () => {
          const readStream = fs.createReadStream(filepath);
          readStream.pipe(
            bucket
              .file(filename)
              .createWriteStream({
                metadata: {
                  contentType: mimetype,
                },
              })
              .on('error', (error: any) => {
                console.error('Error uploading to GCS:', error);
                reject(error);
              })
              .on('finish', async () => {
                try {
                  const uploadedFile = bucket.file(filename);
                  await uploadedFile.makePublic();
                  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
                  console.log('File uploaded and made public:', publicUrl);
                  resolve(publicUrl);
                } catch (error) {
                  console.error('Error making file public:', error);
                  reject(error);
                }
              })
          );
        });

        writeStream.on('error', (error: any) => {
          console.error('Error writing file on server:', error);
          reject(error);
        });
      });

      fileWrites.push(promise);
    }
  );

  busboy.on('finish', async () => {
    try {
      publicUrls = await Promise.all(fileWrites);
      console.log('All files have been processed and uploaded', publicUrls);
      res.status(200).send({ urls: publicUrls });
    } catch (error) {
      console.error('Failed to upload one or more files:', error);
      res.status(500).send('Error uploading one or more files');
    }
  });

  busboy.end(req.rawBody);
  // });
});

export const createGoogleMeet = functions.https.onCall(
  async (data, context) => {
    try {
      const { solutionId, title, startTime, endTime } = data;

      // Validate input
      if (!solutionId || !title) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'solutionId and title are required.'
        );
      }

      // Retrieve the Base64-encoded service account key from Firebase Functions config
      const base64Encoded = functions.config()['googleapi'].service_account_key;
      if (!base64Encoded) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Service account key not configured.'
        );
      }

      // Decode the Base64 string
      const jsonString = Buffer.from(base64Encoded, 'base64').toString('utf8');

      // Parse JSON
      const serviceAccount = JSON.parse(jsonString);

      // Impersonate a user in your Google Workspace domain
      const userEmail = 'newworld@newworld-game.org'; // Replace with the user to impersonate

      const jwtClient = new google.auth.JWT(
        serviceAccount.client_email,
        undefined,
        serviceAccount.private_key,
        ['https://www.googleapis.com/auth/calendar'],
        userEmail // User to impersonate
      );

      // Authorize the client
      await jwtClient.authorize();

      // Initialize the Calendar API
      const calendar = google.calendar({ version: 'v3', auth: jwtClient });

      // Create a unique requestId to prevent duplication
      const requestId = `meet-${solutionId}-${Date.now()}`;

      // Define event start and end times
      const eventStartTime = startTime ? new Date(startTime) : new Date();
      const eventEndTime = endTime
        ? new Date(endTime)
        : new Date(eventStartTime.getTime() + 60 * 60 * 1000); // Default +1 hour

      // Create the event with Google Meet link
      const event = {
        summary: title || 'Team Meeting',
        description: `Meeting for solution: ${solutionId}`,
        start: {
          dateTime: eventStartTime.toISOString(),
          timeZone: 'UTC', // Specify your desired time zone
        },
        end: {
          dateTime: eventEndTime.toISOString(),
          timeZone: 'UTC', // Specify your desired time zone
        },
        visibility: 'public', // Set visibility to public
        conferenceData: {
          createRequest: {
            requestId: requestId,
            conferenceSolutionKey: { type: 'hangoutsMeet' }, // Correct conference type
          },
        },
      };

      // Log the event object for debuggin       g
      console.log('Creating event with data:', JSON.stringify(event, null, 2));

      // Insert the event into the calendar
      const response = await calendar.events.insert({
        calendarId: 'primary', // Use 'primary' or a specific calendar ID if using a shared calendar
        requestBody: event,
        conferenceDataVersion: 1,
      });

      // Log the response for debugging
      console.log(
        'Calendar API response:',
        JSON.stringify(response.data, null, 2)
      );

      // Extract the Meet link
      const hangoutLink = response.data.hangoutLink;

      if (!hangoutLink) {
        throw new functions.https.HttpsError(
          'internal',
          'Failed to create Google Meet link.'
        );
      }

      return {
        solutionId,
        hangoutLink,
      };
    } catch (error: any) {
      console.error('Error creating Google Meet link:', error);
      throw new functions.https.HttpsError('unknown', error.message, error);
    }
  }
);
