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
import { GoogleGenAI } from '@google/genai';
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
const pptxgen = require('pptxgenjs');
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
const GSL_2026_DATE_RANGE = 'June 15-24, 2026';
const GSL_2026_CONTACT_EMAIL = 'info@newworld-game.org';
const GSL_2026_CONFIRMATION_SUBJECT =
  'Thanks for registering for the Global Solutions Lab 2026';
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
const WEEKLY_EMAIL_AUTOMATION_DOC_PATH =
  'admin_settings/weekly_email_automation';
const DEFAULT_AUTOMATION_TIMEZONE = 'America/Los_Angeles';
const DEFAULT_WEEKLY_REMINDER_SUBJECT =
  'Your weekly NewWorld Game progress';
const DEFAULT_WEEKLY_REMINDER_INTRO_HTML =
  '<p>Keep the momentum going—here are your in-progress solutions.</p>';
const WEEKLY_ACTIVITY_WINDOW_DAYS = 7;

type AutomationScheduleKey =
  | 'weeklyReminder'
  | 'weeklyActivity'
  | 'aiInsightsBrief';

type AutomationScheduleConfig = {
  enabled?: boolean;
  dayOfWeek?: string;
  time?: string;
  recipientEmails?: string[];
  subject?: string;
  introHtml?: string;
  criteria?: string;
  fallbackCriteria?: string;
  includeUnsubscribed?: boolean;
  excludeEmails?: string[];
  lastRunAt?: any;
  lastRunStatus?: string;
  lastRunSummary?: string;
  lastError?: string;
  lastAttemptKey?: string;
  lastSuccessKey?: string;
  lastJobId?: string;
  lastLogId?: string;
};

type WeeklyEmailAutomationDocument = {
  timezone?: string;
  weeklyReminder?: AutomationScheduleConfig;
  weeklyActivity?: AutomationScheduleConfig;
  aiInsightsBrief?: AutomationScheduleConfig;
};

type UserSolutionStatsForAutomation = {
  started: number;
  submitted: number;
  lastTrackedEditMs: number;
};

function normalizeEmailForAutomation(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isValidEmailForAutomation(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

function normalizeRecipientEmailsForAutomation(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const deduped = new Set<string>();
  for (const raw of input) {
    const email = normalizeEmailForAutomation(raw);
    if (email && isValidEmailForAutomation(email)) {
      deduped.add(email);
    }
  }
  return Array.from(deduped);
}

function normalizeParticipantEmailsForAutomation(input: unknown): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input
      .map((item: any) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return String(item.email || item.name || '').trim();
        }
        return '';
      })
      .filter(Boolean)
      .map((email) => normalizeEmailForAutomation(email));
  }

  if (typeof input === 'object') {
    return Object.values(input as Record<string, unknown>)
      .map((value) => normalizeEmailForAutomation(value))
      .filter(Boolean);
  }

  return [];
}

function parseDateMMDDYYYYForAutomation(value?: string): number {
  if (!value) return 0;
  const raw = value.trim();
  const native = Date.parse(raw);
  if (!Number.isNaN(native)) return native;

  const separator = raw.includes('/') ? '/' : raw.includes('-') ? '-' : '';
  if (!separator) return 0;

  const [mm, dd, yyyy] = raw.split(separator);
  const parsed = new Date(
    Number.parseInt(yyyy || '', 10),
    Number.parseInt(mm || '', 10) - 1,
    Number.parseInt(dd || '', 10)
  ).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseDateToMsForAutomation(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof (value as any)?.toDate === 'function') {
    return (value as any).toDate().getTime();
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const native = Date.parse(value);
    if (!Number.isNaN(native)) return native;
    return parseDateMMDDYYYYForAutomation(value);
  }
  return 0;
}

function solutionTrackedEditMsForAutomation(solution: any): number {
  return parseDateToMsForAutomation(solution?.lastSubstantiveEditAt);
}

function solutionActivityMsForAutomation(solution: any): number {
  return solutionTrackedEditMsForAutomation(solution);
}

function buildUserSolutionStatsForAutomation(
  solutions: any[]
): Map<string, UserSolutionStatsForAutomation> {
  const solutionsByEmail = new Map<string, any[]>();

  for (const solution of solutions) {
    const emails = new Set(
      normalizeParticipantEmailsForAutomation(solution?.participants)
    );

    emails.forEach((email) => {
      if (!email) return;
      if (!solutionsByEmail.has(email)) {
        solutionsByEmail.set(email, []);
      }
      solutionsByEmail.get(email)?.push(solution);
    });
  }

  const statsByEmail = new Map<string, UserSolutionStatsForAutomation>();
  for (const [email, entries] of solutionsByEmail.entries()) {
    const ordered = [...entries].sort(
      (a, b) => solutionActivityMsForAutomation(b) - solutionActivityMsForAutomation(a)
    );
    const submitted = ordered.filter((solution) => solution?.finished === 'true')
      .length;
    const lastTrackedEditMs = ordered.reduce(
      (latest, solution) =>
        Math.max(latest, solutionTrackedEditMsForAutomation(solution)),
      0
    );

    statsByEmail.set(email, {
      started: ordered.length,
      submitted,
      lastTrackedEditMs,
    });
  }

  return statsByEmail;
}

function hasGoalForAutomation(user: any): boolean {
  return Boolean(String(user?.goal || '').trim());
}

function isRandomLookingNameTokenForAutomation(token: string): boolean {
  const clean = String(token || '').replace(/[^a-zA-Z]/g, '');
  if (clean.length < 14) return false;

  const upperCount = (clean.match(/[A-Z]/g) || []).length;
  const lowerCount = (clean.match(/[a-z]/g) || []).length;
  if (upperCount < 3 || lowerCount < 6) return false;

  const upperRatio = upperCount / clean.length;
  const caseTransitions = clean
    .slice(1)
    .split('')
    .reduce((count, char, index) => {
      const previous = clean[index];
      const changedCase =
        (/[A-Z]/.test(previous) && /[a-z]/.test(char)) ||
        (/[a-z]/.test(previous) && /[A-Z]/.test(char));
      return count + (changedCase ? 1 : 0);
    }, 0);

  const hasGeneratedCaseMix =
    clean.length >= 18 &&
    upperRatio > 0.18 &&
    upperRatio < 0.82 &&
    caseTransitions >= 4;

  const hasDenseMixedCase =
    upperRatio > 0.25 && upperRatio < 0.75 && caseTransitions >= 3;

  return hasGeneratedCaseMix || hasDenseMixedCase;
}

function hasSuspiciousNameFormatForAutomation(user: any): boolean {
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  const firstRandom = isRandomLookingNameTokenForAutomation(first);
  const lastRandom = isRandomLookingNameTokenForAutomation(last);
  if (firstRandom && lastRandom) return true;

  const combinedLength = `${first}${last}`.replace(/[^a-zA-Z]/g, '').length;
  return combinedLength >= 24 && (firstRandom || lastRandom);
}

function isAdminUserForAutomation(user: any): boolean {
  const role = String(user?.role || '').trim().toLowerCase();
  const adminFlag = String(user?.admin || '').trim().toLowerCase();
  return adminFlag === 'true' || role === 'admin' || role === 'schooladmin';
}

function isLikelyBotForAutomation(
  user: any,
  statsByEmail: Map<string, UserSolutionStatsForAutomation>
): boolean {
  if (hasSuspiciousNameFormatForAutomation(user)) {
    return true;
  }

  if (isAdminUserForAutomation(user)) return false;
  if (hasGoalForAutomation(user)) return false;

  const stats =
    statsByEmail.get(normalizeEmailForAutomation(user?.email)) || {
      started: 0,
      submitted: 0,
      lastTrackedEditMs: 0,
    };
  const hasSolutionActivity = stats.started > 0 || stats.submitted > 0;
  if (hasSolutionActivity) return false;

  return false;
}

function buildUserDirectoryForAutomation(users: any[]) {
  const directory = new Map<string, { name: string; email: string; avatarUrl?: string }>();

  for (const user of users) {
    const email = normalizeEmailForAutomation(user?.email);
    if (!email) continue;

    const first = String(user?.firstName || '').trim();
    const last = String(user?.lastName || '').trim();
    const fullName = `${first} ${last}`.trim() || email;
    const avatarUrl = String(user?.profilePicture?.downloadURL || '').trim();

    directory.set(email, {
      name: fullName,
      email,
      ...(avatarUrl ? { avatarUrl } : {}),
    });
  }

  return directory;
}

async function loadAuthLastSignInMapsForAutomation(users: any[]) {
  const identifiers: Array<{ uid?: string; email?: string }> = [];
  for (const user of users) {
    const uid = String(user?.uid || '').trim();
    const email = normalizeEmailForAutomation(user?.email);
    if (uid) {
      identifiers.push({ uid });
    } else if (email) {
      identifiers.push({ email });
    }
  }

  const byUid = new Map<string, string>();
  const byEmail = new Map<string, string>();

  for (let index = 0; index < identifiers.length; index += 100) {
    const batch = identifiers.slice(index, index + 100).map((identifier) =>
      identifier.uid ? { uid: identifier.uid } : { email: identifier.email! }
    );

    try {
      const result = await admin.auth().getUsers(batch as any);
      result.users.forEach((record) => {
        const lastSignInTime = String(record.metadata.lastSignInTime || '').trim();
        if (!lastSignInTime) return;
        byUid.set(record.uid, lastSignInTime);
        if (record.email) {
          byEmail.set(normalizeEmailForAutomation(record.email), lastSignInTime);
        }
      });
    } catch (error) {
      console.error('Unable to load auth metadata for automation', error);
    }
  }

  return { byUid, byEmail };
}

function userActivityMsForAutomation(
  user: any,
  authByUid: Map<string, string>,
  authByEmail: Map<string, string>
): number {
  const authByUidValue = user?.uid ? authByUid.get(String(user.uid).trim()) : '';
  const authByEmailValue = authByEmail.get(
    normalizeEmailForAutomation(user?.email)
  );

  return parseDateToMsForAutomation(
    user?.lastActiveAt || authByUidValue || authByEmailValue || user?.lastLogin
  );
}

function solutionBelongsToRealUsersForAutomation(
  solution: any,
  realUserEmailSet: Set<string>
): boolean {
  const participantEmails = normalizeParticipantEmailsForAutomation(
    solution?.participants
  );
  const authorEmail = normalizeEmailForAutomation(solution?.authorEmail);
  const ownerEmail = normalizeEmailForAutomation(solution?.ownerEmail);

  return [...participantEmails, authorEmail, ownerEmail].some(
    (email) => email && realUserEmailSet.has(email)
  );
}

function solutionWorkedInRangeForAutomation(
  solution: any,
  startMs: number,
  endMs: number
): boolean {
  const activityMs = solutionActivityMsForAutomation(solution);
  return activityMs >= startMs && activityMs < endMs;
}

function formatDateMDYForAutomation(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

function formatDateTimeForAutomation(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function percentChangeForAutomation(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function percentLabelForAutomation(value: number): string {
  return `${value > 0 ? '+' : ''}${value}%`;
}

function escapeHtmlForAutomation(value: unknown): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstNameOfAutomationUser(user: any): string {
  return String(
    user?.firstName || String(user?.displayName || '').split(' ')[0] || ''
  ).trim();
}

function formatDateForAutomationEmail(value: any): string {
  const date =
    value && typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getPendingSolutionsForAutomation(
  email: string,
  solutions: any[],
  directory: Map<string, { name: string; email: string }>
) {
  const normalized = normalizeEmailForAutomation(email);
  const fallbackImage =
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2Fgeneric-image.jpg?alt=media&token=c4e8d393-50e6-4080-bfcd-923848db7007';

  return solutions
    .filter((solution) => {
      const emails = normalizeParticipantEmailsForAutomation(solution?.participants);
      return emails.includes(normalized);
    })
    .filter((solution) => solution?.finished !== 'true')
    .map((solution) => {
      const rawTime = solution?.updatedAt ?? solution?.createdAt ?? '';
      const lastUpdated =
        rawTime && typeof rawTime?.toDate === 'function'
          ? rawTime.toDate().toISOString()
          : rawTime;

      const participants = normalizeParticipantEmailsForAutomation(
        solution?.participants
      ).map((participantEmail) => {
        const fromDirectory = directory.get(participantEmail);
        return {
          name: fromDirectory?.name || participantEmail,
          email: participantEmail,
        };
      });

      return {
        title: String(solution?.title || 'Untitled').trim() || 'Untitled',
        summary: String(solution?.description || '').slice(0, 220),
        image: String(solution?.image || '').trim() || fallbackImage,
        lastUpdated,
        ctaUrl: `${APP_BASE_URL}/dashboard/${String(solution?.solutionId || '').trim()}`,
        participants,
        meetLink: String(
          solution?.meetLink || solution?.meetingLink || solution?.meetURL || ''
        ),
      };
    });
}

async function sendAutomatedWeeklyReminderEmail(data: {
  email: string;
  subject: string;
  userFirstName: string;
  introHtml: string;
  solutions: any[];
  author: string;
  unsubscribeUrl: string;
}) {
  const msg = {
    to: data.email,
    from: 'newworld@newworld-game.org',
    templateId: TEMPLATE_WEEKLY_REMINDER,
    dynamic_template_data: {
      subject: data.subject,
      userFirstName: data.userFirstName,
      intro_html: data.introHtml,
      hasSolutions: Array.isArray(data.solutions) && data.solutions.length > 0,
      solutions: data.solutions,
      homeUrl: APP_BASE_URL,
      author: data.author || 'NewWorld Game',
      unsubscribe_url: data.unsubscribeUrl,
      year: new Date().getFullYear(),
    },
  };

  await sgMail.send(msg as any);
}

function unsubscribeUrlForAutomation(email: string): string {
  return `${APP_BASE_URL}/unsubscribe?e=${encodeURIComponent(
    normalizeEmailForAutomation(email)
  )}`;
}

function getAutomationTimezone(timeZone: unknown): string {
  const candidate = String(timeZone || '').trim() || DEFAULT_AUTOMATION_TIMEZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return DEFAULT_AUTOMATION_TIMEZONE;
  }
}

function parseAutomationTime(value: unknown): { hour: number; minute: number } {
  const raw = String(value || '').trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return { hour: 9, minute: 0 };

  const [hour, minute] = raw.split(':').map((part) => Number.parseInt(part, 10));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return { hour: 9, minute: 0 };
  }

  return {
    hour: Math.max(0, Math.min(23, hour)),
    minute: Math.max(0, Math.min(59, minute)),
  };
}

function getTimeZoneDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value || '';

  return {
    weekday: read('weekday').toLowerCase(),
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: Number.parseInt(read('hour') || '0', 10),
    minute: Number.parseInt(read('minute') || '0', 10),
  };
}

function getDueAutomationRun(
  schedule: AutomationScheduleConfig | undefined,
  timeZone: string,
  now: Date = new Date()
) {
  if (!schedule?.enabled) return { due: false, runKey: '' };

  const zonedNow = getTimeZoneDateParts(now, timeZone);
  if (zonedNow.weekday !== String(schedule.dayOfWeek || '').toLowerCase()) {
    return { due: false, runKey: '' };
  }

  const scheduled = parseAutomationTime(schedule.time);
  const currentMinutes = zonedNow.hour * 60 + zonedNow.minute;
  const scheduledMinutes = scheduled.hour * 60 + scheduled.minute;
  if (currentMinutes < scheduledMinutes) {
    return { due: false, runKey: '' };
  }

  const normalizedTime = `${String(scheduled.hour).padStart(2, '0')}:${String(
    scheduled.minute
  ).padStart(2, '0')}`;
  const runKey = `${zonedNow.year}-${zonedNow.month}-${zonedNow.day}@${normalizedTime}`;
  if (String(schedule.lastAttemptKey || '') === runKey) {
    return { due: false, runKey };
  }

  return { due: true, runKey };
}

async function claimAutomationAttempt(
  scheduleKey: AutomationScheduleKey,
  runKey: string
): Promise<boolean> {
  const db = admin.firestore();
  const ref = db.doc(WEEKLY_EMAIL_AUTOMATION_DOC_PATH);

  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const doc = (snap.data() || {}) as WeeklyEmailAutomationDocument;
    const schedule = (doc[scheduleKey] || {}) as AutomationScheduleConfig;
    if (String(schedule.lastAttemptKey || '') === runKey) {
      return false;
    }

    transaction.set(
      ref,
      {
        [scheduleKey]: {
          ...schedule,
          lastAttemptKey: runKey,
          lastRunStatus: 'running',
          lastRunSummary: '',
          lastError: '',
        },
      },
      { merge: true }
    );
    return true;
  });
}

function buildWeeklyActivityEmailData(
  users: any[],
  solutions: any[],
  authMaps: { byUid: Map<string, string>; byEmail: Map<string, string> }
) {
  const nowMs = Date.now();
  const weekMs = WEEKLY_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const windowStartMs = nowMs - weekMs;
  const previousWeekStartMs = windowStartMs - weekMs;
  const statsByEmail = buildUserSolutionStatsForAutomation(solutions);

  const reportingUsers = users.filter(
    (user) => !isLikelyBotForAutomation(user, statsByEmail)
  );
  const reportingUserEmailSet = new Set(
    reportingUsers
      .map((user) => normalizeEmailForAutomation(user?.email))
      .filter(Boolean)
  );

  const weeklyActiveUsers = reportingUsers.filter(
    (user) =>
      userActivityMsForAutomation(user, authMaps.byUid, authMaps.byEmail) >=
      windowStartMs
  ).length;
  const previousWeeklyActiveUsers = reportingUsers.filter((user) => {
    const activityMs = userActivityMsForAutomation(
      user,
      authMaps.byUid,
      authMaps.byEmail
    );
    return activityMs >= previousWeekStartMs && activityMs < windowStartMs;
  }).length;

  const weeklyNewSignups = reportingUsers.filter(
    (user) =>
      parseDateMMDDYYYYForAutomation(String(user?.dateJoined || '')) >=
      windowStartMs
  ).length;
  const previousWeeklyNewSignups = reportingUsers.filter((user) => {
    const joinedAt = parseDateMMDDYYYYForAutomation(String(user?.dateJoined || ''));
    return joinedAt >= previousWeekStartMs && joinedAt < windowStartMs;
  }).length;

  const totalOpenSolutions = solutions.filter((solution) => {
    if (solution?.finished === 'true') return false;
    return solutionBelongsToRealUsersForAutomation(
      solution,
      reportingUserEmailSet
    );
  }).length;

  const weeklyWorkedSolutions = solutions.filter(
    (solution) =>
      solutionBelongsToRealUsersForAutomation(
        solution,
        reportingUserEmailSet
      ) &&
      solutionWorkedInRangeForAutomation(solution, windowStartMs, nowMs)
  ).length;
  const previousWeeklyWorkedSolutions = solutions.filter(
    (solution) =>
      solutionBelongsToRealUsersForAutomation(
        solution,
        reportingUserEmailSet
      ) &&
      solutionWorkedInRangeForAutomation(
        solution,
        previousWeekStartMs,
        windowStartMs
      )
  ).length;

  const weeklyActiveRate =
    reportingUsers.length > 0
      ? Math.round((weeklyActiveUsers / reportingUsers.length) * 100)
      : 0;

  const workedSolutions = solutions
    .filter(
      (solution) =>
        solutionBelongsToRealUsersForAutomation(
          solution,
          reportingUserEmailSet
        ) &&
        solutionWorkedInRangeForAutomation(solution, windowStartMs, nowMs)
    )
    .sort(
      (a, b) => solutionActivityMsForAutomation(b) - solutionActivityMsForAutomation(a)
    )
    .slice(0, 12)
    .map((solution) => ({
      title:
        String(solution?.title || 'Untitled').trim() || 'Untitled',
      description: String(solution?.description || '').trim(),
      solutionArea: String(solution?.solutionArea || '').trim(),
      authorName:
        String(solution?.authorName || '').trim() ||
        normalizeEmailForAutomation(solution?.authorEmail) ||
        'Unknown author',
      lastActivityMs: solutionActivityMsForAutomation(solution),
      dashboardUrl: `${APP_BASE_URL}/dashboard/${String(solution?.solutionId || '').trim()}`,
    }));

  return {
    totalUsers: reportingUsers.length,
    weeklyActiveUsers,
    weeklyNewSignups,
    totalOpenSolutions,
    weeklyWorkedSolutions,
    previousWeeklyWorkedSolutions,
    weeklyActiveRate,
    weeklyActiveIncreasePct: percentChangeForAutomation(
      weeklyActiveUsers,
      previousWeeklyActiveUsers
    ),
    weeklySignupIncreasePct: percentChangeForAutomation(
      weeklyNewSignups,
      previousWeeklyNewSignups
    ),
    weeklyWorkedSolutionsIncreasePct: percentChangeForAutomation(
      weeklyWorkedSolutions,
      previousWeeklyWorkedSolutions
    ),
    windowStartMs,
    nowMs,
    workedSolutions,
  };
}

function buildWeeklyActivityReportHtmlForAutomation(
  report: ReturnType<typeof buildWeeklyActivityEmailData>
): string {
  const generatedAt = formatDateMDYForAutomation(report.nowMs);
  const fromDate = formatDateMDYForAutomation(report.windowStartMs);
  const toDate = formatDateMDYForAutomation(report.nowMs);
  const activeDeltaColor =
    report.weeklyActiveIncreasePct >= 0 ? '#059669' : '#dc2626';
  const signupDeltaColor =
    report.weeklySignupIncreasePct >= 0 ? '#059669' : '#dc2626';
  const workedDeltaColor =
    report.weeklyWorkedSolutionsIncreasePct >= 0 ? '#059669' : '#dc2626';
  const logoUrl = `${APP_BASE_URL}/assets/img/earth-triangle-test.png`;
  const metricCard = (
    label: string,
    value: string | number,
    detail?: string,
    detailColor = '#64748b'
  ) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbe3ef;border-radius:14px;background:#f8fafc;">
      <tr>
        <td style="padding:16px 16px 14px;vertical-align:top;">
          <div style="font-size:12px;line-height:1.4;color:#64748b;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">${escapeHtmlForAutomation(label)}</div>
          <div style="padding-top:6px;font-size:28px;line-height:1.1;font-weight:800;color:#0f172a;">${escapeHtmlForAutomation(value)}</div>
          ${
            detail
              ? `<div style="padding-top:8px;font-size:12px;line-height:1.5;color:${detailColor};font-weight:700;">${escapeHtmlForAutomation(detail)}</div>`
              : ''
          }
        </td>
      </tr>
    </table>
  `;

  const workedSolutionsHtml = report.workedSolutions.length
    ? report.workedSolutions
        .map((solution) => {
          const meta = [
            solution.authorName,
            solution.solutionArea,
            `Last written edit ${formatDateMDYForAutomation(solution.lastActivityMs)}`,
          ]
            .filter(Boolean)
            .join(' • ');
          const description = solution.description
            ? escapeHtmlForAutomation(
                solution.description.length > 180
                  ? `${solution.description.slice(0, 177)}...`
                  : solution.description
              )
            : '';

          return `
            <tr>
              <td style="padding:0 0 14px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbe3ef;border-radius:14px;background:#ffffff;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <div style="font-size:18px;line-height:1.35;font-weight:800;color:#0f172a;">
                        <a href="${escapeHtmlForAutomation(solution.dashboardUrl)}" style="color:#0f172a;text-decoration:none;">${escapeHtmlForAutomation(solution.title)}</a>
                      </div>
                      <div style="padding-top:6px;font-size:12px;line-height:1.5;color:#64748b;">${escapeHtmlForAutomation(meta)}</div>
                      ${
                        description
                          ? `<div style="padding-top:10px;font-size:14px;line-height:1.7;color:#475569;">${description}</div>`
                          : ''
                      }
                      <div style="padding-top:14px;">
                        <a href="${escapeHtmlForAutomation(solution.dashboardUrl)}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;padding:9px 14px;font-size:12px;font-weight:700;letter-spacing:.02em;">
                          Open solution
                        </a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #dbe3ef;border-radius:14px;background:#ffffff;">
            <tr>
              <td style="padding:18px;font-size:14px;line-height:1.7;color:#475569;">
                No real-user solutions had saved writing activity during this reporting window.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

  return `
    <div style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,ui-sans-serif,system-ui,Arial,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
              <tr>
                <td align="center" style="padding:0 20px 16px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                    <tr>
                      <td style="vertical-align:middle;padding-right:8px;">
                        <img src="${logoUrl}" alt="NewWorld Game" width="40" style="display:block;width:40px;max-width:40px;height:auto;">
                      </td>
                      <td style="vertical-align:middle;">
                        <span style="font-size:20px;line-height:1.1;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">NewWorld Game</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="background:#ffffff;border:1px solid #dbe3ef;border-radius:16px;overflow:hidden;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:12px 24px;background:linear-gradient(90deg,#0f766e 0%,#0ea5a3 100%);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#ecfeff;font-weight:700;">
                        Weekly Activity Report
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:22px 24px 8px;">
                        <h2 style="margin:0;color:#0f172a;font-size:24px;line-height:1.2;font-weight:800;">NewWorld Game Community Snapshot</h2>
                        <p style="margin:8px 0 0;color:#475569;font-size:13px;">
                          Reporting window: <strong>${fromDate}</strong> to <strong>${toDate}</strong>
                        </p>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
                    <tr>
                      <td style="padding:0 16px 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
                          <tr>
                            <td width="33.33%" style="padding:8px;vertical-align:top;">
                              ${metricCard('Total Users', report.totalUsers)}
                            </td>
                            <td width="33.33%" style="padding:8px;vertical-align:top;">
                              ${metricCard('Total Open Solutions', report.totalOpenSolutions)}
                            </td>
                            <td width="33.33%" style="padding:8px;vertical-align:top;">
                              ${metricCard(
                                'Solutions Worked On',
                                report.weeklyWorkedSolutions,
                                `${percentLabelForAutomation(
                                  report.weeklyWorkedSolutionsIncreasePct
                                )} vs prev week`,
                                workedDeltaColor
                              )}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 16px 6px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
                          <tr>
                            <td width="50%" style="padding:8px;vertical-align:top;">
                              ${metricCard(
                                'Weekly Active Users',
                                report.weeklyActiveUsers,
                                `${report.weeklyActiveRate}% active • ${percentLabelForAutomation(
                                  report.weeklyActiveIncreasePct
                                )} vs prev week`,
                                activeDeltaColor
                              )}
                            </td>
                            <td width="50%" style="padding:8px;vertical-align:top;">
                              ${metricCard(
                                'New Signups',
                                report.weeklyNewSignups,
                                `${percentLabelForAutomation(
                                  report.weeklySignupIncreasePct
                                )} vs prev week`,
                                signupDeltaColor
                              )}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:10px 24px 4px;">
                        <div style="font-size:12px;line-height:1.6;color:#64748b;">
                          Window: ${formatDateTimeForAutomation(
                            report.windowStartMs
                          )} to ${formatDateTimeForAutomation(report.nowMs)}
                        </div>
                        <div style="padding-top:4px;font-size:11px;line-height:1.6;color:#94a3b8;">
                          Weekly Active Users includes people who logged in or were active in the system; Solutions Worked On only counts saved writing activity.
                        </div>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:12px 24px 4px;">
                        <div style="font-size:12px;line-height:1.4;color:#0f766e;text-transform:uppercase;letter-spacing:.08em;font-weight:800;">
                          Weekly Solution Activity
                        </div>
                        <h3 style="margin:8px 0 0;font-size:22px;line-height:1.25;font-weight:800;color:#0f172a;">
                          Solutions worked on this week
                        </h3>
                        <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#475569;">
                          This list only includes solutions with saved writing activity during this reporting window. New solution creation, simple logins, and page visits are excluded.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 24px 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          ${workedSolutionsHtml}
                        </table>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:12px 24px 20px;">
                        <a href="${APP_BASE_URL}/user-management" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;">
                          Open NewWorld Game Admin
                        </a>
                      </td>
                    </tr>
                  </table>

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="border-top:1px solid #e2e8f0;padding:12px 24px;background:#f8fafc;font-size:12px;color:#64748b;">
                        Sent by <strong style="color:#0f172a;">NewWorld Game</strong> •
                        <a href="${APP_BASE_URL}" style="color:#0f766e;text-decoration:none;">newworld-game.org</a><br>
                        Generated on ${generatedAt}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendWeeklyActivityReportEmailsForAutomation(
  recipients: string[],
  subject: string,
  html: string
) {
  const validRecipients = normalizeRecipientEmailsForAutomation(recipients);
  let successCount = 0;
  let failureCount = 0;

  const finalHtml = injectHiddenPreheader(
    html,
    'NewWorld Game weekly activity summary'
  );
  const text = htmlToPlainText(finalHtml);

  for (const email of validRecipients) {
    try {
      await sgMail.send({
        to: email,
        from: 'newworld@newworld-game.org',
        subject,
        html: finalHtml,
        text,
      } as any);
      successCount += 1;
    } catch (error) {
      failureCount += 1;
      console.error('Weekly activity automation send failed', email, error);
    }
  }

  return { successCount, failureCount, recipientCount: validRecipients.length };
}

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

export const runWeeklyEmailAutomation = functions.pubsub
  .schedule('every 15 minutes')
  .timeZone('Etc/UTC')
  .onRun(async () => {
    const db = admin.firestore();
    const automationRef = db.doc(WEEKLY_EMAIL_AUTOMATION_DOC_PATH);
    const configSnap = await automationRef.get();
    if (!configSnap.exists) return null;

    const config = (configSnap.data() || {}) as WeeklyEmailAutomationDocument;
    const timezone = getAutomationTimezone(config.timezone);
    const dueRuns = [
      {
        key: 'weeklyReminder' as const,
        schedule: config.weeklyReminder || {},
        due: getDueAutomationRun(config.weeklyReminder, timezone),
      },
      {
        key: 'weeklyActivity' as const,
        schedule: config.weeklyActivity || {},
        due: getDueAutomationRun(config.weeklyActivity, timezone),
      },
      {
        key: 'aiInsightsBrief' as const,
        schedule: config.aiInsightsBrief || {},
        due: getDueAutomationRun(config.aiInsightsBrief, timezone),
      },
    ].filter((item) => item.due.due && item.due.runKey);

    if (!dueRuns.length) return null;

    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs
      .map((doc) => doc.data() || {})
      .filter((user) => normalizeEmailForAutomation(user?.email).length > 0);
    const solutionsSnap = await db.collection('solutions').get();
    const solutions = solutionsSnap.docs.map((doc) => doc.data() || {});
    const userDirectory = buildUserDirectoryForAutomation(users);
    const usersByEmail = new Map<string, any>();
    users.forEach((user) => {
      const email = normalizeEmailForAutomation(user?.email);
      if (email) usersByEmail.set(email, user);
    });

    let unsubscribed = new Set<string>();
    if (
      dueRuns.some(
        (item) => item.key === 'weeklyReminder' || item.key === 'aiInsightsBrief'
      )
    ) {
      const unsubscribedSnap = await db.collection('mailing_unsubscribes').get();
      unsubscribed = new Set(
        unsubscribedSnap.docs
          .map((doc) => normalizeEmailForAutomation(doc.data()?.email))
          .filter(Boolean)
      );
    }

    let authMaps = { byUid: new Map<string, string>(), byEmail: new Map<string, string>() };
    if (dueRuns.some((item) => item.key === 'weeklyActivity')) {
      authMaps = await loadAuthLastSignInMapsForAutomation(users);
    }

    for (const run of dueRuns) {
      const claimed = await claimAutomationAttempt(run.key, run.due.runKey);
      if (!claimed) continue;

      try {
        if (run.key === 'weeklyReminder') {
          const recipientEmails = normalizeRecipientEmailsForAutomation(
            run.schedule.recipientEmails
          );
          let sentCount = 0;
          let skippedCount = 0;
          let failureCount = 0;

          for (const email of recipientEmails) {
            const user = usersByEmail.get(email);
            if (!user || unsubscribed.has(email)) {
              skippedCount += 1;
              continue;
            }

            const pending = getPendingSolutionsForAutomation(
              email,
              solutions,
              userDirectory
            )
              .slice(0, 8)
              .map((solution) => ({
                title: solution.title,
                summary: solution.summary,
                image: solution.image,
                lastUpdated: solution.lastUpdated
                  ? formatDateForAutomationEmail(solution.lastUpdated)
                  : '',
                ctaUrl: solution.ctaUrl,
                meetLink: solution.meetLink || '',
                participants: solution.participants || [],
              }));

            try {
              await sendAutomatedWeeklyReminderEmail({
                email,
                subject:
                  String(run.schedule.subject || '').trim() ||
                  DEFAULT_WEEKLY_REMINDER_SUBJECT,
                userFirstName: firstNameOfAutomationUser(user) || 'there',
                introHtml:
                  String(run.schedule.introHtml || '').trim() ||
                  DEFAULT_WEEKLY_REMINDER_INTRO_HTML,
                solutions: pending,
                author: 'NewWorld Game automation',
                unsubscribeUrl: unsubscribeUrlForAutomation(email),
              });
              sentCount += 1;
            } catch (error) {
              failureCount += 1;
              console.error('Weekly reminder automation send failed', email, error);
            }
          }

          await automationRef.set(
            {
              weeklyReminder: {
                ...run.schedule,
                lastAttemptKey: run.due.runKey,
                lastSuccessKey: sentCount > 0 ? run.due.runKey : run.schedule.lastSuccessKey || '',
                lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
                lastRunStatus:
                  failureCount > 0
                    ? sentCount > 0
                      ? 'partial'
                      : 'failed'
                    : 'success',
                lastRunSummary: `Sent ${sentCount} reminder(s). Skipped ${skippedCount}. Failed ${failureCount}.`,
                lastError:
                  failureCount > 0
                    ? `${failureCount} reminder send(s) failed.`
                    : '',
              },
            },
            { merge: true }
          );
        }

        if (run.key === 'weeklyActivity') {
          const report = buildWeeklyActivityEmailData(users, solutions, authMaps);
          const subject = `Weekly Activity Report • ${formatDateMDYForAutomation(
            report.nowMs
          )}`;
          const html = buildWeeklyActivityReportHtmlForAutomation(report);
          const sendResult = await sendWeeklyActivityReportEmailsForAutomation(
            normalizeRecipientEmailsForAutomation(run.schedule.recipientEmails),
            subject,
            html
          );

          await automationRef.set(
            {
              weeklyActivity: {
                ...run.schedule,
                lastAttemptKey: run.due.runKey,
                lastSuccessKey:
                  sendResult.successCount > 0
                    ? run.due.runKey
                    : run.schedule.lastSuccessKey || '',
                lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
                lastRunStatus:
                  sendResult.failureCount > 0
                    ? sendResult.successCount > 0
                      ? 'partial'
                      : 'failed'
                    : 'success',
                lastRunSummary: `Sent ${sendResult.successCount} activity report(s). Failed ${sendResult.failureCount}. Solutions worked this week: ${report.weeklyWorkedSolutions}.`,
                lastError:
                  sendResult.failureCount > 0
                    ? `${sendResult.failureCount} weekly activity email(s) failed.`
                    : '',
              },
            },
            { merge: true }
          );
        }

        if (run.key === 'aiInsightsBrief') {
          const { recipients, stats } = buildAIInsightsAutomationRecipients({
            users,
            solutions,
            unsubscribedEmails: unsubscribed,
            schedule: run.schedule,
          });

          if (!recipients.length) {
            await automationRef.set(
              {
                aiInsightsBrief: {
                  ...run.schedule,
                  lastAttemptKey: run.due.runKey,
                  lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
                  lastRunStatus: 'failed',
                  lastRunSummary: `No eligible intelligence brief recipients generated. Participants checked: ${stats.totalParticipants}. Skipped unsubscribed ${stats.unsubscribed}, excluded ${stats.excluded}, without solution ${stats.noSolutions}.`,
                  lastError:
                    'No eligible recipients generated for the weekly intelligence brief.',
                },
              },
              { merge: true }
            );
            continue;
          }

          const queued = await enqueueAIInsightsBulkJob({
            recipients,
            concurrency: 4,
            createdBy: 'weekly-ai-insights-automation',
            source: 'automation',
            automationRunKey: run.due.runKey,
          });

          await automationRef.set(
            {
              aiInsightsBrief: {
                ...run.schedule,
                lastAttemptKey: run.due.runKey,
                lastSuccessKey: run.due.runKey,
                lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
                lastRunStatus: 'success',
                lastRunSummary: `Queued ${stats.finalRecipients} intelligence brief recipient(s). User-selected ${stats.userSelected}. Fallback ${stats.fallback}. Skipped unsubscribed ${stats.unsubscribed}, excluded ${stats.excluded}.`,
                lastError: '',
                lastJobId: queued.jobId,
                lastLogId: queued.logId,
              },
            },
            { merge: true }
          );
        }
      } catch (error: any) {
        console.error(`Weekly email automation failed for ${run.key}`, error);
        await automationRef.set(
          {
            [run.key]: {
              ...run.schedule,
              lastAttemptKey: run.due.runKey,
              lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
              lastRunStatus: 'failed',
              lastError: error?.message || 'Unknown automation error.',
              lastRunSummary: '',
            },
          },
          { merge: true }
        );
      }
    }

    return null;
  });

export const touchLastActive = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (_data: any, context: functions.https.CallableContext) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required.'
      );
    }

    const uid = context.auth.uid;
    const isoNow = new Date().toISOString();
    const updates = { lastActiveAt: isoNow };

    await admin.firestore().doc(`users/${uid}`).set(updates, { merge: true });

    const byUidSnap = await admin
      .firestore()
      .collection('users')
      .where('uid', '==', uid)
      .limit(10)
      .get();
    if (!byUidSnap.empty) {
      const batch = admin.firestore().batch();
      byUidSnap.docs.forEach((doc) => batch.set(doc.ref, updates, { merge: true }));
      await batch.commit();
    }

    return { success: true, lastActiveAt: isoNow };
  });

export const getAuthLastSignInMap = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth?.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required.'
      );
    }

    const requesterSnap = await admin
      .firestore()
      .doc(`users/${context.auth.uid}`)
      .get();
    const requester = requesterSnap.data() as any;
    const role = String(requester?.role || '').toLowerCase();
    const isAdmin =
      requester?.admin === 'true' || role === 'admin' || role === 'schooladmin';

    if (!isAdmin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can access auth metadata.'
      );
    }

    const requestedUids = Array.isArray(data?.uids)
      ? data.uids
          .map((uid: unknown) => String(uid || '').trim())
          .filter((uid: string) => uid.length > 0)
      : [];
    const requestedEmails = Array.isArray(data?.emails)
      ? data.emails
          .map((email: unknown) => String(email || '').trim().toLowerCase())
          .filter((email: string) => email.length > 0)
      : [];

    const uidSet = new Set<string>(requestedUids);
    const emailSet = new Set<string>(requestedEmails);
    const lastSignInByUid: Record<string, string> = {};
    const lastSignInByEmail: Record<string, string> = {};

    let pageToken: string | undefined = undefined;
    do {
      const page = await admin.auth().listUsers(1000, pageToken);
      for (const userRecord of page.users) {
        const authEmail = (userRecord.email || '').trim().toLowerCase();
        const needsUser =
          (uidSet.size === 0 || uidSet.has(userRecord.uid)) ||
          (emailSet.size > 0 && authEmail && emailSet.has(authEmail));
        if (!needsUser) continue;

        const rawLastSignIn = userRecord.metadata?.lastSignInTime || '';
        const parsedMs = rawLastSignIn ? Date.parse(rawLastSignIn) : NaN;
        const normalized = Number.isFinite(parsedMs)
          ? new Date(parsedMs).toISOString()
          : rawLastSignIn;

        if (uidSet.size === 0 || uidSet.has(userRecord.uid)) {
          lastSignInByUid[userRecord.uid] = normalized || '';
        }
        if (authEmail && (emailSet.size === 0 || emailSet.has(authEmail))) {
          lastSignInByEmail[authEmail] = normalized || '';
        }
      }

      pageToken = page.pageToken;
      const uidDone =
        uidSet.size === 0 ||
        Object.keys(lastSignInByUid).length >= uidSet.size;
      const emailDone =
        emailSet.size === 0 ||
        Object.keys(lastSignInByEmail).length >= emailSet.size;
      if (uidDone && emailDone) break;
    } while (pageToken);

    return { lastSignInByUid, lastSignInByEmail };
  });

type AIInsightsTeamMember = {
  name: string;
  email: string;
  avatarUrl?: string;
};

type AIInsightsJoinOpportunity = {
  solutionId: string;
  title: string;
  summary?: string;
  joinUrl: string;
  imageUrl?: string;
  authorName?: string;
  focusArea?: string;
};

type AIInsightsPayload = {
  userEmail: string;
  userFirstName: string;
  solutionId: string;
  solutionTitle: string;
  solutionDescription?: string;
  solutionArea?: string;
  sdgs?: string[];
  meetLink?: string;
  solutionImage?: string;
  teamMembers?: AIInsightsTeamMember[];
  joinOpportunities?: AIInsightsJoinOpportunity[];
};

// Cache structure for AI-generated content per solution
interface SolutionAIContentCache {
  solutionId: string;
  solutionTitle: string;
  fundersHtml: string;
  newsHtml: string;
  validFundersCount: number;
  validNewsCount: number;
  generatedAt: admin.firestore.Timestamp;
  periodKey: string; // e.g., "P12345" - 5-day period key for cache invalidation
}

// Get cache key based on 5-day periods (ensures weekly sends always get fresh content)
const getCurrentPeriodKey = (): string => {
  const now = new Date();
  // Use epoch time divided by 5 days to create 5-day periods
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;
  const periodNum = Math.floor(now.getTime() / fiveDaysMs);
  return `P${periodNum}`;
};

// Helper functions extracted for reuse
const cleanUrlFromLine = (line: string): string => {
  const match = line.match(/https?:\/\/[^\s<>"')]+/);
  if (!match) return '';
  return match[0].replace(/[)\].,]+$/, '');
};

const parseFunders = (text: string) => {
  const blocks = text.split(/\n\n+/).filter(b => b.trim());
  return blocks
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) return null;
      const name = lines[0]?.replace(/\*\*/g, '').trim() || '';
      const desc = lines[1]?.replace(/\*\*/g, '').trim() || '';
      const url = lines[2]?.replace(/\*\*/g, '').trim() || '';
      const cleanUrl = cleanUrlFromLine(url);
      if (!name || !cleanUrl) return null;
      return { name, desc, url: cleanUrl };
    })
    .filter(Boolean) as Array<{ name: string; desc: string; url: string }>;
};

const parseNews = (text: string) => {
  const blocks = text.split(/\n\n+/).filter(b => b.trim());
  return blocks
    .map(block => {
      const lines = block.split('\n').filter(l => l.trim());
      if (lines.length === 0) return null;
      const headline = lines[0]?.replace(/\*\*/g, '').trim() || '';
      const source = lines[1]?.replace(/\*\*/g, '').trim() || '';
      const urlLine = lines[2]?.replace(/\*\*/g, '').trim() || '';
      const relevance = lines[3]?.replace(/\*\*/g, '').trim() || '';
      const articleUrl = cleanUrlFromLine(urlLine);
      if (!headline || !articleUrl) return null;
      return { headline, source, relevance, url: articleUrl };
    })
    .filter(Boolean) as Array<{
      headline: string;
      source: string;
      relevance: string;
      url: string;
    }>;
};

const isUrlReachable = async (url: string, timeoutMs = 3000): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NewWorldGameBot/1.0; +https://newworld-game.org)',
      },
    });
    clearTimeout(timeoutId);
    if (response.status === 405) {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller2.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; NewWorldGameBot/1.0; +https://newworld-game.org)',
          Range: 'bytes=0-1024',
        },
      });
      clearTimeout(timeoutId2);
      return getResponse.status >= 200 && getResponse.status < 400;
    }
    return response.status >= 200 && response.status < 400;
  } catch (error) {
    return false;
  }
};

const isUrlUsableForReport = async (url: string, timeoutMs = 3500): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; NewWorldGameBot/1.0; +https://newworld-game.org)',
      },
    });
    clearTimeout(timeoutId);

    // Explicitly reject hard-dead links.
    if (response.status === 404 || response.status === 410) return false;
    // Treat auth-gated pages as usable links.
    if (response.status === 401 || response.status === 403) return true;

    if (response.status === 405) {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), timeoutMs);
      const getResponse = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller2.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; NewWorldGameBot/1.0; +https://newworld-game.org)',
          Range: 'bytes=0-1024',
        },
      });
      clearTimeout(timeoutId2);
      if (getResponse.status === 404 || getResponse.status === 410) return false;
      return getResponse.status < 500;
    }

    return response.status < 500;
  } catch (error) {
    return false;
  }
};

const validateLinks = async <T extends { url: string }>(items: T[]) => {
  const results = await Promise.all(
    items.map(async (item) => ({
      item,
      valid: await isUrlReachable(item.url),
    }))
  );
  return results.filter((r) => r.valid).map((r) => r.item);
};

type ReachLookupRequest = {
  solutionId?: string;
  page?: number;
  pageSize?: number;
  city?: string;
  region?: string;
  country?: string;
  excludedIds?: string[];
  forceRefresh?: boolean;
};

type ReachLookupPerson = {
  id: string;
  name: string;
  title: string;
  organization: string;
  email: string;
  url: string;
  whyRelevant: string;
  location?: string;
};

type ReachLookupCacheDocument = {
  solutionId: string;
  cacheKey: string;
  city?: string;
  region?: string;
  country?: string;
  summary?: string;
  people?: ReachLookupPerson[];
  createdAtIso?: string;
  lastSearchedAtIso?: string;
  expiresAfterMonths?: number;
};

type SolutionLaunchResourceLane = 'publish' | 'fund' | 'partner';

type SolutionLaunchResourceRequest = {
  solutionId?: string;
  lane?: SolutionLaunchResourceLane;
  city?: string;
  region?: string;
  country?: string;
  locationMode?: 'location' | 'global';
  pageSize?: number;
  forceRefresh?: boolean;
  append?: boolean;
  excludedIds?: string[];
};

type SolutionLaunchResource = {
  id: string;
  lane: SolutionLaunchResourceLane;
  name: string;
  type: string;
  url: string;
  location?: string;
  whyRelevant: string;
  specificFit: string;
  nextAction: string;
  sourceTitle?: string;
  eligibility?: string;
  deadline?: string;
  contactHint?: string;
  fitScore: number;
};

type SolutionLaunchResourceCacheDocument = {
  solutionId: string;
  lane: SolutionLaunchResourceLane;
  cacheKey: string;
  locationMode: 'location' | 'global';
  city?: string;
  region?: string;
  country?: string;
  summary?: string;
  resources?: SolutionLaunchResource[];
  createdAtIso?: string;
  lastSearchedAtIso?: string;
  expiresAfterDays?: number;
};

const REACH_GENERIC_EMAIL_LOCALS = new Set([
  'admin',
  'admissions',
  'career',
  'careers',
  'communications',
  'contact',
  'hello',
  'help',
  'info',
  'inquiries',
  'jobs',
  'mail',
  'media',
  'office',
  'partnerships',
  'press',
  'recruiting',
  'recruitment',
  'support',
  'team',
]);

const normalizeReachText = (value: unknown, maxLength = 400): string =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const stripUndefinedValues = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedValues(entry)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [key, entry]) => {
        if (entry !== undefined) {
          acc[key] = stripUndefinedValues(entry);
        }
        return acc;
      },
      {} as Record<string, unknown>
    ) as T;
  }

  return value;
};

const normalizeReachExcludedIds = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .map((value) => normalizeReachText(value, 240).toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 80);
};

const sanitizeReachUrl = (value: unknown): string => {
  const raw = normalizeReachText(value, 500);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

const sanitizeReachEmail = (value: unknown): string => {
  const email = normalizeReachText(value, 200).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return '';
  }

  const [localPart] = email.split('@');
  if (!localPart || REACH_GENERIC_EMAIL_LOCALS.has(localPart)) {
    return '';
  }

  return email;
};

const buildReachPersonId = (email: string, url: string, name: string): string => {
  const base = email || url || name;
  return base.trim().toLowerCase();
};

const parseReachLookupPayload = (
  raw: string
): { summary: string; people: any[] } => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { summary: '', people: [] };
  }

  const candidates: string[] = [trimmed];
  const fencedJson = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const fencedAny = trimmed.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (fencedJson) candidates.push(fencedJson.trim());
  if (fencedAny) candidates.push(fencedAny.trim());

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return { summary: '', people: parsed };
      }
      if (Array.isArray(parsed?.people)) {
        return {
          summary: normalizeReachText(parsed.summary, 280),
          people: parsed.people,
        };
      }
    } catch {
      // Try the next candidate.
    }
  }

  return { summary: '', people: [] };
};

const normalizeReachPersonCandidate = (candidate: any): ReachLookupPerson | null => {
  const name = normalizeReachText(candidate?.name, 120);
  const title = normalizeReachText(candidate?.title, 160);
  const organization = normalizeReachText(candidate?.organization, 160);
  const email = sanitizeReachEmail(candidate?.email);
  const url = sanitizeReachUrl(candidate?.url);
  const whyRelevant = normalizeReachText(
    candidate?.whyRelevant || candidate?.reason || candidate?.fit,
    500
  );
  const location = normalizeReachText(candidate?.location, 120);

  if (!name || !title || !organization || !email || !url || !whyRelevant) {
    return null;
  }

  const id = buildReachPersonId(email, url, name);
  if (!id) {
    return null;
  }

  return {
    id,
    name,
    title,
    organization,
    email,
    url,
    whyRelevant,
    ...(location ? { location } : {}),
  };
};

const dedupeReachPeople = (people: ReachLookupPerson[]): ReachLookupPerson[] => {
  const seen = new Set<string>();
  const deduped: ReachLookupPerson[] = [];

  for (const person of people) {
    const orgKey = normalizeReachText(person.organization, 160).toLowerCase();
    const dedupeKey = `${person.id}::${orgKey}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    deduped.push(person);
  }

  return deduped;
};

const buildReachCacheKey = (
  city: string,
  country: string,
  region: string = ''
): string => {
  const raw = [city, region, country]
    .map((value) =>
      normalizeReachText(value, 80)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
    .filter(Boolean)
    .join('__');

  return raw || 'global';
};

const getReachFreshnessCutoffMs = (nowMs = Date.now()): number => {
  const cutoff = new Date(nowMs);
  cutoff.setMonth(cutoff.getMonth() - 3);
  return cutoff.getTime();
};

const parseReachIsoToMs = (value: unknown): number => {
  const text = normalizeReachText(value, 80);
  if (!text) return 0;
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isReachCacheExpired = (
  cache: ReachLookupCacheDocument | undefined,
  nowMs = Date.now()
): boolean => {
  if (!cache) return false;
  const lastSearchedAtMs =
    parseReachIsoToMs(cache.lastSearchedAtIso) ||
    parseReachIsoToMs(cache.createdAtIso);
  if (!lastSearchedAtMs) {
    return true;
  }
  return lastSearchedAtMs < getReachFreshnessCutoffMs(nowMs);
};

const normalizeCachedReachPeople = (input: unknown): ReachLookupPerson[] => {
  if (!Array.isArray(input)) return [];
  return dedupeReachPeople(
    input
      .map((person) => normalizeReachPersonCandidate(person))
      .filter((person): person is ReachLookupPerson => !!person)
  );
};

const buildReachLookupPrompt = (params: {
  solutionTitle: string;
  solutionSummary: string;
  focusArea: string;
  sdgs: string[];
  category: string;
  city: string;
  region: string;
  country: string;
  page: number;
  pageSize: number;
  excludedIds: string[];
}) => {
  const locationLabel =
    params.city && params.country
      ? [params.city, params.region, params.country].filter(Boolean).join(', ')
      : '';

  const contextLines = [
    `Solution title: ${params.solutionTitle}`,
    `Solution summary: ${params.solutionSummary}`,
    `Focus area: ${params.focusArea || 'Not specified'}`,
    `Category: ${params.category || 'Not specified'}`,
    params.sdgs.length ? `SDGs: ${params.sdgs.join(', ')}` : '',
    locationLabel ? `Location preference: ${locationLabel}` : '',
    params.excludedIds.length
      ? `Already shown or rejected contacts. Do not repeat them: ${params.excludedIds.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a meticulous outreach researcher for a solution team.

Your task is to find ${params.pageSize} REAL, CURRENT people who are specifically relevant to this solution.

Solution context:
${contextLines}

This is batch ${params.page}. If this is not the first batch, deliberately find different people and different organizations than earlier batches.

People can include:
- subject-matter experts
- nonprofit or NGO leaders
- program officers and foundation staff
- university center directors or researchers
- ecosystem builders
- government or policy leaders
- startup or implementation leaders

Strict rules:
- Relevance must be specific to the solution topic, not just broad innovation or sustainability.
- Every person must have a current title.
- Every person must have a PUBLICLY LISTED, person-specific email address.
- Do not use generic emails like info@, contact@, office@, support@, press@, or hello@.
- Use the best page for learning more about the person, preferably an official staff, faculty, lab, leadership, or organization page.
- Do not use social media or organization homepages unless they are clearly the best authoritative source about that person.
- Avoid duplicate organizations unless the people are materially different and both are strong fits.
- Only include people you can stand behind as solid matches for this exact solution.

Return JSON only in this exact shape:
{
  "summary": "one short sentence on how the batch was targeted",
  "people": [
    {
      "name": "Full name",
      "title": "Current title",
      "organization": "Organization name",
      "email": "public person-specific email",
      "url": "https://...",
      "whyRelevant": "One concise sentence on why this exact person fits this exact solution.",
      "location": "City, Country or Region if clearly available"
    }
  ]
}

Do not include markdown. Do not include commentary outside JSON.`;
};

const parseSolutionLaunchResourcePayload = (
  raw: string
): { summary: string; resources: any[] } => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) {
    return { summary: '', resources: [] };
  }

  const candidates: string[] = [trimmed];
  const fencedJson = trimmed.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const fencedAny = trimmed.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (fencedJson) candidates.push(fencedJson.trim());
  if (fencedAny) candidates.push(fencedAny.trim());

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        return { summary: '', resources: parsed };
      }
      if (Array.isArray(parsed?.resources)) {
        return {
          summary: normalizeReachText(parsed.summary, 320),
          resources: parsed.resources,
        };
      }
    } catch {
      // Try the next candidate.
    }
  }

  return { summary: '', resources: [] };
};

const sanitizeSolutionLaunchUrl = (value: unknown): string => {
  const url = sanitizeReachUrl(value);
  if (!url) return '';

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === 'google.com' || host === 'www.google.com') {
      return '';
    }
    if (host.includes('bing.com') || host.includes('duckduckgo.com')) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

const buildSolutionLaunchResourceId = (
  lane: SolutionLaunchResourceLane,
  name: string,
  url: string
): string => {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return '';
    }
  })();
  return `${lane}:${name}:${host}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeSolutionLaunchResourceCandidate = (
  candidate: any,
  lane: SolutionLaunchResourceLane
): SolutionLaunchResource | null => {
  const name = normalizeReachText(candidate?.name, 180);
  const type = normalizeReachText(candidate?.type, 120);
  const url = sanitizeSolutionLaunchUrl(candidate?.url);
  const location = normalizeReachText(candidate?.location, 180);
  const whyRelevant = normalizeReachText(candidate?.whyRelevant, 520);
  const specificFit = normalizeReachText(candidate?.specificFit, 520);
  const nextAction = normalizeReachText(candidate?.nextAction, 260);
  const sourceTitle = normalizeReachText(candidate?.sourceTitle, 180);
  const eligibility = normalizeReachText(candidate?.eligibility, 260);
  const deadline = normalizeReachText(candidate?.deadline, 120);
  const contactHint = normalizeReachText(candidate?.contactHint, 220);
  const fitScore = Math.max(
    55,
    Math.min(98, Math.round(Number(candidate?.fitScore) || 82))
  );

  if (!name || !type || !url || !whyRelevant || !specificFit || !nextAction) {
    return null;
  }

  const id = buildSolutionLaunchResourceId(lane, name, url);
  if (!id) {
    return null;
  }

  return {
    id,
    lane,
    name,
    type,
    url,
    whyRelevant,
    specificFit,
    nextAction,
    ...(location ? { location } : {}),
    ...(sourceTitle ? { sourceTitle } : {}),
    ...(eligibility ? { eligibility } : {}),
    ...(deadline ? { deadline } : {}),
    ...(contactHint ? { contactHint } : {}),
    fitScore,
  };
};

const dedupeSolutionLaunchResources = (
  resources: SolutionLaunchResource[]
): SolutionLaunchResource[] => {
  const seen = new Set<string>();
  const deduped: SolutionLaunchResource[] = [];

  for (const resource of resources) {
    const host = (() => {
      try {
        return new URL(resource.url).hostname.replace(/^www\./, '').toLowerCase();
      } catch {
        return resource.url.toLowerCase();
      }
    })();
    const key = `${resource.lane}:${resource.name.toLowerCase()}:${host}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(resource);
  }

  return deduped;
};

const buildSolutionLaunchResourceCacheKey = (
  lane: SolutionLaunchResourceLane,
  locationMode: 'location' | 'global',
  city: string,
  region: string,
  country: string
): string => {
  const locationKey =
    locationMode === 'global'
      ? 'global'
      : [city, region, country]
          .map((value) =>
            normalizeReachText(value, 90)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          )
          .filter(Boolean)
          .join('__') || 'global';

  return `${lane}_${locationKey}`;
};

const isSolutionLaunchResourceCacheExpired = (
  cache: SolutionLaunchResourceCacheDocument | undefined,
  nowMs = Date.now()
): boolean => {
  if (!cache) return false;
  const lastSearchedAtMs =
    parseReachIsoToMs(cache.lastSearchedAtIso) ||
    parseReachIsoToMs(cache.createdAtIso);
  if (!lastSearchedAtMs) {
    return true;
  }
  const cutoff = new Date(nowMs);
  cutoff.setDate(cutoff.getDate() - 30);
  return lastSearchedAtMs < cutoff.getTime();
};

const normalizeCachedSolutionLaunchResources = (
  input: unknown,
  lane: SolutionLaunchResourceLane
): SolutionLaunchResource[] => {
  if (!Array.isArray(input)) return [];
  return dedupeSolutionLaunchResources(
    input
      .map((resource) => normalizeSolutionLaunchResourceCandidate(resource, lane))
      .filter((resource): resource is SolutionLaunchResource => !!resource)
  );
};

const getSolutionLaunchLocalSignalScore = (
  resource: SolutionLaunchResource,
  city: string,
  region: string,
  country: string
): number => {
  const haystack = [
    resource.name,
    resource.type,
    resource.location,
    resource.whyRelevant,
    resource.specificFit,
    resource.sourceTitle,
    resource.contactHint,
    resource.url,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const cityTerms = getSolutionLaunchLocationTerms(city);
  const regionTerms = getSolutionLaunchLocationTerms(region);
  const countryValue = country.trim().toLowerCase();
  let score = 0;

  if (cityTerms.some((term) => containsLaunchLocationTerm(haystack, term))) {
    score += 3;
  }
  if (regionTerms.some((term) => containsLaunchLocationTerm(haystack, term))) {
    score += 2;
  }
  if (
    countryValue &&
    countryValue !== 'united states' &&
    containsLaunchLocationTerm(haystack, countryValue)
  ) {
    score += 1;
  }

  return score;
};

const getSolutionLaunchLocationTerms = (value: string): string[] => {
  const clean = value.trim().toLowerCase();
  if (!clean) return [];
  const terms = new Set<string>([clean]);

  if (clean === 'philadelphia') {
    terms.add('philly');
    terms.add('phila');
  }
  if (clean === 'pa') {
    terms.add('pennsylvania');
  }
  if (clean === 'dc') {
    terms.add('district of columbia');
    terms.add('washington dc');
  }
  if (clean === 'democratic republic of the congo') {
    terms.add('drc');
    terms.add('dr congo');
    terms.add('congo kinshasa');
  }
  if (clean === 'kinshasa') {
    terms.add('kin');
  }

  return Array.from(terms);
};

const isGenericGlobalLaunchHost = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return [
      'linkedin.com',
      'medium.com',
      'substack.com',
      'zenodo.org',
      'researchgate.net',
      'theconversation.com',
      'osf.io',
      'github.com',
    ].some((blockedHost) => host === blockedHost || host.endsWith(`.${blockedHost}`));
  } catch {
    return false;
  }
};

const containsLaunchLocationTerm = (haystack: string, term: string): boolean => {
  const cleanTerm = term.trim().toLowerCase();
  if (!cleanTerm) return false;
  const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(
    haystack
  );
};

const rankSolutionLaunchResourcesForTarget = (
  resources: SolutionLaunchResource[],
  params: {
    locationMode: 'location' | 'global';
    city: string;
    region: string;
    country: string;
  }
): SolutionLaunchResource[] => {
  if (params.locationMode === 'global') {
    return [...resources].sort((a, b) => b.fitScore - a.fitScore);
  }

  return [...resources]
    .map((resource) => {
      const localScore = getSolutionLaunchLocalSignalScore(
        resource,
        params.city,
        params.region,
        params.country
      );
      const genericPenalty = isGenericGlobalLaunchHost(resource.url) ? 8 : 0;
      return {
        resource,
        rankScore: resource.fitScore + localScore * 10 - genericPenalty,
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .map((entry) => ({
      ...entry.resource,
      fitScore: Math.max(
        55,
        Math.min(98, Math.round(entry.rankScore))
      ),
    }));
};

const buildSolutionLaunchResourcePrompt = (params: {
  lane: SolutionLaunchResourceLane;
  solutionTitle: string;
  solutionSummary: string;
  focusArea: string;
  category: string;
  sdgs: string[];
  recruitmentProfile: string;
  participantCount: number;
  documentCount: number;
  evaluationCount: number;
  city: string;
  region: string;
  country: string;
  locationMode: 'location' | 'global';
  pageSize: number;
  excludedIds: string[];
}) => {
  const locationLabel =
    params.locationMode === 'global'
      ? 'Global / anywhere'
      : [params.city, params.region, params.country].filter(Boolean).join(', ');
  const laneBrief =
    params.lane === 'publish'
      ? `Find concrete publication and visibility targets: city and regional newsrooms, civic media, education reporters, university news channels, school-system communications pages, public-interest publishers, submission pages, newsletters, and topic-specific platforms that can feature or publish this exact solution.`
      : params.lane === 'fund'
        ? `Find concrete funding routes: local and regional grantmakers, education foundations, civic innovation programs, challenge programs, accelerators, city/state/federal programs, and funder pages that fit this exact solution.`
        : `Find concrete partner organizations: local implementation allies, education nonprofits, school-district adjacent organizations, civic agencies, university centers, labs, ecosystem builders, and mission-aligned organizations that could help execute or amplify this exact solution.`;
  const locationRule =
    params.locationMode === 'global'
      ? `The user explicitly chose global targeting. Rank by strongest thematic fit, credibility, current activity, and direct actionability. Do not pretend a result is local.`
      : `The user chose location targeting for ${locationLabel}. At least ${Math.max(1, Math.ceil(params.pageSize * 0.7))} result(s) must be organizations, programs, publications, offices, or pages with real operations in ${params.city}, ${params.region || params.country}, or the directly surrounding region. Use global platforms only after exhausting strong local/regional matches, and label them as global rather than local.`;
  const exclusionRule = params.excludedIds.length
    ? `Already shown resource IDs: ${params.excludedIds.slice(0, 80).join(', ')}. Do not repeat the same organization, program, outlet, webpage, host/name pair, or near-duplicate route. If quality drops after excluding these, return fewer than ${params.pageSize} results rather than padding with generic sources.`
    : '';
  const laneSpecificRules =
    params.lane === 'publish'
      ? [
          `For publish, prefer pages for local outlets, education desks, public-interest news, university newsrooms, civic newsletters, and submission/contact pages. For local targeting, do not return Medium, LinkedIn, Substack, Zenodo, ResearchGate, The Conversation, or other global platforms.`,
          `For each result, "nextAction" must name the concrete pitch/submission/contact action and "contactHint" should name the relevant desk, form, or editor/contact route if visible.`,
        ]
      : params.lane === 'fund'
        ? [
            `For fund, prefer active local/regional funders, education grant programs, city/state innovation funds, foundations, accelerators, and challenge programs. Avoid generic VC directories and broad fundraising advice pages.`,
            `For each result, "eligibility" and "deadline" must be filled from the page when visible. If the page does not show a current cycle, use "Check current cycle" rather than inventing a date.`,
          ]
        : [
            `For partner, prefer organizations that could realistically pilot, implement, evaluate, distribute, or validate the solution. Avoid broad business directories and generic networking platforms.`,
            `For each result, "specificFit" must identify the partnership angle: pilot site, research validation, educator network, implementation ally, curriculum/program fit, policy/civic channel, or funder-to-partner bridge.`,
          ];

  const contextLines = [
    `Solution title: ${params.solutionTitle}`,
    `Solution summary: ${params.solutionSummary}`,
    `Focus area: ${params.focusArea || 'Not specified'}`,
    `Category: ${params.category || 'Not specified'}`,
    params.sdgs.length ? `SDGs: ${params.sdgs.join(', ')}` : '',
    params.recruitmentProfile ? `Recruitment / implementation profile: ${params.recruitmentProfile}` : '',
    `Workspace signals: ${params.participantCount} participant(s), ${params.documentCount} document(s), ${params.evaluationCount} evaluation(s).`,
    `Targeting: ${locationLabel}`,
  ]
    .filter(Boolean)
    .join('\n');

  return `You are a meticulous Solution Launch researcher for NewWorld Game.

Task:
${laneBrief}

Solution context:
${contextLines}

Targeting rule:
${locationRule}

Strict quality rules:
- Return ${params.pageSize} real, current, source-backed results.
- If fewer than ${params.pageSize} meaningful results exist after the constraints, return only the meaningful results.
- Every result must be specific to this solution topic, not just broad "innovation", "sustainability", or "community".
- Prefer direct program, submission, staff, grants, newsroom, partnership, or initiative pages over generic homepages.
- For local targeting, do not return a global/general platform when a relevant ${params.city || 'city'} or regional organization exists.
- Do not return Google, search result pages, social media feeds, URL shorteners, or directory pages unless the directory is the authoritative program page.
- Include only results you can stand behind as meaningful next steps for this exact solution.
- For funding, include eligibility or deadline when visible. If not visible, say "Check current cycle".
- For partner, include the likely partnership angle.
- For publish, include the likely publication/access point.
${laneSpecificRules.map((rule) => `- ${rule}`).join('\n')}
${exclusionRule ? `- ${exclusionRule}` : ''}

Return JSON only in this exact shape:
{
  "summary": "one concise sentence explaining how the results were targeted",
  "resources": [
    {
      "name": "Organization, program, outlet, or platform name",
      "type": "short category",
      "url": "https://direct-useful-page.example",
      "sourceTitle": "title of the page or source",
      "location": "City, State/Region, Country or Global",
      "whyRelevant": "One concise sentence explaining why this result matters for the solution.",
      "specificFit": "One concrete fit note tied to the actual solution context.",
      "nextAction": "Specific next action the user should take on this page.",
      "eligibility": "Funding eligibility or partner/publication requirements if relevant, otherwise empty string",
      "deadline": "Deadline or cycle if visible, otherwise empty string",
      "contactHint": "Relevant contact route if visible, otherwise empty string",
      "fitScore": 55-98
    }
  ]
}

Do not include markdown. Do not include commentary outside JSON.`;
};

const formatFundersForEmail = (
  items: Array<{ name: string; desc: string; url: string }>
): string => {
  return items
    .map(item => {
      const displayHost = item.url
        .replace(/^https?:\/\//, '')
        .split('/')[0];
      return `
          <tr>
            <td style="padding:16px 0;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;font-family:Georgia,'Times New Roman',serif;">${item.name}</p>
              <p style="margin:0 0 8px;font-size:14px;color:#4b5563;line-height:1.5;">${item.desc}</p>
              <a href="${item.url}" style="font-size:13px;color:#2563eb;text-decoration:none;">${displayHost} →</a>
            </td>
          </tr>`;
    })
    .join('');
};

const formatNewsForEmail = (
  items: Array<{
    headline: string;
    source: string;
    relevance: string;
    url: string;
  }>
): string => {
  return items
    .map(item => {
      return `
          <tr>
            <td style="padding:16px 0;border-bottom:1px solid #f1f5f9;">
              <p style="margin:0 0 6px;font-size:15px;font-weight:600;color:#111827;line-height:1.4;font-family:Georgia,'Times New Roman',serif;">${item.headline}</p>
              <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${item.source}</p>
              ${item.relevance ? `<p style="margin:8px 0 0;font-size:14px;color:#4b5563;line-height:1.5;">${item.relevance}</p>` : ''}
              <a href="${item.url}" style="display:inline-block;margin-top:8px;font-size:13px;color:#2563eb;text-decoration:none;">Read article →</a>
            </td>
          </tr>`;
    })
    .join('');
};

// Generate AI content for a solution (with caching)
const generateSolutionAIContent = async (
  solutionId: string,
  solutionTitle: string,
  solutionDescription?: string,
  solutionArea?: string,
  sdgs?: string[]
): Promise<{ fundersHtml: string; newsHtml: string; validFundersCount: number; validNewsCount: number }> => {
  const periodKey = getCurrentPeriodKey();
  const cacheRef = admin.firestore().collection('ai_insights_content_cache').doc(`${solutionId}_${periodKey}`);

  // Check cache first
  const cacheDoc = await cacheRef.get();
  if (cacheDoc.exists) {
    const cached = cacheDoc.data() as SolutionAIContentCache;
    console.log(`Using cached AI content for solution ${solutionId} (period ${periodKey})`);
    return {
      fundersHtml: cached.fundersHtml,
      newsHtml: cached.newsHtml,
      validFundersCount: cached.validFundersCount,
      validNewsCount: cached.validNewsCount,
    };
  }

  console.log(`Generating new AI content for solution ${solutionId}`);

  // Build context for AI prompts
  const solutionContext = [
    `Solution Title: "${solutionTitle}"`,
    solutionDescription ? `Description: ${solutionDescription}` : '',
    solutionArea ? `Focus Area: ${solutionArea}` : '',
    sdgs?.length ? `Related SDGs: ${sdgs.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Initialize Gemini with Google Search grounding
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ google_search: {} }],
  } as any);

  // Generate funders and news prompts
  const fundersPrompt = `You are a research assistant helping social entrepreneurs find funding.

Based on this project:
${solutionContext}

Find 6 REAL, currently active grant programs, foundations, or funding organizations that would be interested in funding this type of project.

For each funder, provide ONLY this format (no markdown, no asterisks):
Organization Name
Brief description of what they fund (1 sentence)
Website URL (full https:// link to the official organization page)

Separate each funder with a blank line.

IMPORTANT:
- Only include real, verifiable organizations.
- Use a precise, direct link to the official site (no homepages without context, no short links, no tracking, no aggregators).
- Include the full URL with https:// and the complete path.
- If you cannot find an exact URL, omit the item.
- No markdown formatting.`;

  const newsPrompt = `You are a research assistant helping social entrepreneurs stay informed.

Based on this project:
${solutionContext}

Find 6 recent and relevant news headlines from the past 6 months that would be interesting and useful for someone working on this type of solution.

For each headline, provide ONLY this format (no markdown, no asterisks):
Headline text
Source publication name
Article URL (full https:// link to the exact article page)
Why it's relevant (1 sentence)

Separate each news item with a blank line.

IMPORTANT:
- Only include real, recent news articles with working URLs.
- Use a precise, direct article link from the publisher (no homepages, no short links, no tracking, no aggregators).
- Include the full URL with https:// and the complete path.
- If you cannot find an exact URL, omit the item.
- No markdown formatting.`;

  // Call Gemini for both prompts in parallel
  const [fundersResult, newsResult] = await Promise.all([
    model.generateContent(fundersPrompt),
    model.generateContent(newsPrompt),
  ]);

  const fundersText =
    fundersResult.response?.text() ||
    'Unable to generate funder recommendations at this time.';
  const newsText =
    newsResult.response?.text() ||
    'Unable to generate news insights at this time.';

  // Parse and validate
  const funderItems = parseFunders(fundersText);
  const newsItems = parseNews(newsText);

  // Validate URLs in parallel
  const validFunders = (await validateLinks(funderItems)).slice(0, 5);
  const validNews = (await validateLinks(newsItems)).slice(0, 5);

  const fundersHtml = validFunders.length
    ? formatFundersForEmail(validFunders)
    : `<tr><td style="padding:16px 0;border-bottom:1px solid #f1f5f9;"><p style="margin:0;font-size:14px;color:#6b7280;">No verified funding links available today.</p></td></tr>`;

  const newsHtml = validNews.length
    ? formatNewsForEmail(validNews)
    : `<tr><td style="padding:16px 0;border-bottom:1px solid #f1f5f9;"><p style="margin:0;font-size:14px;color:#6b7280;">No verified news links available today.</p></td></tr>`;

  // Cache the result
  await cacheRef.set({
    solutionId,
    solutionTitle,
    fundersHtml,
    newsHtml,
    validFundersCount: validFunders.length,
    validNewsCount: validNews.length,
    generatedAt: admin.firestore.FieldValue.serverTimestamp(),
    periodKey,
  });

  console.log(`Cached AI content for solution ${solutionId} (${validFunders.length} funders, ${validNews.length} news)`);

  return {
    fundersHtml,
    newsHtml,
    validFundersCount: validFunders.length,
    validNewsCount: validNews.length,
  };
};

// Build email HTML using cached content (fast - no AI calls)
const buildAIInsightsEmailFromCache = (
  data: AIInsightsPayload,
  cachedContent: { fundersHtml: string; newsHtml: string; validFundersCount: number; validNewsCount: number }
): { html: string; subject: string; verifiedFunders: number; verifiedNews: number } => {
  const { userEmail, userFirstName, solutionId, solutionTitle } = data;
  const { fundersHtml, newsHtml, validFundersCount, validNewsCount } = cachedContent;

  const dashboardLink = `https://newworld-game.org/dashboard/${solutionId}?openInvite=true`;
  const meetLink = data.meetLink || `https://newworld-game.org/dashboard/${solutionId}`;
  const feedbackUrl = `https://newworld-game.org/email-feedback?source=weekly-brief&solution=${encodeURIComponent(
    solutionId
  )}`;
  const manageBriefUrl = `${APP_BASE_URL.replace(
    /\/$/,
    ''
  )}/problem-list-view?weeklyBrief=1`;
  const solutionImage = data.solutionImage || '';

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const unsubscribeUrl = `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(
    (userEmail || '').toLowerCase()
  )}`;

  const safeHttpUrl = (value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return escapeHtml(parsed.toString());
      }
    } catch (error) {
      console.warn('Invalid team member URL skipped', raw, error);
    }
    return '';
  };

  const safeUrl = (value: unknown): string => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.startsWith('/')) {
      return escapeHtml(`${APP_BASE_URL.replace(/\/$/, '')}${raw}`);
    }
    return safeHttpUrl(raw);
  };

  const getInitials = (name: string, email: string): string => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    }
    const fallback = (parts[0] || String(email || '').split('@')[0] || 'NW')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2);
    return (fallback || 'NW').toUpperCase();
  };

  const teamAccentColors = ['#0f766e', '#1d4ed8', '#b45309', '#7c3aed', '#be185d'];
  const teamMembers = Array.isArray(data.teamMembers)
    ? data.teamMembers
        .map((member) => ({
          name: String(member?.name || '').trim(),
          email: String(member?.email || '').trim().toLowerCase(),
          avatarUrl: safeHttpUrl(member?.avatarUrl),
        }))
        .filter((member) => member.email)
        .filter(
          (member, index, all) =>
            all.findIndex((candidate) => candidate.email === member.email) === index
        )
    : [];

  const teamMembersHtml = teamMembers
    .map((member, index) => {
      const displayName = member.name || member.email;
      const initials = getInitials(displayName, member.email);
      const accentColor = teamAccentColors[index % teamAccentColors.length];
      const avatarHtml = member.avatarUrl
        ? `
            <img src="${member.avatarUrl}" alt="${escapeHtml(displayName)}" width="56" height="56" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid #ffffff;" />
          `
        : `
            <table cellpadding="0" cellspacing="0" role="presentation" style="width:56px;height:56px;background:${accentColor};border-radius:50%;">
              <tr>
                <td align="center" valign="middle" style="width:56px;height:56px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
                  ${escapeHtml(initials)}
                </td>
              </tr>
            </table>
          `;

      return `
        <tr>
          <td style="padding:0 0 14px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:18px;">
              <tr>
                <td width="76" style="padding:14px 0 14px 14px;vertical-align:middle;">
                  ${avatarHtml}
                </td>
                <td style="padding:14px 16px 14px 8px;vertical-align:middle;">
                  <p style="margin:0;font-size:16px;line-height:1.4;font-weight:600;color:#111827;">${escapeHtml(displayName)}</p>
                  <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">
                    <a href="mailto:${escapeHtml(member.email)}" style="color:#6b7280;text-decoration:none;">${escapeHtml(member.email)}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  const teamSection = teamMembers.length
    ? `
          <tr>
            <td style="padding:32px 24px;background:linear-gradient(180deg,#fcfcfd 0%,#f8fafc 100%);">
              <h3 style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Your Team</h3>
              <p style="margin:0 0 10px;font-size:22px;font-weight:400;color:#111827;font-family:Georgia,'Times New Roman',serif;">People building this solution with you</p>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
                Keep everyone close. Here is the current team connected to this solution.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${teamMembersHtml}
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>
      `
    : '';

  const joinOpportunities = Array.isArray(data.joinOpportunities)
    ? data.joinOpportunities
        .map((item) => ({
          solutionId: String(item?.solutionId || '').trim(),
          title: String(item?.title || '').trim(),
          summary: String(item?.summary || '').trim(),
          joinUrl: safeUrl(item?.joinUrl),
          imageUrl: safeUrl(item?.imageUrl),
          authorName: String(item?.authorName || '').trim(),
          focusArea: String(item?.focusArea || '').trim(),
        }))
        .filter((item) => item.title && item.joinUrl)
    : [];

  const joinOpportunitiesHtml = joinOpportunities
    .map((item) => {
      const metaParts = [item.authorName, item.focusArea].filter(Boolean);
      const summary = item.summary
        ? escapeHtml(item.summary.length > 180 ? `${item.summary.slice(0, 177)}...` : item.summary)
        : '';

      return `
        <tr>
          <td style="padding:0 0 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e5e7eb;border-radius:20px;background-color:#ffffff;">
              ${
                item.imageUrl
                  ? `
                  <tr>
                    <td style="padding:0;">
                      <img src="${item.imageUrl}" alt="${escapeHtml(item.title)}" width="100%" style="display:block;width:100%;max-height:200px;object-fit:cover;border-top-left-radius:20px;border-top-right-radius:20px;" />
                    </td>
                  </tr>
                `
                  : ''
              }
              <tr>
                <td style="padding:18px 18px 16px;">
                  <p style="margin:0 0 8px;font-size:19px;line-height:1.35;font-weight:600;color:#111827;font-family:Georgia,'Times New Roman',serif;">${escapeHtml(item.title)}</p>
                  ${
                    metaParts.length
                      ? `
                      <p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">
                        ${escapeHtml(metaParts.join(' • '))}
                      </p>
                    `
                      : ''
                  }
                  ${
                    summary
                      ? `
                      <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#4b5563;">${summary}</p>
                    `
                      : ''
                  }
                  <a href="${item.joinUrl}" style="display:inline-block;background-color:#ecfdf5;color:#047857;text-decoration:none;padding:11px 18px;font-size:13px;font-weight:700;letter-spacing:0.2px;border:1px solid #a7f3d0;border-radius:999px;">
                    Explore & Join
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join('');

  const joinOpportunitiesSection = joinOpportunities.length
    ? `
          <tr>
            <td style="padding:32px 24px;background:linear-gradient(180deg,#f0fdf4 0%,#ffffff 100%);">
              <h3 style="margin:0 0 8px;font-size:12px;color:#166534;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Open Team Opportunities</h3>
              <p style="margin:0 0 10px;font-size:22px;font-weight:400;color:#111827;font-family:Georgia,'Times New Roman',serif;">Solutions looking for participants to join</p>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.7;">
                Other active teams across NewWorld Game are inviting collaborators right now.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${joinOpportunitiesHtml}
              </table>
              <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">
                You can browse more opportunities on
                <a href="${APP_BASE_URL}/broadcasts" style="color:#047857;text-decoration:underline;">the broadcasts page</a>.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>
      `
    : '';

  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Insights for ${solutionTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#ffffff;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:640px;">

          <!-- Masthead -->
          <tr>
            <td style="padding:32px 24px 24px;border-bottom:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;">NewWorld Game</p>
                    <h1 style="margin:8px 0 0;font-size:28px;font-weight:400;color:#111827;font-family:Georgia,'Times New Roman',serif;letter-spacing:-0.5px;">Weekly NewWorld Game Intelligence Brief</h1>
                    <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">${currentDate}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Section with Solution -->
          <tr>
            <td style="padding:32px 24px;">
              ${solutionImage ? `
              <img src="${solutionImage}" alt="${solutionTitle}" width="100%" style="display:block;max-width:592px;height:auto;border-radius:4px;margin-bottom:24px;" />
              ` : ''}
              <p style="margin:0 0 8px;font-size:12px;color:#dc2626;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your Solution</p>
              <h2 style="margin:0 0 16px;font-size:32px;font-weight:400;color:#111827;line-height:1.2;font-family:Georgia,'Times New Roman',serif;">${solutionTitle}</h2>
              <p style="margin:0;font-size:16px;color:#4b5563;line-height:1.6;">
                Dear ${userFirstName || 'there'},
              </p>
              <p style="margin:16px 0 0;font-size:16px;color:#4b5563;line-height:1.7;">
                Welcome to this week's NewWorld Game Intelligence Brief - and thank you for being part of NewWorld Game.
              </p>
              <p style="margin:16px 0 0;font-size:16px;color:#4b5563;line-height:1.7;">
                Your work on real-world challenges matters. To support you, you now have a personal AI assistant that continuously scans for relevant research, emerging insights, and funding opportunities connected to your solution.
              </p>
              <p style="margin:16px 0 0;font-size:16px;color:#4b5563;line-height:1.7;">
                Each week, this brief will highlight the most useful updates to help you move forward.
              </p>
              <p style="margin:16px 0 0;font-size:16px;color:#4b5563;line-height:1.7;">
                We encourage you to keep building - and if possible, invite friends or collaborators to join you in strengthening your solution.
              </p>
              <p style="margin:16px 0 0;font-size:16px;color:#4b5563;line-height:1.7;">
                <a href="https://newworld-game.org/email-feedback" style="color:#2563eb;text-decoration:underline;">We'd also appreciate your feedback</a> as we improve this experience.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0 0;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:16px;">
                <tr>
                  <td style="padding:18px 18px 16px;">
                    <p style="margin:0 0 6px;font-size:12px;color:#1d4ed8;text-transform:uppercase;letter-spacing:1px;font-weight:700;">
                      Weekly brief preference
                    </p>
                    <p style="margin:0 0 8px;font-size:18px;line-height:1.35;font-weight:600;color:#111827;font-family:Georgia,'Times New Roman',serif;">
                      Choose which solution receives your weekly brief
                    </p>
                    <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#4b5563;">
                      You can change this anytime. If you do not choose one, NewWorld Game will use the weekly fallback selection.
                    </p>
                    <a href="${manageBriefUrl}" style="display:inline-block;background-color:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;font-size:14px;font-weight:700;border-radius:10px;">
                      Choose My Weekly Brief Solution
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:16px;color:#4b5563;line-height:1.7;">
                With appreciation,
              </p>
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;">
                <tr>
                  <td style="vertical-align:top;padding-right:12px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/avatar%2FNG73q08IBlW39QiC3CzwTGe6zVo2-medard-jpeg.jpeg?alt=media&token=111999e5-6382-4868-b6df-0db2d06ba419" alt="Medard Gabel" width="56" height="56" style="border-radius:50%;display:block;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:16px;font-weight:600;color:#111827;">Medard Gabel</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#6b7280;">EarthGame Inc Director, NewWorld Game Designer</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:2px solid #111827;margin:0;width:48px;" />
            </td>
          </tr>

          <!-- Funding Opportunities Section -->
          <tr>
            <td style="padding:32px 24px;">
              <h3 style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Funding Opportunities</h3>
              <p style="margin:0 0 24px;font-size:22px;font-weight:400;color:#111827;font-family:Georgia,'Times New Roman',serif;">Organizations aligned with your mission</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${fundersHtml}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          <!-- News Section -->
          <tr>
            <td style="padding:32px 24px;">
              <h3 style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">In the News</h3>
              <p style="margin:0 0 24px;font-size:22px;font-weight:400;color:#111827;font-family:Georgia,'Times New Roman',serif;">Headlines relevant to your work</p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${newsHtml}
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 24px;">
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" />
            </td>
          </tr>

          ${teamSection}

          ${joinOpportunitiesSection}

          <!-- Call to Action Section -->
          <tr>
            <td style="padding:32px 24px;">
              <h3 style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Take Action</h3>
              <p style="margin:0 0 24px;font-size:22px;font-weight:400;color:#111827;font-family:Georgia,'Times New Roman',serif;">Move your solution forward</p>
              <p style="margin:0 0 24px;font-size:16px;color:#4b5563;line-height:1.6;">
                Great solutions are built by great teams. Schedule time with your collaborators or expand your network.
              </p>
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="${meetLink}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;padding:14px 28px;font-size:14px;font-weight:500;letter-spacing:0.3px;">
                      Join Video Call
                    </a>
                  </td>
                  <td>
                    <a href="${dashboardLink}" style="display:inline-block;background-color:#ffffff;color:#111827;text-decoration:none;padding:13px 27px;font-size:14px;font-weight:500;letter-spacing:0.3px;border:1px solid #111827;">
                      Invite Team Members
                    </a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:12px;">
                    <a href="${feedbackUrl}" style="display:inline-block;background-color:#f8fafc;color:#0f172a;text-decoration:none;padding:12px 18px;font-size:13px;font-weight:600;letter-spacing:0.2px;border:1px solid #cbd5e1;">
                      Give Feedback on This Brief
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">NewWorld Game</p>
                    <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.5;">
                      Empowering changemakers to solve the world's most pressing challenges.
                    </p>
                    <p style="margin:0;font-size:12px;color:#9ca3af;">
                      <a href="https://newworld-game.org" style="color:#6b7280;text-decoration:none;">newworld-game.org</a>
                      <span style="color:#d1d5db;"> • </span>
                      <a href="${feedbackUrl}" style="color:#6b7280;text-decoration:none;">Share Feedback</a>
                      <span style="color:#d1d5db;"> • </span>
                      <a href="${manageBriefUrl}" style="color:#6b7280;text-decoration:none;">Change Brief Solution</a>
                      <span style="color:#d1d5db;"> • </span>
                      <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Legal Footer -->
          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                This email was sent to ${userEmail}<br>
                © ${new Date().getFullYear()} NewWorld Game. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    html: emailHtml,
    subject: `Weekly NewWorld Game Intelligence Brief: ${solutionTitle}`,
    verifiedFunders: validFundersCount,
    verifiedNews: validNewsCount,
  };
};

// Wrapper function that uses caching - maintains same interface for backward compatibility
const buildAIInsightsEmail = async (data: AIInsightsPayload) => {
  // Generate or get cached AI content for this solution
  const cachedContent = await generateSolutionAIContent(
    data.solutionId,
    data.solutionTitle,
    data.solutionDescription,
    data.solutionArea,
    data.sdgs
  );

  // Build the email HTML using cached content
  return buildAIInsightsEmailFromCache(data, cachedContent);
};

const AI_INSIGHTS_TEAM_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const extractAIInsightsSolutionEmails = (solution: any): string[] => {
  const emails = new Set<string>();
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
        candidate.authorEmail ||
        '';
    }
    email = String(email || '').trim().toLowerCase();
    if (!AI_INSIGHTS_TEAM_EMAIL_REGEX.test(email)) return;
    emails.add(email);
  };

  addEmail(solution?.authorEmail);
  addEmail(solution?.ownerEmail);

  const participants = solution?.participants;
  if (Array.isArray(participants)) {
    participants.forEach(addEmail);
  } else if (participants && typeof participants === 'object') {
    Object.values(participants).forEach(addEmail);
  }

  const participantsHolder = solution?.participantsHolder;
  if (Array.isArray(participantsHolder)) {
    participantsHolder.forEach(addEmail);
  }

  const teamMembers = solution?.teamMembers;
  if (Array.isArray(teamMembers)) {
    teamMembers.forEach(addEmail);
  }

  const chosenAdmins = solution?.chosenAdmins;
  if (Array.isArray(chosenAdmins)) {
    chosenAdmins.forEach(addEmail);
  }

  return Array.from(emails);
};

const mergeAIInsightsTeamMembers = (
  serverMembers: AIInsightsTeamMember[],
  payloadMembers: AIInsightsTeamMember[] = []
): AIInsightsTeamMember[] => {
  const merged = new Map<string, AIInsightsTeamMember>();

  [...serverMembers, ...payloadMembers].forEach((member) => {
    const email = String(member?.email || '').trim().toLowerCase();
    if (!AI_INSIGHTS_TEAM_EMAIL_REGEX.test(email)) return;

    const existing = merged.get(email);
    merged.set(email, {
      email,
      name: String(member?.name || existing?.name || email).trim() || email,
      avatarUrl:
        String(member?.avatarUrl || existing?.avatarUrl || '').trim() || undefined,
    });
  });

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const hydrateAIInsightsTeamMembers = async (
  data: AIInsightsPayload
): Promise<AIInsightsTeamMember[]> => {
  const db = admin.firestore();
  const solutionSnap = await db.doc(`solutions/${data.solutionId}`).get();

  const payloadMembers = Array.isArray(data.teamMembers) ? data.teamMembers : [];
  if (!solutionSnap.exists) {
    return mergeAIInsightsTeamMembers([], payloadMembers);
  }

  const solution = solutionSnap.data() || {};
  const teamEmails = extractAIInsightsSolutionEmails(solution);
  if (!teamEmails.length) {
    return mergeAIInsightsTeamMembers([], payloadMembers);
  }

  const usersByEmail = new Map<string, any>();
  const queryChunks: string[][] = [];
  for (let i = 0; i < teamEmails.length; i += 10) {
    queryChunks.push(teamEmails.slice(i, i + 10));
  }

  await Promise.all(
    queryChunks.map(async (chunk) => {
      const snap = await db
        .collection('users')
        .where('email', 'in', chunk)
        .get();
      snap.forEach((doc) => {
        const user = doc.data() || {};
        const email = String(user.email || '').trim().toLowerCase();
        if (email) usersByEmail.set(email, user);
      });
    })
  );

  const serverMembers = teamEmails.map((email) => {
    const user = usersByEmail.get(email);
    const first = String(user?.firstName || '').trim();
    const last = String(user?.lastName || '').trim();
    const name = `${first} ${last}`.trim() || email;
    const avatarUrl = String(user?.profilePicture?.downloadURL || '').trim();

    return {
      email,
      name,
      ...(avatarUrl ? { avatarUrl } : {}),
    };
  });

  return mergeAIInsightsTeamMembers(serverMembers, payloadMembers);
};

const loadAIInsightsJoinOpportunityPool = async (): Promise<
  AIInsightsJoinOpportunity[]
> => {
  const db = admin.firestore();
  const broadcastsSnap = await db
    .collection('broadcasts')
    .where('active', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(12)
    .get();

  const candidates = new Map<
    string,
    {
      solutionId: string;
      title: string;
      message: string;
      joinLink: string;
    }
  >();

  broadcastsSnap.forEach((doc) => {
    const broadcast = doc.data() || {};
    const solutionId = String(broadcast.solutionId || '').trim();
    if (!solutionId) return;
    if (candidates.has(solutionId)) return;

    const title = String(broadcast.title || '').trim();
    const message = String(broadcast.message || '').trim();
    const joinLink = String(broadcast.joinLink || '').trim();

    candidates.set(solutionId, {
      solutionId,
      title,
      message,
      joinLink,
    });
  });

  const selected = Array.from(candidates.values());
  if (!selected.length) return [];

  const solutionRefs = selected.map((item) => db.doc(`solutions/${item.solutionId}`));
  const solutionSnaps = await db.getAll(...solutionRefs);
  const solutionsById = new Map<string, any>();
  solutionSnaps.forEach((snap) => {
    if (snap.exists) {
      solutionsById.set(snap.id, snap.data() || {});
    }
  });

  const opportunities: AIInsightsJoinOpportunity[] = [];
  selected.forEach((item) => {
    const solution = solutionsById.get(item.solutionId) || {};
    const title = String(solution.title || item.title || '').trim();
    const broadCastInviteMessage = String(
      solution.broadCastInviteMessage || item.message || ''
    ).trim();
    const description = String(solution.description || '').trim();
    const summary = broadCastInviteMessage || description;
    const joinUrl = String(
      item.joinLink || `${APP_BASE_URL.replace(/\/$/, '')}/join/${item.solutionId}`
    ).trim();
    const imageUrl = String(solution.image || '').trim();
    const authorName = String(solution.authorName || '').trim();
    const focusArea = String(
      solution.recruitmentProfile?.focusArea ||
        solution.recruitmentProfile?.teamLabel ||
        solution.solutionArea ||
        ''
    ).trim();

    if (!title || !joinUrl) return;

    opportunities.push({
      solutionId: item.solutionId,
      title,
      ...(summary ? { summary } : {}),
      joinUrl,
      ...(imageUrl ? { imageUrl } : {}),
      ...(authorName ? { authorName } : {}),
      ...(focusArea ? { focusArea } : {}),
    });
  });

  return opportunities;
};

const selectAIInsightsJoinOpportunities = (
  pool: AIInsightsJoinOpportunity[],
  currentSolutionId: string,
  maxItems = 4
): AIInsightsJoinOpportunity[] =>
  pool
    .filter((item) => item.solutionId !== currentSolutionId)
    .slice(0, maxItems);

const hydrateAIInsightsJoinOpportunities = async (
  data: AIInsightsPayload
): Promise<AIInsightsJoinOpportunity[]> => {
  const pool = await loadAIInsightsJoinOpportunityPool();
  return selectAIInsightsJoinOpportunities(pool, data.solutionId);
};

const writeAIInsightsLog = async (entry: {
  mode: 'single' | 'bulk';
  subject: string;
  createdBy: string;
  recipients: Array<{ email: string; solutionId: string; solutionTitle: string }>;
  total: number;
  successCount: number;
  failureCount: number;
  failures?: string[];
}) => {
  await admin.firestore().collection('ai_insights_send_logs').add({
    mode: entry.mode,
    subject: entry.subject,
    createdBy: entry.createdBy,
    recipients: entry.recipients,
    total: entry.total,
    successCount: entry.successCount,
    failureCount: entry.failureCount,
    failures: entry.failures || [],
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const runWithConcurrency = async <T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
) => {
  const results: R[] = [];
  let idx = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const current = items[idx++];
      results.push(await worker(current));
    }
  });
  await Promise.all(runners);
  return results;
};

// ===== AI Insights Email Function =====
// Sends personalized AI-generated insights (funders, news) to solution authors
export const sendAIInsightsEmail = functions.https.onCall(
  async (data: AIInsightsPayload, context: functions.https.CallableContext) => {
    // Validate authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to send AI insights emails.'
      );
    }

    // Validate required fields
    const { userEmail, solutionId, solutionTitle } = data;
    if (!userEmail || !solutionId || !solutionTitle) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: userEmail, solutionId, or solutionTitle'
      );
    }

    console.log(
      'Sending AI Insights email to:',
      userEmail,
      'for solution:',
      solutionTitle
    );

    try {
      const [teamMembers, joinOpportunities] = await Promise.all([
        hydrateAIInsightsTeamMembers(data),
        hydrateAIInsightsJoinOpportunities(data),
      ]);
      const enrichedData: AIInsightsPayload = {
        ...data,
        teamMembers,
        joinOpportunities,
      };
      const { html, subject } = await buildAIInsightsEmail(enrichedData);

      const msg = {
        to: userEmail,
        from: { name: 'NewWorld Game', email: 'newworld@newworld-game.org' },
        subject,
        html,
      };

      await sgMail.send(msg);
      console.log('AI Insights email sent successfully to:', userEmail);

      const createdBy = context.auth?.token?.email || 'unknown';
      await writeAIInsightsLog({
        mode: 'single',
        subject,
        createdBy,
        recipients: [
          {
            email: userEmail,
            solutionId,
            solutionTitle,
          },
        ],
        total: 1,
        successCount: 1,
        failureCount: 0,
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error in sendAIInsightsEmail:', error);
      throw new functions.https.HttpsError(
        'internal',
        error?.message || 'Failed to send AI insights email'
      );
    }
  }
);

// Bulk AI Insights sender with concurrency
// Batch size for processing - keeps each function invocation under timeout
const AI_INSIGHTS_BATCH_SIZE = 25;

type AIInsightsBulkCriteria = 'user_selected' | 'most_recent' | 'second_recent' | 'random';

function normalizeAIInsightsBulkCriteria(
  value: unknown,
  fallback: AIInsightsBulkCriteria
): AIInsightsBulkCriteria {
  const raw = String(value || '').trim();
  if (
    raw === 'user_selected' ||
    raw === 'most_recent' ||
    raw === 'second_recent' ||
    raw === 'random'
  ) {
    return raw;
  }
  return fallback;
}

function parseAutomationExcludedEmailSet(value: unknown): Set<string> {
  if (Array.isArray(value)) {
    return new Set(
      value
        .map((item) => normalizeEmailForAutomation(item))
        .filter(isValidEmailForAutomation)
    );
  }

  return new Set(
    String(value || '')
      .split(/[\n,;\s]+/)
      .map((item) => normalizeEmailForAutomation(item))
      .filter(isValidEmailForAutomation)
  );
}

function solutionDateMsForAIInsightsAutomation(solution: any): number {
  return parseDateToMsForAutomation(
    solution?.updatedAt ?? solution?.submissionDate ?? solution?.createdAt
  );
}

function buildSolutionsByParticipantForAIInsightsAutomation(
  solutions: any[]
): Map<string, any[]> {
  const map = new Map<string, any[]>();

  for (const solution of solutions) {
    const emails = new Set<string>([
      ...normalizeParticipantEmailsForAutomation(solution?.participants),
    ]);
    const authorEmail = normalizeEmailForAutomation(solution?.authorEmail);
    if (authorEmail) emails.add(authorEmail);

    emails.forEach((email) => {
      if (!isValidEmailForAutomation(email)) return;
      if (!map.has(email)) map.set(email, []);
      map.get(email)?.push(solution);
    });
  }

  return map;
}

function pickAIInsightsAutomationSolution(
  solutions: any[],
  criteria: Exclude<AIInsightsBulkCriteria, 'user_selected'>
): any | null {
  if (!solutions.length) return null;

  const ordered = [...solutions].sort(
    (a, b) =>
      solutionDateMsForAIInsightsAutomation(b) -
      solutionDateMsForAIInsightsAutomation(a)
  );

  if (criteria === 'random') {
    const index = Math.floor(Math.random() * ordered.length);
    return ordered[index] || ordered[0] || null;
  }

  if (criteria === 'second_recent') {
    return ordered[1] || ordered[0] || null;
  }

  return ordered[0] || null;
}

function pickAIInsightsAutomationSolutionForEmail(
  email: string,
  solutions: any[],
  usersByEmail: Map<string, any>,
  criteria: AIInsightsBulkCriteria,
  fallbackCriteria: Exclude<AIInsightsBulkCriteria, 'user_selected'>
): { solution: any | null; pickSource: 'user_selected' | 'fallback'; invalidPreference: boolean } {
  if (!solutions.length) {
    return { solution: null, pickSource: 'fallback', invalidPreference: false };
  }

  if (criteria !== 'user_selected') {
    return {
      solution: pickAIInsightsAutomationSolution(solutions, criteria),
      pickSource: 'fallback',
      invalidPreference: false,
    };
  }

  const user = usersByEmail.get(normalizeEmailForAutomation(email));
  const preferredSolutionId = String(user?.weeklyBriefSolutionId || '').trim();
  if (!preferredSolutionId) {
    return {
      solution: pickAIInsightsAutomationSolution(solutions, fallbackCriteria),
      pickSource: 'fallback',
      invalidPreference: false,
    };
  }

  const preferred = solutions.find(
    (solution) => String(solution?.solutionId || '').trim() === preferredSolutionId
  );
  if (preferred) {
    return {
      solution: preferred,
      pickSource: 'user_selected',
      invalidPreference: false,
    };
  }

  return {
    solution: pickAIInsightsAutomationSolution(solutions, fallbackCriteria),
    pickSource: 'fallback',
    invalidPreference: true,
  };
}

function buildAIInsightsAutomationRecipients(data: {
  users: any[];
  solutions: any[];
  unsubscribedEmails: Set<string>;
  schedule: AutomationScheduleConfig;
}): {
  recipients: AIInsightsPayload[];
  stats: {
    totalParticipants: number;
    noSolutions: number;
    unsubscribed: number;
    excluded: number;
    userSelected: number;
    fallback: number;
    invalidPreference: number;
    finalRecipients: number;
  };
} {
  const usersByEmail = new Map<string, any>();
  data.users.forEach((user) => {
    const email = normalizeEmailForAutomation(user?.email);
    if (email) usersByEmail.set(email, user);
  });

  const directory = buildUserDirectoryForAutomation(data.users);
  const solutionsByParticipant = buildSolutionsByParticipantForAIInsightsAutomation(
    data.solutions
  );
  const criteria = normalizeAIInsightsBulkCriteria(
    data.schedule.criteria,
    'user_selected'
  );
  const normalizedFallbackCriteria = normalizeAIInsightsBulkCriteria(
    data.schedule.fallbackCriteria,
    'most_recent'
  );
  const fallbackCriteria: Exclude<AIInsightsBulkCriteria, 'user_selected'> =
    normalizedFallbackCriteria === 'user_selected'
      ? 'most_recent'
      : normalizedFallbackCriteria;
  const excludedEmails = parseAutomationExcludedEmailSet(
    data.schedule.excludeEmails
  );

  const recipients: AIInsightsPayload[] = [];
  const stats = {
    totalParticipants: solutionsByParticipant.size,
    noSolutions: 0,
    unsubscribed: 0,
    excluded: 0,
    userSelected: 0,
    fallback: 0,
    invalidPreference: 0,
    finalRecipients: 0,
  };

  for (const [email, participantSolutions] of solutionsByParticipant.entries()) {
    if (!data.schedule.includeUnsubscribed && data.unsubscribedEmails.has(email)) {
      stats.unsubscribed += 1;
      continue;
    }

    if (excludedEmails.has(email)) {
      stats.excluded += 1;
      continue;
    }

    const picked = pickAIInsightsAutomationSolutionForEmail(
      email,
      participantSolutions,
      usersByEmail,
      criteria,
      fallbackCriteria
    );

    if (!picked.solution || !String(picked.solution?.solutionId || '').trim()) {
      stats.noSolutions += 1;
      continue;
    }

    if (picked.pickSource === 'user_selected') {
      stats.userSelected += 1;
    } else {
      stats.fallback += 1;
    }

    if (picked.invalidPreference) {
      stats.invalidPreference += 1;
    }

    const user = usersByEmail.get(email);
    const displayName = directory.get(email)?.name || email;
    const firstName =
      firstNameOfAutomationUser(user) || displayName.split(/\s+/)[0] || 'there';

    recipients.push({
      userEmail: email,
      userFirstName: firstName,
      solutionId: String(picked.solution.solutionId || '').trim(),
      solutionTitle: String(picked.solution.title || 'Untitled Solution').trim(),
      solutionDescription: String(picked.solution.description || ''),
      solutionArea: String(picked.solution.solutionArea || ''),
      sdgs: Array.isArray(picked.solution.sdgs) ? picked.solution.sdgs : [],
      meetLink: String(
        picked.solution.meetLink ||
          picked.solution.meetingLink ||
          picked.solution.meetURL ||
          ''
      ),
      solutionImage: String(picked.solution.image || ''),
    });
  }

  recipients.sort((a, b) => a.userEmail.localeCompare(b.userEmail));
  stats.finalRecipients = recipients.length;

  return { recipients, stats };
}

async function enqueueAIInsightsBulkJob(data: {
  recipients: AIInsightsPayload[];
  concurrency?: number;
  createdBy: string;
  source?: string;
  automationRunKey?: string;
}) {
  const recipients = Array.isArray(data.recipients) ? data.recipients : [];
  const concurrency = Math.min(
    Math.max(Number(data.concurrency) || 4, 1),
    6
  );
  const subject = `Weekly NewWorld Game Intelligence Brief (bulk)`;

  const logRef = await admin.firestore().collection('ai_insights_send_logs').add({
    mode: 'bulk',
    subject,
    createdBy: data.createdBy,
    source: data.source || 'manual',
    automationRunKey: data.automationRunKey || '',
    recipients: recipients.map((r: AIInsightsPayload) => ({
      email: r.userEmail,
      solutionId: r.solutionId,
      solutionTitle: r.solutionTitle,
    })),
    total: recipients.length,
    successCount: 0,
    failureCount: 0,
    failures: [],
    successfulEmails: [],
    status: 'processing',
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    batchInfo: {
      totalBatches: Math.ceil(recipients.length / AI_INSIGHTS_BATCH_SIZE),
      completedBatches: 0,
    },
  });

  const jobRef = await admin.firestore().collection('ai_insights_bulk_jobs').add({
    status: 'queued',
    createdBy: data.createdBy,
    source: data.source || 'manual',
    automationRunKey: data.automationRunKey || '',
    recipients,
    concurrency,
    logId: logRef.id,
    batchIndex: 0,
    totalRecipients: recipients.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { jobId: jobRef.id, logId: logRef.id };
}

export const startAIInsightsBulkJob = functions
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onCall(
    async (
      data: { recipients: AIInsightsPayload[]; concurrency?: number },
      context: functions.https.CallableContext
    ) => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Authentication is required to send AI insights emails.'
        );
      }

      const recipients = Array.isArray(data?.recipients) ? data.recipients : [];
      if (!recipients.length) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Recipients list is required.'
        );
      }

      const createdBy = context.auth?.token?.email || 'unknown';
      const result = await enqueueAIInsightsBulkJob({
        recipients,
        concurrency: data.concurrency,
        createdBy,
        source: 'manual',
      });

      return { success: true, ...result };
    }
  );

export const processAIInsightsBulkJob = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .firestore.document('ai_insights_bulk_jobs/{jobId}')
  .onCreate(async (snap) => {
    const data = snap.data() || {};
    const allRecipients = Array.isArray(data.recipients) ? data.recipients : [];
    const concurrency = Math.min(Math.max(Number(data.concurrency) || 4, 1), 6);
    const createdBy = data.createdBy || 'unknown';
    const logId = data.logId as string | undefined;
    const batchIndex = Number(data.batchIndex) || 0;
    const totalRecipients = Number(data.totalRecipients) || allRecipients.length;

    if (!allRecipients.length) {
      await snap.ref.update({
        status: 'failed',
        error: 'No recipients provided.',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    // Get or create log reference
    let logRef: admin.firestore.DocumentReference;
    if (logId) {
      // This is a continuation batch - use existing log
      logRef = admin.firestore().collection('ai_insights_send_logs').doc(logId);
    } else {
      // This is an old-style job without logId (backward compatibility)
      const subject = `Weekly NewWorld Game Intelligence Brief (bulk)`;
      logRef = await admin.firestore().collection('ai_insights_send_logs').add({
        mode: 'bulk',
        subject,
        createdBy,
        recipients: allRecipients.map((r: AIInsightsPayload) => ({
          email: r.userEmail,
          solutionId: r.solutionId,
          solutionTitle: r.solutionTitle,
        })),
        total: allRecipients.length,
        successCount: 0,
        failureCount: 0,
        failures: [],
        successfulEmails: [],
        status: 'processing',
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Take only the batch we're processing
    const batchRecipients = allRecipients.slice(0, AI_INSIGHTS_BATCH_SIZE);
    const remainingRecipients = allRecipients.slice(AI_INSIGHTS_BATCH_SIZE);
    const hasMoreBatches = remainingRecipients.length > 0;

    console.log(`Processing batch ${batchIndex + 1}: ${batchRecipients.length} recipients (${remainingRecipients.length} remaining)`);

    await snap.ref.update({
      status: 'processing',
      logId: logRef.id,
      batchIndex,
      batchSize: batchRecipients.length,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const failures: string[] = [];
    const successfulEmails: string[] = [];
    let successCount = 0;

    // Helper to update progress in the shared log (uses atomic increment)
    const updateLogProgress = async () => {
      const updateData: Record<string, any> = {
        successCount: admin.firestore.FieldValue.increment(successCount),
        failureCount: admin.firestore.FieldValue.increment(failures.length),
      };
      // arrayUnion requires at least 1 argument, so only add if arrays have items
      if (failures.length > 0) {
        updateData.failures = admin.firestore.FieldValue.arrayUnion(...failures.slice(-20));
      }
      if (successfulEmails.length > 0) {
        updateData.successfulEmails = admin.firestore.FieldValue.arrayUnion(...successfulEmails);
      }
      await logRef.update(updateData);
    };

    // ===== PHASE 1: Pre-generate AI content for unique solutions in this batch =====
    const uniqueSolutions = new Map<string, AIInsightsPayload>();
    for (const r of batchRecipients) {
      const payload = r as AIInsightsPayload;
      if (payload.solutionId && !uniqueSolutions.has(payload.solutionId)) {
        uniqueSolutions.set(payload.solutionId, payload);
      }
    }

    console.log(`Batch ${batchIndex + 1}: Pre-generating AI content for ${uniqueSolutions.size} unique solutions`);

    const contentCache = new Map<string, { fundersHtml: string; newsHtml: string; validFundersCount: number; validNewsCount: number }>();
    await runWithConcurrency(Array.from(uniqueSolutions.values()), concurrency, async (solution) => {
      try {
        const content = await generateSolutionAIContent(
          solution.solutionId,
          solution.solutionTitle,
          solution.solutionDescription,
          solution.solutionArea,
          solution.sdgs
        );
        contentCache.set(solution.solutionId, content);
        console.log(`Generated content for solution: ${solution.solutionTitle}`);
      } catch (error: any) {
        console.error(`Failed to generate content for solution ${solution.solutionId}:`, error?.message);
      }
    });

    console.log(`Batch ${batchIndex + 1}: Content generation complete. Now sending ${batchRecipients.length} emails...`);

    // Preload team members once per solution so bulk sends match single-send rendering.
    const teamMembersCache = new Map<string, AIInsightsTeamMember[]>();
    const uniqueBatchSolutions = new Map<string, AIInsightsPayload>();
    batchRecipients.forEach((recipient) => {
      const payload = recipient as AIInsightsPayload;
      if (payload.solutionId && !uniqueBatchSolutions.has(payload.solutionId)) {
        uniqueBatchSolutions.set(payload.solutionId, payload);
      }
    });

    await Promise.all(
      Array.from(uniqueBatchSolutions.values()).map(async (payload) => {
        try {
          const teamMembers = await hydrateAIInsightsTeamMembers(payload);
          teamMembersCache.set(payload.solutionId, teamMembers);
        } catch (error: any) {
          console.error(
            `Failed to hydrate team members for solution ${payload.solutionId}:`,
            error?.message
          );
          teamMembersCache.set(payload.solutionId, payload.teamMembers || []);
        }
      })
    );

    let joinOpportunityPool: AIInsightsJoinOpportunity[] = [];
    try {
      joinOpportunityPool = await loadAIInsightsJoinOpportunityPool();
    } catch (error: any) {
      console.error(
        `Failed to load join opportunities for batch ${batchIndex + 1}:`,
        error?.message
      );
    }

    // ===== PHASE 2: Send emails using cached content =====
    await runWithConcurrency(batchRecipients, concurrency, async (recipient) => {
      const { userEmail, solutionId, solutionTitle } = recipient as AIInsightsPayload;
      if (!userEmail || !solutionId || !solutionTitle) {
        failures.push(`missing_fields:${userEmail || 'unknown'}:${solutionId || 'none'}`);
        return;
      }

      try {
        let cachedContent = contentCache.get(solutionId);
        if (!cachedContent) {
          cachedContent = await generateSolutionAIContent(
            solutionId,
            solutionTitle,
            (recipient as AIInsightsPayload).solutionDescription,
            (recipient as AIInsightsPayload).solutionArea,
            (recipient as AIInsightsPayload).sdgs
          );
        }

        const enrichedRecipient: AIInsightsPayload = {
          ...(recipient as AIInsightsPayload),
          teamMembers: teamMembersCache.get(solutionId) || [],
          joinOpportunities: selectAIInsightsJoinOpportunities(
            joinOpportunityPool,
            solutionId
          ),
        };

        const { html, subject: emailSubject } = buildAIInsightsEmailFromCache(
          enrichedRecipient,
          cachedContent
        );
        await sgMail.send({
          to: userEmail,
          from: { name: 'NewWorld Game', email: 'newworld@newworld-game.org' },
          subject: emailSubject,
          html,
        });
        successCount += 1;
        successfulEmails.push(userEmail.toLowerCase());
        console.log(`Batch ${batchIndex + 1}: Email sent to ${userEmail} (${successCount}/${batchRecipients.length})`);
      } catch (error: any) {
        console.error(`Failed to send to ${userEmail}:`, error?.message);
        failures.push(`${userEmail}:${error?.message || 'failed to send'}`);
      }
    });

    // Update shared log with this batch's results
    await updateLogProgress();

    // Update this job's status
    await snap.ref.update({
      status: 'batch_completed',
      batchSuccessCount: successCount,
      batchFailureCount: failures.length,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Batch ${batchIndex + 1} completed: ${successCount} sent, ${failures.length} failed`);

    // ===== PHASE 3: Create continuation job for remaining recipients =====
    if (hasMoreBatches) {
      console.log(`Creating continuation job for ${remainingRecipients.length} remaining recipients...`);
      await admin.firestore().collection('ai_insights_bulk_jobs').add({
        status: 'queued',
        createdBy,
        recipients: remainingRecipients,
        concurrency,
        logId: logRef.id,
        batchIndex: batchIndex + 1,
        totalRecipients,
        continuationOf: snap.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // All batches complete - finalize the log
      console.log(`All batches completed. Finalizing log...`);
      const logSnap = await logRef.get();
      const logData = logSnap.data() || {};
      const finalSuccessCount = logData.successCount || 0;
      const finalFailureCount = logData.failureCount || 0;
      const total = logData.total || totalRecipients;

      const finalStatus = finalSuccessCount === total
        ? 'completed'
        : finalSuccessCount > 0
          ? 'completed_with_errors'
          : 'failed';

      await logRef.update({
        status: finalStatus,
        unsent: total - finalSuccessCount - finalFailureCount,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        batchInfo: {
          totalBatches: batchIndex + 1,
          completedBatches: batchIndex + 1,
        },
      });
      console.log(`Bulk job finalized: ${finalSuccessCount}/${total} emails sent successfully`);
    }
  });

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeEmailHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeEmailValue = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const challengeJoinRequestId = (challengePageId: string, uid: string): string =>
  `${challengePageId}_${uid}`.replace(/[\/\s]+/g, '_');

async function getUserProfileByUid(uid: string): Promise<Record<string, any>> {
  if (!uid) return {};
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  return snap.exists ? snap.data() || {} : {};
}

async function getChallengePageAdminEmails(
  page: Record<string, any>,
  requesterEmail?: string
): Promise<string[]> {
  const recipients = new Set<string>();
  const addEmail = (value: unknown) => {
    const email = normalizeEmailValue(value);
    if (!emailRegex.test(email) || email === requesterEmail) return;
    recipients.add(email);
  };

  if (Array.isArray(page['adminEmails'])) {
    page['adminEmails'].forEach(addEmail);
  }

  const uidLookups = new Set<string>();
  if (page['authorId']) uidLookups.add(String(page['authorId']));
  if (Array.isArray(page['adminUids'])) {
    page['adminUids'].forEach((uid: unknown) => {
      const normalized = String(uid || '').trim();
      if (normalized) uidLookups.add(normalized);
    });
  }

  await Promise.all(
    Array.from(uidLookups).map(async (uid) => {
      const user = await getUserProfileByUid(uid);
      addEmail(user['email']);
    })
  );

  return Array.from(recipients);
}

function isChallengePageAdmin(
  page: Record<string, any>,
  uid: string,
  email: string
): boolean {
  const adminEmails = Array.isArray(page['adminEmails'])
    ? page['adminEmails'].map((value: unknown) => normalizeEmailValue(value))
    : [];
  const adminUids = Array.isArray(page['adminUids'])
    ? page['adminUids'].map((value: unknown) => String(value || '').trim())
    : [];

  return (
    (!!uid && page['authorId'] === uid) ||
    (!!uid && adminUids.includes(uid)) ||
    (!!email && adminEmails.includes(email))
  );
}

async function assertChallengePageAdmin(
  page: Record<string, any>,
  context: functions.https.CallableContext
): Promise<{ uid: string; email: string }> {
  const uid = context.auth?.uid || '';
  const email = normalizeEmailValue(context.auth?.token?.email);

  if (!uid || !email) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication is required.'
    );
  }

  if (isChallengePageAdmin(page, uid, email)) {
    return { uid, email };
  }

  throw new functions.https.HttpsError(
    'permission-denied',
    'Only challenge space admins can respond to join requests.'
  );
}

export const requestChallengePageJoin = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    const uid = context.auth?.uid || '';
    const authEmail = normalizeEmailValue(context.auth?.token?.email);
    const challengePageId = String(data?.challengePageId || '').trim();
    const message = String(data?.message || '').trim();

    if (!uid || !authEmail) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Authentication is required to request access.'
      );
    }

    if (!challengePageId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'challengePageId is required.'
      );
    }

    if (!message) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A note is required to request access.'
      );
    }

    if (message.length > 2000) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Please keep the request note under 2000 characters.'
      );
    }

    const db = admin.firestore();
    const pageRef = db.doc(`challengePages/${challengePageId}`);
    const pageSnap = await pageRef.get();
    if (!pageSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Challenge space not found.'
      );
    }

    const page = pageSnap.data() || {};
    const participants = Array.isArray(page['participants'])
      ? page['participants'].map((value: unknown) => normalizeEmailValue(value))
      : [];
    if (participants.includes(authEmail) || isChallengePageAdmin(page, uid, authEmail)) {
      return { success: true, alreadyMember: true };
    }

    const requesterProfile = await getUserProfileByUid(uid);
    const firstName = String(requesterProfile['firstName'] || '').trim();
    const lastName = String(requesterProfile['lastName'] || '').trim();
    const tokenName = String(context.auth?.token?.name || '').trim();
    const requesterName =
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      tokenName ||
      authEmail;
    const title = String(
      page['name'] || page['heading'] || 'Challenge Space'
    ).trim();
    const pagePath = `${APP_BASE_URL.replace(
      /\/$/,
      ''
    )}/home-challenge/${encodeURIComponent(
      String(page['customUrl'] || challengePageId)
    )}`;
    const requestRef = db
      .collection('challengeJoinRequests')
      .doc(challengeJoinRequestId(challengePageId, uid));
    const existingRequestSnap = await requestRef.get();
    const existingRequest = existingRequestSnap.data() || {};

    await requestRef.set(
      {
        challengePageId,
        challengePageTitle: title,
        challengePagePath: pagePath,
        requesterUid: uid,
        requesterEmail: authEmail,
        requesterName,
        message,
        status: 'pending',
        createdAt:
          existingRequest['createdAt'] ||
          admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const recipients = await getChallengePageAdminEmails(page, authEmail);
    if (!recipients.length) {
      return { success: true, recipients: 0 };
    }

    const safeRequester = escapeEmailHtml(requesterName);
    const safeEmail = escapeEmailHtml(authEmail);
    const safeTitle = escapeEmailHtml(title);
    const safeMessage = escapeEmailHtml(message).replace(/\r?\n/g, '<br />');
    const manageUrl = `${APP_BASE_URL.replace(/\/$/, '')}/challenge-spaces`;

    await sgMail.send({
      from: { email: 'newworld@newworld-game.org', name: 'NewWorld Game' },
      subject: `New request to join ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; color:#0f172a; line-height:1.6;">
          <h2 style="margin:0 0 12px;">New challenge space join request</h2>
          <p><strong>${safeRequester}</strong> (<a href="mailto:${safeEmail}">${safeEmail}</a>) requested to join <strong>${safeTitle}</strong>.</p>
          <div style="margin:18px 0; padding:16px; border-radius:12px; background:#f1f5f9;">
            <div style="font-size:12px; font-weight:700; color:#047857; text-transform:uppercase; letter-spacing:0.08em;">Their note</div>
            <p style="margin:8px 0 0;">${safeMessage}</p>
          </div>
          <a href="${manageUrl}" style="display:inline-block; padding:12px 18px; background:#047857; color:#ffffff; border-radius:10px; text-decoration:none; font-weight:700;">Review request</a>
        </div>
      `,
      text: `${requesterName} (${authEmail}) requested to join ${title}.\n\n${message}\n\nReview: ${manageUrl}`,
      personalizations: recipients.map((email) => ({ to: [{ email }] })),
    } as sgMail.MailDataRequired);

    return { success: true, recipients: recipients.length };
  }
);

export const acceptChallengePageJoinRequest = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    const requestId = String(data?.requestId || '').trim();
    if (!requestId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'requestId is required.'
      );
    }

    const db = admin.firestore();
    const requestRef = db.collection('challengeJoinRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Join request not found.'
      );
    }

    const request = requestSnap.data() || {};
    const challengePageId = String(request['challengePageId'] || '').trim();
    const requesterEmail = normalizeEmailValue(request['requesterEmail']);
    if (!challengePageId || !emailRegex.test(requesterEmail)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Join request is missing required data.'
      );
    }

    const pageRef = db.doc(`challengePages/${challengePageId}`);
    const pageSnap = await pageRef.get();
    if (!pageSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Challenge space not found.'
      );
    }

    const actor = await assertChallengePageAdmin(pageSnap.data() || {}, context);

    await db.runTransaction(async (transaction) => {
      transaction.set(
        pageRef,
        {
          participants: admin.firestore.FieldValue.arrayUnion(requesterEmail),
        },
        { merge: true }
      );
      transaction.set(
        requestRef,
        {
          status: 'accepted',
          decidedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          decidedByUid: actor.uid,
          decidedByEmail: actor.email,
        },
        { merge: true }
      );
    });

    const title = String(
      request['challengePageTitle'] || 'the challenge space'
    ).trim();
    const path = String(
      request['challengePagePath'] ||
        `${APP_BASE_URL.replace(/\/$/, '')}/home-challenge/${encodeURIComponent(
          challengePageId
        )}`
    );
    const requesterName = String(
      request['requesterName'] || requesterEmail
    ).trim();

    try {
      await sgMail.send({
        to: requesterEmail,
        from: { email: 'newworld@newworld-game.org', name: 'NewWorld Game' },
        subject: `Your request to join ${title} was accepted`,
        html: `
          <div style="font-family: Arial, sans-serif; color:#0f172a; line-height:1.6;">
            <h2 style="margin:0 0 12px;">Your request was accepted</h2>
            <p>Hi ${escapeEmailHtml(requesterName)},</p>
            <p>You are now a member of <strong>${escapeEmailHtml(title)}</strong>.</p>
            <a href="${escapeEmailHtml(path)}" style="display:inline-block; padding:12px 18px; background:#047857; color:#ffffff; border-radius:10px; text-decoration:none; font-weight:700;">Open challenge space</a>
          </div>
        `,
        text: `Your request to join ${title} was accepted. Open the challenge space: ${path}`,
      } as sgMail.MailDataRequired);
    } catch (error) {
      console.error('Could not email accepted challenge join request', error);
    }

    return { success: true };
  }
);

export const rejectChallengePageJoinRequest = functions.https.onCall(
  async (data: any, context: functions.https.CallableContext) => {
    const requestId = String(data?.requestId || '').trim();
    if (!requestId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'requestId is required.'
      );
    }

    const db = admin.firestore();
    const requestRef = db.collection('challengeJoinRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Join request not found.'
      );
    }

    const request = requestSnap.data() || {};
    const challengePageId = String(request['challengePageId'] || '').trim();
    const pageSnap = await db.doc(`challengePages/${challengePageId}`).get();
    if (!pageSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Challenge space not found.'
      );
    }

    const actor = await assertChallengePageAdmin(pageSnap.data() || {}, context);
    await requestRef.set(
      {
        status: 'rejected',
        decidedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        decidedByUid: actor.uid,
        decidedByEmail: actor.email,
      },
      { merge: true }
    );

    return { success: true };
  }
);

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

const TEXT_IMPORT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

const TEXT_IMPORT_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.csv',
]);

const TEXT_IMPORT_MAX_BYTES = 8 * 1024 * 1024;
const TEXT_IMPORT_MAX_CHARS = 120000;

function normalizeTextImportMime(mimeType: unknown, fileName: unknown): string {
  const rawMime = String(mimeType || '').toLowerCase().split(';')[0].trim();
  const lowerName = String(fileName || '').toLowerCase();
  if (rawMime) return rawMime;
  if (lowerName.endsWith('.pdf')) return 'application/pdf';
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lowerName.endsWith('.doc')) return 'application/msword';
  if (lowerName.endsWith('.txt')) return 'text/plain';
  if (lowerName.endsWith('.md')) return 'text/markdown';
  if (lowerName.endsWith('.csv')) return 'text/csv';
  return 'application/octet-stream';
}

function hasAllowedTextImportExtension(fileName: unknown): boolean {
  const lowerName = String(fileName || '').toLowerCase();
  return Array.from(TEXT_IMPORT_ALLOWED_EXTENSIONS).some((extension) =>
    lowerName.endsWith(extension)
  );
}

function cleanExtractedDocumentText(value: unknown): string {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, TEXT_IMPORT_MAX_CHARS);
}

export const extractDocumentText = functions
  .runWith({ timeoutSeconds: 60, memory: '512MB' })
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Sign in to extract document text.'
      );
    }

    const fileName = String(data?.fileName || 'document').slice(0, 240);
    const mime = normalizeTextImportMime(data?.mimeType, fileName);

    if (
      !TEXT_IMPORT_ALLOWED_MIME_TYPES.has(mime) &&
      !hasAllowedTextImportExtension(fileName)
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Upload a PDF, DOCX, DOC, TXT, Markdown, or CSV file.'
      );
    }

    const rawBase64 = String(data?.fileBase64 || '').replace(
      /^data:[^;]+;base64,/,
      ''
    );
    if (!rawBase64) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No document content was provided.'
      );
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    if (!buffer.length) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The selected document is empty.'
      );
    }
    if (buffer.length > TEXT_IMPORT_MAX_BYTES) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Choose a file smaller than 8 MB.'
      );
    }

    try {
      if (mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - no types published for pdf-parse
        const pdfMod: any = await import('pdf-parse');
        const parsePdf = pdfMod.default || pdfMod;
        const { text } = await parsePdf(buffer);
        return { text: cleanExtractedDocumentText(text) };
      }

      if (
        mime ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileName.toLowerCase().endsWith('.docx')
      ) {
        const { value } = await mammoth.extractRawText({ buffer });
        return { text: cleanExtractedDocumentText(value) };
      }

      if (mime === 'application/msword' || fileName.toLowerCase().endsWith('.doc')) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Legacy .doc files cannot always be read here. Save the document as .docx and upload it again.'
        );
      }

      return { text: cleanExtractedDocumentText(buffer.toString('utf8')) };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      console.error('extractDocumentText failed:', {
        fileName,
        mime,
        message: error?.message || error,
      });
      throw new functions.https.HttpsError(
        'internal',
        'Could not extract text from this document.'
      );
    }
  });

type BulkEmailAttachmentInput = {
  name?: string;
  filename?: string;
  storagePath?: string;
  contentType?: string;
  size?: number;
};

type PreparedBulkEmailAttachment = {
  filename: string;
  storagePath: string;
  contentType: string;
  size: number;
  sendGrid: {
    content: string;
    filename: string;
    type: string;
    disposition: 'attachment';
  };
};

const BULK_EMAIL_ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
]);
const BULK_EMAIL_ATTACHMENT_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
]);
const BULK_EMAIL_ATTACHMENT_MAX_BYTES = 10_000_000;
const BULK_EMAIL_ATTACHMENT_MAX_TOTAL_BYTES = 20_000_000;
const BULK_EMAIL_ATTACHMENT_MAX_COUNT = 10;
const BULK_EMAIL_ATTACHMENT_STORAGE_PREFIX = 'bulk-mails/';

function sanitizeBulkAttachmentName(value: string): string {
  const cleaned = value.replace(/[\\/\r\n\t]+/g, '_').trim();
  return cleaned || 'attachment';
}

function getBulkAttachmentContentType(filename: string): string {
  switch (path.extname(filename).toLowerCase()) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

function isAllowedBulkAttachment(
  contentType: string,
  filename: string
): boolean {
  const normalizedType = (contentType || '').toLowerCase();
  const extension = path.extname(filename).toLowerCase();
  return (
    BULK_EMAIL_ATTACHMENT_ALLOWED_MIME_TYPES.has(normalizedType) ||
    BULK_EMAIL_ATTACHMENT_ALLOWED_EXTENSIONS.has(extension)
  );
}

async function prepareBulkEmailAttachments(
  rawAttachments: any
): Promise<PreparedBulkEmailAttachment[]> {
  const attachments = Array.isArray(rawAttachments) ? rawAttachments : [];
  if (!attachments.length) return [];

  if (attachments.length > BULK_EMAIL_ATTACHMENT_MAX_COUNT) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `You can attach up to ${BULK_EMAIL_ATTACHMENT_MAX_COUNT} files per email.`
    );
  }

  const bucket = admin.storage().bucket();
  const prepared: PreparedBulkEmailAttachment[] = [];
  let totalBytes = 0;

  for (let index = 0; index < attachments.length; index++) {
    const item = attachments[index] as BulkEmailAttachmentInput;
    const storagePath = (item?.storagePath || '').toString().trim();
    if (
      !storagePath ||
      !storagePath.startsWith(BULK_EMAIL_ATTACHMENT_STORAGE_PREFIX)
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Attachment ${index + 1} has an invalid storage path.`
      );
    }

    const file = bucket.file(storagePath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Attachment ${index + 1} could not be found.`
      );
    }

    const [metadata] = await file.getMetadata();
    const requestedName = (
      item?.filename ||
      item?.name ||
      path.basename(storagePath)
    ).toString();
    let filename = sanitizeBulkAttachmentName(requestedName);
    const storageExtension = path.extname(storagePath).toLowerCase();
    if (!path.extname(filename) && storageExtension) {
      filename += storageExtension;
    }

    const contentType = (
      metadata?.contentType ||
      item?.contentType ||
      getBulkAttachmentContentType(filename)
    )
      .toString()
      .toLowerCase();

    if (!isAllowedBulkAttachment(contentType, filename)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `${filename} is not an allowed attachment type.`
      );
    }

    const metadataSize = Number(metadata?.size || item?.size || 0);
    if (!Number.isFinite(metadataSize) || metadataSize <= 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `${filename} is empty or has an invalid size.`
      );
    }
    if (metadataSize > BULK_EMAIL_ATTACHMENT_MAX_BYTES) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `${filename} exceeds the 10 MB attachment limit.`
      );
    }

    totalBytes += metadataSize;
    if (totalBytes > BULK_EMAIL_ATTACHMENT_MAX_TOTAL_BYTES) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Attachments cannot exceed ${Math.round(
          BULK_EMAIL_ATTACHMENT_MAX_TOTAL_BYTES / (1024 * 1024)
        )} MB total.`
      );
    }

    const [buffer] = await file.download();
    if (!buffer.length || buffer.length > BULK_EMAIL_ATTACHMENT_MAX_BYTES) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `${filename} could not be attached.`
      );
    }

    prepared.push({
      filename,
      storagePath,
      contentType,
      size: buffer.length,
      sendGrid: {
        content: buffer.toString('base64'),
        filename,
        type: contentType,
        disposition: 'attachment',
      },
    });
  }

  return prepared;
}

function injectHiddenPreheader(html: string, preheader: string): string {
  if (!preheader) return html;
  const preheaderSpan = `<span style="display:none!important;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>`;
  return /<body([^>]*)>/i.test(html)
    ? html.replace(/<body([^>]*)>/i, (match: string) => `${match}${preheaderSpan}`)
    : preheaderSpan + html;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

    const attachments = await prepareBulkEmailAttachments(data?.attachments);

    // Preheader injection (kept invisible in most clients)
    html = injectHiddenPreheader(html, preheader);

    const msg: sgMail.MailDataRequired = {
      to,
      from: { email: fromEmail, name: 'NewWorld Game' }, // adjust branding
      subject,
      html,
      text: htmlToPlainText(html),
      // Optional: tracking/categorization
      trackingSettings: {
        clickTracking: { enable: true, enableText: true },
        openTracking: { enable: true },
      },
      categories: ['bulk-mail-tester'],
      attachments: attachments.map((file) => file.sendGrid),
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

  const attachments = await prepareBulkEmailAttachments(data?.attachments);

  // Normalize + validate
  const normalizeMergeFieldKey = (raw: string): string => {
    const cleaned = (raw || '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .toLowerCase();

    if (!cleaned) return '';

    const parts = cleaned.split(/\s+/).filter(Boolean);
    return parts
      .map((part, index) =>
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
      )
      .join('');
  };

  const mergeFieldAliases = (key: string): string[] => {
    const normalized = normalizeMergeFieldKey(key);
    const snake = normalized
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase();
    const compact = normalized.replace(/_/g, '').toLowerCase();

    return Array.from(
      new Set(
        [key, key?.trim?.() || '', normalized, snake, compact].filter(Boolean)
      )
    );
  };

  const normalizeRecipientFields = (fields: Record<string, any>) => {
    const normalized: Record<string, string> = {};

    Object.entries(fields || {}).forEach(([rawKey, rawValue]) => {
      const key = normalizeMergeFieldKey(rawKey);
      if (!key) return;
      normalized[key] = rawValue == null ? '' : String(rawValue).trim();
    });

    return normalized;
  };

  const extractEmailFromRecipient = (recipient: any): string => {
    if (typeof recipient === 'string') return recipient;
    if (recipient && typeof recipient === 'object') {
      if (recipient.email != null) return String(recipient.email).trim();
      const match = Object.keys(recipient).find((key) => /email/i.test(key));
      if (match) return String(recipient[match] ?? '').trim();
    }
    return '';
  };

  const buildRecipientSubstitutions = (
    email: string,
    fields: Record<string, string>
  ) => {
    const baseFields: Record<string, string> = {
      ...fields,
      email,
      unsubscribeUrl: `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(
        email
      )}`,
      unsubscribe_url: `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(
        email
      )}`,
    };

    const substitutions: Record<string, string> = {};
    Object.entries(baseFields).forEach(([key, value]) => {
      mergeFieldAliases(key).forEach((alias) => {
        substitutions[alias] = value ?? '';
      });
    });

    return substitutions;
  };

  const renderMergeFields = (
    template: string,
    fields: Record<string, string>
  ): string => {
    if (!template) return '';

    const tokenValues = new Map<string, string>();
    Object.entries(fields || {}).forEach(([key, value]) => {
      mergeFieldAliases(key).forEach((alias) => {
        tokenValues.set(alias, value ?? '');
      });
    });

    return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (full, key) => {
      return tokenValues.has(key) ? tokenValues.get(key)! : full;
    });
  };

  const rawTokens: string[] = [];
  const normalizedRecipients: Array<{
    email: string;
    fields: Record<string, string>;
  }> = [];

  for (const recipient of toList) {
    const emailValue = extractEmailFromRecipient(recipient);
    if (!emailValue) continue;

    const fields =
      recipient && typeof recipient === 'object'
        ? normalizeRecipientFields(recipient.fields || recipient)
        : {};

    const parts = emailValue
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      rawTokens.push(part);
      normalizedRecipients.push({
        email: part,
        fields,
      });
    }
  }

  const seen = new Set<string>();
  const valid: Array<{ email: string; fields: Record<string, string> }> = [];
  const invalid: string[] = [];
  for (const recipient of normalizedRecipients) {
    const lower = recipient.email.toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lower)) {
      if (!seen.has(lower)) {
        seen.add(lower);
        valid.push({
          email: lower,
          fields: recipient.fields,
        });
      }
    } else {
      invalid.push(recipient.email);
    }
  }
  const duplicates = Math.max(
    0,
    rawTokens.length - valid.length - invalid.length
  );

  // Preheader injection + text fallback
  html = injectHiddenPreheader(html, preheader);
  const text = htmlToPlainText(html);

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
      attachments: attachments.map((file) => ({
        filename: file.filename,
        storagePath: file.storagePath,
        contentType: file.contentType,
        size: file.size,
      })),
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
      attachments: attachments.map((file) => file.sendGrid),
      substitutionWrappers: ['{{', '}}'] as [string, string],
      personalizations: batch.map((recipient) => ({
        to: [{ email: recipient.email }],
        subject: renderMergeFields(subject, {
          ...recipient.fields,
          email: recipient.email,
          unsubscribeUrl: `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(
            recipient.email
          )}`,
          unsubscribe_url: `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(
            recipient.email
          )}`,
        }),
        substitutions: buildRecipientSubstitutions(recipient.email, recipient.fields),
      })),
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
    total: valid.length,
    batches: results,
    summary: {
      requested: rawTokens.length,
      valid: valid.length,
      invalid: invalid.length,
      duplicates,
      batches: results.length,
    },
  };
});

function parseClockTime(time: string): { hours: number; minutes: number } {
  const normalized = String(time || '').trim().split('-')[0].trim();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    return { hours: 9, minutes: 0 };
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3].toUpperCase();
  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return { hours, minutes };
}

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const zoneName = parts.find((part) => part.type === 'timeZoneName')?.value;
  const match = zoneName?.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return -300;
  }

  const sign = match[1] === '+' ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  return sign * (hours * 60 + minutes);
}

function buildUtcDateFromBooking(
  dateValue: string,
  timeValue: string,
  timeZone = 'America/New_York'
): Date {
  const [year, month, day] = String(dateValue).split('-').map(Number);
  const { hours, minutes } = parseClockTime(timeValue);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offsetMinutes * 60_000);
}

export const sendDemoInvite = functions.firestore
  .document('demoBookings/{demoId}')
  .onCreate(async (snap) => {
    const data = snap.data(); // bracket notation everywhere

    /* 1 ║ Build start / end time */
    const meetingLink = 'https://meet.google.com/pea-twnz-uwn';
    const isGslPrep = data['bookingType'] === 'gsl2026Prep';
    const meetingTitle =
      data['meetingTitle'] ||
      (isGslPrep
        ? 'Team meeting with Medard Gabel for Global Solutions Lab 2026 prep'
        : 'NewWorld Game Workshop');
    const meetingDescription =
      data['meetingDescription'] ||
      (isGslPrep
        ? 'Team prep meeting for Global Solutions Lab 2026 solution presentations.'
        : 'Live NewWorld Game workshop with the NewWorld team.');
    const timeZone = data['bookingTimeZone'] || 'America/New_York';
    const startUTC = buildUtcDateFromBooking(
      data['demoDate'],
      data['demoStartTime'] || data['demoTime'],
      timeZone
    );
    functions.logger.info('SG key starts with', API_KEY.slice(0, 10));

    /* 2 ║ Build .ics attachment */
    const ics = buildICS(
      startUTC,
      data['name'],
      data['email'],
      meetingLink,
      meetingTitle,
      meetingDescription
    );

    const attachment = {
      content: Buffer.from(ics.replace(/\n/g, '\r\n')).toString('base64'),
      filename: 'invite.ics',
      type: 'text/calendar', // ← no “; method=…”
      disposition: 'attachment',
    };

    /* 3 ║ Message subjects */
    const userSubject = isGslPrep
      ? `✅ GSL 2026 prep meeting - ${data['demoDate']} ${data['demoTime']} ET`
      : `✅ NewWorld Game Workshop – ${data['demoDate']} ${data['demoTime']} EST`;
    const opsSubject = isGslPrep
      ? `📆 GSL team meeting booked - ${data['teamName'] || 'Team'} - ${
          data['demoDate']
        } ${data['demoTime']} ET`
      : `📆 Demo booked – ${data['name']} – ${data['demoDate']} ${data['demoTime']} EST`;

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
        meetingLink,
      },
      attachments: [attachment],
    };

    const opsMsg = {
      to: 'newworld@newworld-game.org',
      from: 'newworld@newworld-game.org',
      subject: opsSubject,
      text: isGslPrep
        ? `${data['name']} booked a GSL 2026 prep team meeting with Medard Gabel.\nTeam: ${
            data['teamName'] || 'Not provided'
          }\nSlot: ${data['demoDate']} ${data['demoTime']} ET\nEmail: ${
            data['email']
          }\nNotes: ${data['notes'] || ''}`
        : `${data['name']} booked ${data['demoDate']} at ${data['demoTime']} EST\nNotes: ${data['notes']}`,
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

const AVATAR_CHAT_COLLECTIONS = new Set([
  'discussions',
  'zara',
  'arjun',
  'sofia',
  'li',
  'amina',
  'elena',
  'tane',
  'business',
  'marie',
  'rachel',
  'bucky',
  'albert',
  'nelson',
  'gandhi',
  'twain',
  'mark',
]);

const MARK_TWAIN_COLLECTIONS = new Set(['twain', 'mark']);

function getAvatarSystemInstruction(collectionId: string): string {
  if (MARK_TWAIN_COLLECTIONS.has(collectionId)) {
    return `
You are “Twain-ish Curator.” Rules:
1) Always respond ONLY in quotation marks.
2) Prefer short, wry, skeptical quotations that fit almost any topic.
3) When known, attribute: —Mark Twain. If not Twain, use the correct source; if uncertain, say —attributed.
4) If no fitting quote is available, use a pithy proverb with —proverb.
5) Never explain or add text outside the quotes.
    `.trim();
  }

  return '';
}

function normalizeAvatarAnswer(collectionId: string, answer: string): string {
  const trimmed = String(answer || '').replace(/\r/g, '').trim();
  if (!trimmed) return '';

  if (!MARK_TWAIN_COLLECTIONS.has(collectionId)) {
    return trimmed;
  }

  const lines = trimmed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const quoteWithAttribution = trimmed.match(
    /[“"]([^”"]{3,280})[”"]\s*(?:[—-]\s*[^\n]{2,120})?/
  );
  if (quoteWithAttribution?.[0]) {
    return quoteWithAttribution[0].trim();
  }

  const quoteLineIndex = lines.findIndex((line) => /[“"].+[”"]/.test(line));
  if (quoteLineIndex !== -1) {
    return lines.slice(quoteLineIndex, quoteLineIndex + 2).join('\n').trim();
  }

  return lines.slice(0, 2).join('\n').trim();
}

function stripPromptContextBlocks(prompt: string): string {
  const original = String(prompt || '').trim();
  if (!original.startsWith('[')) {
    return original;
  }

  let remaining = original;
  while (remaining.startsWith('[')) {
    const blockEnd = remaining.indexOf(']\n\n');
    if (blockEnd === -1) {
      break;
    }

    remaining = remaining.slice(blockEnd + 3).trimStart();
  }

  return remaining.trim() || original;
}

const processChatPrompt = async (snap: any): Promise<void> => {
    try {
      const prompt: string = (snap.data()?.['prompt'] || '').trim();
      if (!prompt) return;
      const userPrompt = stripPromptContextBlocks(prompt);
      const collectionId = String(snap.ref.parent?.id || '')
        .trim()
        .toLowerCase();
      const avatarSystemInstruction = getAvatarSystemInstruction(collectionId);

      /* mark as processing */
      await snap.ref.update({
        status: { state: 'PROCESSING' },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ────────── 0. helpers ─────────────────────────────────────
      const colRef = snap.ref.parent!;
      const allDocs = await colRef.get();
      const sorted = allDocs.docs
        .filter((d: any) => d.id !== snap.id)
        .sort(
          (a: any, b: any) =>
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
      if (avatarSystemInstruction) {
        history =
          `${avatarSystemInstruction}\n\n` +
          `Stay in character for the full reply.\n\n` +
          history;
      }

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
      const wantsImage = imagePatterns.some((pattern) =>
        pattern.test(userPrompt)
      );

      // Use Imagen 4 for image generation and Gemini 2.5 Flash for text
      // Use gemini-2.5-flash for text-only responses with grounding
      const textModelName = 'gemini-2.5-flash';

      console.log('Model selection:', {
        wantsImage,
        modelName: wantsImage ? 'imagen-4.0-generate-001' : textModelName,
        promptPreview: userPrompt.slice(0, 100),
      });

      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const modelConfig: Record<string, unknown> = { model: textModelName };
      // Enable Google Search grounding for factual responses with sources
      if (!MARK_TWAIN_COLLECTIONS.has(collectionId)) {
        modelConfig['tools'] = [{ google_search: {} }];
      }
      const model = genAI.getGenerativeModel(modelConfig as any);

      // For image generation, create a clean, focused prompt
      let cleanImagePrompt = userPrompt;
      if (wantsImage) {
        // Extract the core image request from the prompt, removing conversational fluff
        cleanImagePrompt = userPrompt
          .replace(/^(generate|create|make|draw|paint|design|render|produce)\s+(an?\s+)?(image|picture|photo|illustration|artwork|visual|graphic|diagram|infographic)\s+(of|for|showing|depicting|illustrating)?\s*/i, '')
          .replace(/^(générer|créer|faire|dessiner|peindre|concevoir|produire|rendre)\s+(une?\s+)?(image|photo|illustration|visuel|graphique|diagramme|infographie)\s+(de|pour|montrant|dépeignant|illustrant)?\s*/i, '')
          .trim();
        
        // If the cleaned prompt is too short, use the original user request
        if (cleanImagePrompt.length < 10) {
          cleanImagePrompt = userPrompt;
        }

        // Add quality-enhancing suffix for image generation
        cleanImagePrompt = `${cleanImagePrompt}. High quality, detailed, professional photograph or illustration with excellent composition and lighting.`;
      }

      // ────────── 3. generate ───────────────────────────────────
      let answer = '';
      let imgB64 = '';
      let finalResponse: any;

      if (wantsImage) {
        const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
        const qualityPrefix =
          'You are an expert AI image generator. Create a high-quality, detailed, professional image based on the following request. Make it visually stunning, well-composed, with good lighting and artistic quality.\n\n';

        // Use Imagen 4 for high-quality image generation
        try {
          console.log('Attempting image generation with Imagen 4');
          console.log('Image prompt:', cleanImagePrompt.slice(0, 200));

          const imageResult = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: cleanImagePrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '16:9',
            },
          });

          if (imageResult.generatedImages?.[0]?.image?.imageBytes) {
            imgB64 = imageResult.generatedImages[0].image.imageBytes;
            answer = "Here's the image I created for you.";
          }

          if (!imgB64) {
            answer = "I tried to generate an image but wasn't able to. This might be due to content restrictions. Try a prompt without people or sensitive content, like 'Generate an image of a futuristic sustainable city' or 'Create an illustration of renewable energy'.";
          }

          console.log('Imagen 4 generation result:', {
            hasImage: !!imgB64,
            answerLength: answer.length,
          });
        } catch (imageError: any) {
          console.error(
            'Imagen 4 generation error:',
            imageError?.message || imageError
          );

          const fallbackModels = [
            'gemini-2.0-flash-preview-image-generation',
            'gemini-2.0-flash-exp-image-generation',
          ];

          for (const fallbackModelName of fallbackModels) {
            if (imgB64) {
              break;
            }

            try {
              console.log(
                `Falling back to ${fallbackModelName} for image generation`
              );
              const fallbackConfig: Record<string, unknown> = {
                model: fallbackModelName,
                generationConfig: {
                  responseModalities: ['TEXT', 'IMAGE'],
                },
              };
              const fallbackModel = genAI.getGenerativeModel(
                fallbackConfig as any
              );
              const fallbackPrompt = qualityPrefix + cleanImagePrompt;

              const result = await fallbackModel.generateContent(fallbackPrompt);
              finalResponse = await result.response;
              const finishReason = finalResponse?.candidates?.[0]?.finishReason;

              if (finishReason === 'SAFETY') {
                answer =
                  "I apologize, but I couldn't generate that image due to content safety guidelines. Please try a different prompt that doesn't include people or sensitive content.";
              } else if (finishReason === 'RECITATION') {
                answer =
                  "I couldn't generate that image due to content restrictions. Please try a different prompt.";
              } else {
                answer = '';
                for (const part of finalResponse?.candidates?.[0]?.content?.parts ||
                  []) {
                  if (part.text) {
                    answer += part.text;
                  } else if (part.inlineData?.data) {
                    imgB64 = part.inlineData.data;
                  }
                }
              }

              console.log(`${fallbackModelName} fallback result:`, {
                hasImage: !!imgB64,
                answerLength: answer.length,
              });
            } catch (fallbackError: any) {
              console.error(
                `${fallbackModelName} fallback error:`,
                fallbackError?.message || fallbackError
              );

              answer = 'I encountered an issue generating that image. ';
              if (
                imageError?.message?.includes('SAFETY') ||
                imageError?.message?.includes('blocked') ||
                fallbackError?.message?.includes('SAFETY') ||
                fallbackError?.message?.includes('blocked')
              ) {
                answer +=
                  'The content may have been blocked due to safety guidelines. Try a different prompt without people or sensitive subjects.';
              } else if (
                imageError?.message?.includes('quota') ||
                imageError?.message?.includes('limit') ||
                fallbackError?.message?.includes('quota') ||
                fallbackError?.message?.includes('limit')
              ) {
                answer +=
                  'The image generation service may be temporarily unavailable. Please try again later.';
              } else {
                answer +=
                  "Please try a different prompt, such as 'Generate an image of a beautiful landscape' or 'Create a picture of a sustainable city'.";
              }
            }
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

      answer = normalizeAvatarAnswer(collectionId, answer);

      // ────────── 4. extract sources from grounding metadata ───────────────────────
      const sources: Array<{ title: string; url: string; priority: number }> = [];
      const candidate = finalResponse?.candidates?.[0];
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
        const downloadToken = randomUUID();
        await bucket.file(filePath).save(Buffer.from(imgB64, 'base64'), {
          metadata: {
            contentType: 'image/png',
            metadata: {
              createdAt: new Date().toISOString(),
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
          resumable: false,
        });
        const encodedFilePath = encodeURIComponent(filePath);
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedFilePath}?alt=media&token=${downloadToken}`;

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
            prompt: userPrompt.slice(0, 500),
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
  };

export const onChatPrompt = functions
  .region('us-central1')
  .firestore.document('users/{uid}/discussions/{docId}')
  .onCreate(processChatPrompt);

export const onAvatarChatPrompt = functions
  .region('us-central1')
  .firestore.document('users/{uid}/{collectionId}/{docId}')
  .onCreate(async (snap, context) => {
    const collectionId = String(context.params.collectionId || '')
      .trim()
      .toLowerCase();

    if (collectionId === 'discussions') {
      return null;
    }

    if (!AVATAR_CHAT_COLLECTIONS.has(collectionId)) {
      return null;
    }

    await processChatPrompt(snap);
    return null;
  });

/**
 * Report Generation Function
 * Triggered when a document is created in users/{uid}/report-requests/{docId}
 * Uses Google Search grounding to ensure up-to-date, cited reports.
 */
export const onReportRequest = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 180, memory: '1GB' })
  .firestore.document('users/{uid}/report-requests/{docId}')
  .onCreate(async (snap) => {
    const data = snap.data() || {};
    const prompt: string = (data?.prompt || '').trim();
    const isFundingReport = /Report Type:\s*Funding Sources List/i.test(prompt);

    if (!prompt) {
      await snap.ref.update({
        status: { state: 'ERRORED', message: 'No prompt provided' },
      });
      return;
    }

    try {
      await snap.ref.update({
        status: { state: 'PROCESSING' },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const modelConfig: Record<string, unknown> = {
        model: isFundingReport ? 'gemini-2.0-flash' : 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: isFundingReport ? 3500 : 5000,
        },
      };
      modelConfig['tools'] = [{ google_search: {} }];
      const model = genAI.getGenerativeModel(modelConfig as any);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract sources from grounding metadata
      const sources: Array<{ title: string; url: string; priority: number }> = [];
      const candidate = response.candidates?.[0];
      const seenUrls = new Set<string>();
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
      const getAuthorityScore = (hostname: string): number => {
        const lowerHost = hostname.toLowerCase();
        for (const domain of authoritativeDomains) {
          if (lowerHost.includes(domain)) return 10;
        }
        if (lowerHost.includes('wikipedia.org')) return 5;
        return 1;
      };
      const isValidSourceUrl = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) return false;
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
      const addSource = (url: string, title?: string) => {
        if (!url || seenUrls.has(url) || !isValidSourceUrl(url)) return;
        seenUrls.add(url);
        try {
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname;
          const priority = getAuthorityScore(hostname);
          let finalTitle = title;
          if (!finalTitle || finalTitle.length < 3) {
            finalTitle = hostname.replace(/^www\./, '');
            finalTitle = finalTitle.charAt(0).toUpperCase() + finalTitle.slice(1);
          }
          sources.push({ title: finalTitle, url, priority });
        } catch (e) {
          console.warn('Failed to parse URL:', url, e);
        }
      };
      if (candidate?.groundingMetadata?.groundingChunks) {
        for (const chunk of candidate.groundingMetadata.groundingChunks) {
          if (chunk.web?.uri) {
            addSource(chunk.web.uri, chunk.web.title);
          }
        }
      }
      sources.sort((a, b) => b.priority - a.priority);
      const sourceCandidates = sources.slice(0, isFundingReport ? 25 : 10);
      const validatedSourceResults = await Promise.all(
        sourceCandidates.map(async (s) => ({
          source: s,
          valid: await isUrlUsableForReport(s.url),
        }))
      );
      const cleanSources = validatedSourceResults
        .filter((r) => r.valid)
        .slice(0, isFundingReport ? 15 : 10)
        .map(({ source }) => ({ title: source.title, url: source.url }));

      let finalText = text || '';
      if (isFundingReport && finalText) {
        const extracted = finalText.match(/https?:\/\/[^\s<>"')\]]+/g) || [];
        const uniqueUrls = Array.from(
          new Set(
            extracted
              .map((u) => u.replace(/[),.;]+$/g, ''))
              .filter(Boolean)
          )
        ).slice(0, 40);

        if (uniqueUrls.length) {
          const validatedInText = await Promise.all(
            uniqueUrls.map(async (url) => ({
              url,
              valid: await isUrlUsableForReport(url),
            }))
          );
          const invalidUrls = validatedInText.filter((x) => !x.valid).map((x) => x.url);
          if (invalidUrls.length) {
            // Remove lines that contain dead links.
            const lines = finalText.split('\n').filter((line) => {
              const normalized = line.trim();
              if (!normalized) return true;
              return !invalidUrls.some((badUrl) => normalized.includes(badUrl));
            });
            finalText = lines.join('\n');

            // Remove funder profile cards without any remaining valid URL.
            const cardRegex =
              /(FUNDER PROFILE CARD[\s\S]*?)(?=\nFUNDER PROFILE CARD|\n3\.\s*MASTER TABLE|\n4\.\s*CONTACT DIRECTORY|\n5\.\s*ANNEX|$)/gi;
            finalText = finalText.replace(cardRegex, (cardBlock) => {
              const cardUrls = cardBlock.match(/https?:\/\/[^\s<>"')\]]+/g) || [];
              const hasValidLink = cardUrls.some(
                (url) => !invalidUrls.includes(url.replace(/[),.;]+$/g, ''))
              );
              return hasValidLink ? cardBlock : '';
            });

            // Clean extra blank lines introduced by removals.
            finalText = finalText.replace(/\n{3,}/g, '\n\n');
          }
        }
      }

      await snap.ref.update({
        status: { state: 'COMPLETED' },
        response: finalText || null,
        sources: cleanSources.length > 0 ? cleanSources : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err: any) {
      console.error('onReportRequest error:', err?.message || err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      let userFriendlyError = 'An unexpected error occurred. Please try again.';
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

type PresentationDocInput = {
  name?: string;
  originalFilename?: string;
  description?: string;
  downloadURL?: string;
  type?: string;
};

type GeneratedDeckSlide = {
  title?: string;
  kicker?: string;
  layout?:
    | 'hero'
    | 'signal'
    | 'dashboard'
    | 'comparison'
    | 'roadmap'
    | 'image'
    | 'split'
    | 'quote'
    | 'steps'
    | 'closing';
  bullets?: string[];
  notes?: string;
  visualCue?: string;
  imageSearchQuery?: string;
  imagePrompt?: string;
  imageUrl?: string;
};

type GeneratedDeckPlan = {
  title?: string;
  subtitle?: string;
  audience?: string;
  narrative?: string;
  slides?: GeneratedDeckSlide[];
};

type PresentationViewerSlide = {
  title: string;
  subtitle?: string;
  kicker?: string;
  layout?: string;
  imageUrl?: string;
  bullets: string[];
  visualCue?: string;
};

const PRESENTATION_PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const GOOGLE_SLIDES_MIME = 'application/vnd.google-apps.presentation';
const PRESENTATION_FALLBACK_IMAGE =
  'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2Fgeneric-image.jpg?alt=media&token=c4e8d393-50e6-4080-bfcd-923848db7007';
const PRESENTATION_TEXT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
];
const PRESENTATION_IMAGE_MODELS = [
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
];
const PRESENTATION_IMAGEN_MODELS = [
  'imagen-3.0-generate-002',
  'imagen-4.0-generate-001',
];
const INFOGRAPHIC_IMAGE_MODELS = [
  'gemini-2.5-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
];
const INFOGRAPHIC_IMAGEN_MODELS = [
  'imagen-4.0-generate-001',
  'imagen-3.0-generate-002',
];
const PRESENTATION_MAX_GENERATED_IMAGES = 8;
const PRESENTATION_DRIVE_FOLDER_ID = '1Rib4RlYsv-PsL1QOhlAoht-fw0tUHLEy';
const PRESENTATION_SERVICE_ACCOUNT_EMAIL =
  'new-worldgame@appspot.gserviceaccount.com';
const PRESENTATION_VISUAL_STYLE =
  'premium editorial presentation image, authentic and dignified local problem-solving, cinematic but realistic, strong human-scale context, clean 16:9 composition, generous negative space for editable slide text, deep teal and warm amber accents, paper-white and near-black visual system, no words, no letters, no numbers, no labels, no UI text, no logos, no watermark, no poverty-porn stereotypes';

function cleanPresentationText(value: unknown, max = 6000): string {
  const text = String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, max);
}

function slugPresentationFileName(value: string): string {
  const slug = cleanPresentationText(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'ai-presentation';
}

function uniquePresentationStrings(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function extractImageUrlsFromHtml(value: unknown): string[] {
  const text = String(value || '');
  const urls: string[] = [];
  const srcRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = srcRegex.exec(text))) {
    const url = match[1]?.trim();
    if (/^https?:\/\//i.test(url)) {
      urls.push(url);
    }
  }
  return urls;
}

function firstMatchingSentence(sourceText: string, words: string[], fallback: string): string {
  const normalizedWords = words.map((word) => word.toLowerCase());
  const sentences = sourceText
    .split(/\n+/)
    .flatMap((line) => {
      const cleanedLine = cleanPresentationText(line, 2400)
        .replace(/^Title:\s*[^.?!\n]{1,120}$/i, '')
        .replace(/^([A-Za-z0-9 .&()/\-]{1,54}):\s*/i, '');
      return cleanedLine.split(/(?<=[.!?])\s+/);
    })
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 36 && sentence.length < 260);
  const found = sentences.find((sentence) => {
    const lower = sentence.toLowerCase();
    return normalizedWords.some((word) => lower.includes(word));
  });
  return cleanPresentationText(found || fallback, 180);
}

function buildContentAwareFallbackDeckPlan(
  sourceText: string,
  fallbackTitle: string
): GeneratedDeckPlan {
  const title = cleanPresentationText(fallbackTitle || 'AI Presentation', 90);
  const problem = firstMatchingSentence(
    sourceText,
    ['problem', 'chatbot', 'spoon-feed', 'critical thinking', 'reasoning'],
    'Students are relying on direct-answer chatbots instead of building reasoning and deep understanding.'
  );
  const stakes = firstMatchingSentence(
    sourceText,
    ['superficial', 'retention', 'misinformation', 'workforce', 'passive'],
    'The cost is a generation of passive learners who struggle to transfer knowledge into new contexts.'
  );
  const solution = firstMatchingSentence(
    sourceText,
    ['adaptive questioning', 'socratic', 'learning companion', 'guided dialogues', 'reasoning gaps'],
    'SocraticLens uses adaptive questioning and Socratic dialogue to detect reasoning gaps and strengthen understanding.'
  );
  const scope = firstMatchingSentence(
    sourceText,
    ['google classroom', 'whatsapp', 'offline', 'low-resource', 'parents'],
    'The product can support students and parents through guided dialogues, progress insights, classroom integrations, and offline use.'
  );
  const cost = firstMatchingSentence(
    sourceText,
    ['$30,000', '$70,000', 'proof-of-concept', 'mvp', 'pilot'],
    'A lean proof-of-concept can validate the core mechanism before full-scale investment.'
  );

  return {
    title,
    subtitle: cleanPresentationText(
      'An adaptive AI learning companion that teaches by questioning, not answering.',
      160
    ),
    audience: 'Educators, funders, product partners, and implementation teams',
    narrative:
      'SocraticLens reframes AI tutoring from answer delivery into guided reasoning practice.',
    slides: [
      {
        title: 'Answers Are Too Easy',
        kicker: 'Hook',
        layout: 'hero',
        bullets: [problem],
        notes: 'Open with the learning tension: convenience is replacing cognitive struggle.',
        visualCue: 'A learner pauses before a difficult question while an answer stream waits in the background.',
        imageSearchQuery: 'student thinking with AI',
        imagePrompt:
          'A thoughtful student at a desk facing a laptop, pausing before a difficult learning problem, subtle AI glow in the room, no visible screen text, warm editorial lighting, deep teal and amber palette, dignified and hopeful mood, clean negative space on the left',
      },
      {
        title: 'The Hidden Cost',
        kicker: 'Stakes',
        layout: 'split',
        bullets: [
          stakes,
          'Critical analysis weakens when struggle is bypassed.',
          'Students can recall answers without explaining reasoning.',
          'Misinformation risk rises without stronger judgment habits.',
        ],
        notes: 'Frame the issue as cognitive development, not anti-technology.',
        visualCue: 'Large warning signal with four consequence cards.',
        imageSearchQuery: 'passive AI learning classroom',
        imagePrompt:
          'A cinematic classroom study scene showing a student surrounded by easy digital answers but looking uncertain, no screen text, thoughtful rather than dystopian, editorial realism, deep teal shadows with warm amber highlights, wide 16:9 with negative space',
      },
      {
        title: 'The Reframe',
        kicker: 'Insight',
        layout: 'quote',
        bullets: ['The better AI tutor should ask the next question, not give the final answer.'],
        notes: 'This is the core thesis the audience should remember.',
        visualCue: 'Minimal quote treatment, high contrast, no decorative clutter.',
      },
      {
        title: 'SocraticLens',
        kicker: 'Solution',
        layout: 'split',
        bullets: [
          solution,
          'Adapts questions to each learner’s reasoning level.',
          'Offers guided dialogues instead of instant answers.',
          'Shows parents how reasoning improves over time.',
        ],
        notes: 'Describe the product as a mentor pattern, not another chatbot.',
        visualCue: 'Product concept beside mentor-like learning scene.',
        imageSearchQuery: 'adaptive learning dialogue',
        imagePrompt:
          'An optimistic scene of a student and parent reviewing a learning journey together near a tablet, abstract AI question path visualized as soft light arcs, no readable UI text, modern home learning setting, deep teal and warm amber palette, clean space for slide copy',
      },
      {
        title: 'How It Works',
        kicker: 'Mechanism',
        layout: 'steps',
        bullets: [
          'Diagnose the learner’s reasoning gap.',
          'Ask a targeted next question.',
          'Observe the explanation, not just the answer.',
          'Adapt the path until understanding improves.',
        ],
        notes: 'Make the mechanism simple enough for a funder or educator to repeat.',
        visualCue: 'Four-step loop: diagnose, question, explain, adapt.',
      },
      {
        title: 'Built For Daily Learning',
        kicker: 'Use Cases',
        layout: 'image',
        bullets: [
          scope,
          'Students practice reasoning in everyday study moments.',
          'Parents see progress without replacing teachers.',
          'Low-resource settings can still use guided support.',
        ],
        notes: 'Show breadth without overclaiming maturity.',
        visualCue: 'Bento grid showing student, parent, classroom, and offline contexts.',
        imageSearchQuery: 'community learning technology',
        imagePrompt:
          'A warm community learning environment with students using shared tablets and notebooks, educator nearby as facilitator, realistic low-resource classroom but dignified and optimistic, no text on devices, cinematic natural light, deep teal accents and amber warmth, wide 16:9 composition',
      },
      {
        title: 'Measure Reasoning',
        kicker: 'Proof',
        layout: 'comparison',
        bullets: [
          'Old metric: final-answer correctness.',
          'Better metric: explanation quality.',
          'Old behavior: instant chatbot dependency.',
          'Better behavior: independent problem attempts.',
        ],
        notes: 'Shift evaluation from answer output to reasoning process.',
        visualCue: 'Two-up comparison: answer culture versus reasoning culture.',
      },
      {
        title: 'Pilot Economics',
        kicker: 'Feasibility',
        layout: 'split',
        bullets: [
          cost,
          'Build only the core question engine first.',
          'Test with a small learner cohort.',
          'Iterate from explanation data and teacher feedback.',
        ],
        notes: 'Use the cost range as a practical proof-of-concept frame.',
        visualCue: 'Budget cards for build, pilot, testing, iteration.',
        imageSearchQuery: 'education startup pilot planning',
        imagePrompt:
          'A small interdisciplinary education technology team planning a pilot around a table with sticky notes, laptop, and notebooks, no readable text, practical optimistic startup energy, deep teal and warm amber palette, clean editorial composition with space for cost cards',
      },
      {
        title: 'Why It Matters',
        kicker: 'Impact',
        layout: 'image',
        bullets: [
          'Supports SDG 4: Quality Education.',
          'Builds deeper learning habits, not answer consumption.',
          'Strengthens judgment in an AI-saturated world.',
        ],
        notes: 'Connect the product to learning quality and long-term agency.',
        visualCue: 'Editorial image with concise SDG4 impact caption.',
        imageSearchQuery: 'quality education reasoning skills',
        imagePrompt:
          'A hopeful editorial image of diverse learners collaboratively solving a challenging problem on paper, with a subtle abstract question-mark light pattern, no text, no logos, respectful classroom context, deep teal paper-white and amber palette, strong negative space',
      },
      {
        title: 'The First Six Months',
        kicker: 'Roadmap',
        layout: 'roadmap',
        bullets: [
          'Prototype adaptive dialogue engine.',
          'Recruit educator and learner pilot partners.',
          'Run guided learning sessions.',
          'Measure reasoning growth and retention.',
        ],
        notes: 'Turn the idea into an executable pilot path.',
        visualCue: 'Six-month milestone ladder with clear gates.',
      },
      {
        title: 'What We Need',
        kicker: 'Ask',
        layout: 'closing',
        bullets: [
          'Pilot partners with real learner cohorts.',
          'Funding for MVP build and testing.',
          'Educators to validate question quality.',
        ],
        notes: 'Close with a concrete request rather than a general aspiration.',
        visualCue: 'Clear ask slide with three commitment cards.',
      },
    ],
  };
}

function buildSlideImagePrompt(slide: GeneratedDeckSlide, title: string): string {
  const slideTitle = cleanPresentationText(slide.title || title || 'learning transformation', 90);
  const slidePoint = cleanPresentationText((slide.bullets || [])[0] || slide.visualCue || slide.notes || '', 180);
  return [
    `A single coherent editorial photograph representing "${slideTitle}" for an education and AI presentation`,
    slidePoint ? `Core idea: ${slidePoint}` : '',
    'Show authentic human learning, reflection, collaboration, or mentorship through environment and body language',
    'No computer screens, phone screens, signs, posters, papers with writing, books with readable marks, magnifying glasses, speech bubbles, icons, letters, numbers, or symbolic labels',
    'Deep teal and warm amber palette, dignified optimistic mood, clean 16:9 composition with negative space',
  ].filter(Boolean).join('. ');
}

function ensureImagePromptsForVisibleImageSlides(plan: GeneratedDeckPlan): void {
  const imageLayouts = new Set(['hero', 'image', 'split']);
  (plan.slides || []).forEach((slide) => {
    if (!imageLayouts.has(String(slide.layout || ''))) return;
    if (!cleanPresentationText(slide.imagePrompt, 120)) {
      slide.imagePrompt = buildSlideImagePrompt(slide, plan.title || 'Presentation');
    }
  });
}

function getInlineImageBase64(response: any): string {
  const candidates = response?.candidates || response?.response?.candidates || [];
  for (const candidate of candidates) {
    for (const part of candidate?.content?.parts || []) {
      const data = part?.inlineData?.data || part?.inline_data?.data;
      if (data) return String(data);
    }
  }
  for (const part of response?.parts || response?.response?.parts || []) {
    const data = part?.inlineData?.data || part?.inline_data?.data;
    if (data) return String(data);
  }
  return '';
}

async function uploadPresentationGeneratedImage(
  uid: string,
  solutionId: string,
  requestId: string,
  index: number,
  imageBase64: string
): Promise<string> {
  const storagePath = `ai-presentations/${uid}/${solutionId}/${requestId}/generated-${index}.png`;
  const file = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await file.save(Buffer.from(imageBase64, 'base64'), {
    metadata: {
      contentType: 'image/png',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        solutionId,
        createdBy: uid,
        generatedFor: 'presentation',
      },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    storagePath
  )}?alt=media&token=${downloadToken}`;
}

function normalizeGeneratedDeckPlan(value: unknown, fallbackTitle: string): GeneratedDeckPlan | null {
  const parsed: any = value;
  const candidate =
    Array.isArray(parsed)
      ? { title: fallbackTitle, slides: parsed }
      : parsed?.slides
        ? parsed
        : parsed?.deck?.slides
          ? parsed.deck
          : parsed?.presentation?.slides
            ? parsed.presentation
            : parsed?.deckPlan?.slides
              ? parsed.deckPlan
              : parsed?.plan?.slides
                ? parsed.plan
                : null;

  if (candidate && Array.isArray(candidate.slides) && candidate.slides.length > 0) {
    return candidate as GeneratedDeckPlan;
  }
  return null;
}

function extractDeckPlanJson(
  value: string,
  fallbackTitle: string
): GeneratedDeckPlan | null {
  const cleaned = value
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  const candidates = [
    cleaned,
    cleaned.includes('{') && cleaned.includes('}')
      ? cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)
      : '',
    cleaned.includes('[') && cleaned.includes(']')
      ? cleaned.slice(cleaned.indexOf('['), cleaned.lastIndexOf(']') + 1)
      : '',
  ].filter((candidate) => {
    const trimmed = candidate.trim();
    return trimmed.startsWith('{') || trimmed.startsWith('[');
  });

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const plan = normalizeGeneratedDeckPlan(parsed, fallbackTitle);
      if (plan) {
        return plan;
      }
    } catch (error) {
      console.warn('Failed to parse deck JSON candidate:', (error as Error).message);
    }
  }

  return null;
}

async function collectPresentationSourceText(solution: any): Promise<{
  sourceText: string;
  imageUrls: string[];
}> {
  const sections: string[] = [];
  const imageUrls: string[] = [];

  sections.push(`Title: ${cleanPresentationText(solution?.title, 300)}`);
  sections.push(`Description: ${cleanPresentationText(solution?.description, 2000)}`);
  sections.push(`Solution Area: ${cleanPresentationText(solution?.solutionArea, 300)}`);
  if (Array.isArray(solution?.sdgs) && solution.sdgs.length) {
    sections.push(`Relevant SDGs: ${solution.sdgs.map((sdg: unknown) => cleanPresentationText(sdg, 160)).join(', ')}`);
  }
  sections.push(`Strategy Review: ${cleanPresentationText(solution?.strategyReview, 5000)}`);
  sections.push(`Solution Content: ${cleanPresentationText(solution?.content, 4000)}`);

  imageUrls.push(...extractImageUrlsFromHtml(solution?.content));
  imageUrls.push(...extractImageUrlsFromHtml(solution?.strategyReview));

  if (solution?.recruitmentProfile && typeof solution.recruitmentProfile === 'object') {
    const recruitmentLines = [
      ['Initiative', solution.recruitmentProfile.initiativeName],
      ['Focus Area', solution.recruitmentProfile.focusArea],
      ['Challenge Description', solution.recruitmentProfile.challengeDescription],
      ['Scope of Work', solution.recruitmentProfile.scopeOfWork],
      ['Final Product', solution.recruitmentProfile.finalProduct],
      ['Skills Needed', solution.recruitmentProfile.skills],
      ['Perspectives Needed', solution.recruitmentProfile.perspectives],
      ['Knowledge Needed', solution.recruitmentProfile.knowledge],
      ['Interests', solution.recruitmentProfile.interests],
      ['Time Commitment', solution.recruitmentProfile.timeCommitment],
      ['Team Size', [solution.recruitmentProfile.teamSizeMin, solution.recruitmentProfile.teamSizeMax].filter(Boolean).join(' to ')],
      ['Start Date', solution.recruitmentProfile.startDate],
      ['Additional Notes', solution.recruitmentProfile.additionalNotes],
    ]
      .map(([label, value]) => `${label}: ${cleanPresentationText(value, 2000)}`)
      .filter((line) => !line.endsWith(':'));
    if (recruitmentLines.length) {
      sections.push(`Recruitment and Implementation Profile:\n${recruitmentLines.join('\n')}`);
    }
  }

  if (solution?.status && typeof solution.status === 'object') {
    const statusLines = Object.entries(solution.status)
      .filter(([, value]) => cleanPresentationText(value, 120).length > 0)
      .slice(0, 40)
      .map(([key, value]) => `${key}: ${cleanPresentationText(value, 700)}`)
      .join('\n');
    if (statusLines) {
      sections.push(`Step Answers and Strategy Notes:\n${statusLines}`);
    }
    for (const value of Object.values(solution.status)) {
      imageUrls.push(...extractImageUrlsFromHtml(value));
    }
  }

  const dottedStatusLines = Object.entries(solution)
    .filter(([key, value]) => key.startsWith('status.') && cleanPresentationText(value, 120).length > 0)
    .slice(0, 40)
    .map(([key, value]) => `${key}: ${cleanPresentationText(value, 900)}`);
  if (dottedStatusLines.length) {
    sections.push(`Legacy Step Answers:\n${dottedStatusLines.join('\n')}`);
  }
  for (const [key, value] of Object.entries(solution)) {
    if (key.startsWith('status.')) {
      imageUrls.push(...extractImageUrlsFromHtml(value));
    }
  }

  if (Array.isArray(solution?.evaluationDetails) && solution.evaluationDetails.length) {
    const evaluations = solution.evaluationDetails
      .slice(0, 6)
      .map((item: any, index: number) => {
        const scores = [
          item?.average ? `average ${item.average}` : '',
          item?.achievable ? `achievable ${item.achievable}` : '',
          item?.feasible ? `feasible ${item.feasible}` : '',
          item?.equitable ? `equitable ${item.equitable}` : '',
          item?.understandable ? `understandable ${item.understandable}` : '',
        ].filter(Boolean).join(', ');
        return `Evaluation ${index + 1}: ${scores}. ${cleanPresentationText(item?.comment, 1200)}`;
      });
    sections.push(`Evaluation Feedback:\n${evaluations.join('\n')}`);
  }

  const solutionImage = String(solution?.image || '').trim();
  if (/^https?:\/\//i.test(solutionImage)) {
    imageUrls.push(solutionImage);
  }

  const documents = Array.isArray(solution?.documents)
    ? (solution.documents as PresentationDocInput[])
    : [];

  const extractableDocs = documents
    .filter((doc) => {
      const mime = String(doc?.type || '').toLowerCase();
      return (
        mime === 'application/pdf' ||
        mime === 'application/msword' ||
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mime === 'text/plain' ||
        mime === 'text/csv'
      );
    })
    .slice(0, 4);

  for (const doc of documents) {
    const url = String(doc?.downloadURL || '').trim();
    const mime = String(doc?.type || '').toLowerCase();
    if (url && mime.startsWith('image/')) {
      imageUrls.push(url);
    }
  }

  for (const doc of extractableDocs) {
    const url = String(doc?.downloadURL || '').trim();
    const mime = String(doc?.type || '').trim();
    if (!url || !mime) continue;
    try {
      const extracted = await fetchAndExtract(url, mime);
      sections.push(
        `Document: ${cleanPresentationText(doc.name || doc.originalFilename, 180)}\n${cleanPresentationText(
          extracted,
          6000
        )}`
      );
    } catch (error) {
      console.warn(
        'Could not extract presentation source document:',
        doc.name || doc.originalFilename,
        (error as Error).message
      );
    }
  }

  return {
    sourceText: sections.filter(Boolean).join('\n\n').slice(0, 52000),
    imageUrls: uniquePresentationStrings(imageUrls).slice(0, 12),
  };
}

function buildDeckPlanPrompt(sourceText: string, title: string): string {
  return `You are a senior presentation designer, narrative strategist, and elite Google Slides / PowerPoint art director. Produce investor- and conference-grade decks: editorial, image-forward, visually disciplined, and stronger than default AI slide templates.

Create a presentation plan from the source material. The plan will be rendered into editable Google Slides and an exported PowerPoint, so every slide must have a precise visual job, tight copy, and concrete image direction.

Core philosophy:
- One idea per slide. If a slide has two ideas, split it.
- The audience should understand the headline in 3 seconds and the slide in 10 seconds.
- Show, do not list. Replace bullet walls with a stat hero, comparison, diagram, flow, bento grid, or one strong image with a caption.
- Every deck must follow a story arc: Tension -> Insight -> Solution -> Proof -> Ask.
- White space is a feature.

Design system:
- Use a consistent premium system across the deck: deep teal primary, warm amber accent used sparingly, near-black ink, paper-white background, restrained slate structure.
- Use confident headline hierarchy, short body copy, and generous margins.
- Preserve the user's language, locale, names, dates, and currencies from the source. Do not translate unless the source asks for it.
- Turn metrics into scorecards, progress bars, rankings, milestone ladders, and decision tables whenever the source supports it.
- Avoid primitive bullet slides. Every slide must orient, prove, compare, prioritize, sequence, quantify, de-risk, or ask.

Image direction:
- This deck must generate new images where useful. Existing source images are allowed, but do not rely on them as the only visuals.
- Include imagePrompt on 7 to 9 slides in a 10-12 slide deck, especially cover/hook, stakes, local context, solution, how-it-works, proof, impact, and close.
- Leave imagePrompt empty only on dense KPI, table, or pure diagram slides where generated photography would distract.
- For every imagePrompt, describe a clean 16:9 image with subject, local setting, lighting, mood, composition, and palette.
- Images must be purposeful, not decorative. Prefer authentic, dignified, human-scale local problem-solving over generic business stock.
- Never include embedded text, logos, UI screenshots, watermarks, identifiable real people's faces, stereotypes, or poverty-porn imagery.
- Generated visuals should have negative space for editable slide text and a consistent treatment across the deck.

Return ONLY valid JSON. No markdown fences. No commentary.

JSON shape:
{
  "title": "short deck title",
  "subtitle": "one-line promise or context",
  "audience": "primary audience",
  "narrative": "one sentence through-line",
  "slides": [
    {
      "title": "slide title under 9 words",
      "kicker": "short label, optional",
      "layout": "hero|signal|dashboard|comparison|roadmap|image|split|quote|steps|closing",
      "bullets": ["3 to 5 tight bullets, each under 13 words"],
      "notes": "speaker notes in 1-3 sentences",
      "visualCue": "short visual direction for shapes, diagrams, scorecards, charts, or image use",
      "imageSearchQuery": "optional 4-7 word search phrase for a stock/reference image",
      "imagePrompt": "16:9 generated image prompt where useful, no text in image"
    }
  ]
}

Rules:
- Create 10 to 12 slides.
- Use these layout values where appropriate: hero, signal, dashboard, comparison, roadmap, image, split, quote, steps, closing.
- Use this arc unless the source clearly demands another: hook, stakes, insight, solution, how it works, operating model, proof, impact, feasibility / measurement, risks, ask, close.
- Make the deck beautiful but practical: cinematic title, agenda, evidence, solution, operating model, implementation path, measurable impact, risks, and ask.
- Use concrete content from the source.
- Avoid hype, vague slogans, generic sustainability language, and long paragraphs.
- Every bullet must be crisp, concrete, and decision-oriented.
- Speaker notes should tell the presenter what to emphasize, not repeat bullets.
- Include imagePrompt on most narrative slides. A deck with zero generated image prompts is invalid.
- Do not include citations unless the source material explicitly contains them.
- If the topic is SDG or local-problem oriented, name relevant SDG goals or sub-targets only when supported by the source. Do not slap on SDGs generically.

Deck title fallback: ${title}

SOURCE MATERIAL:
${sourceText}`;
}

async function generatePresentationDeckPlan(
  sourceText: string,
  fallbackTitle: string
): Promise<GeneratedDeckPlan> {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  let plan: GeneratedDeckPlan | null = null;
  let lastError: unknown;
  const responseSchema = {
    type: 'object',
    properties: {
      title: { type: 'string' },
      subtitle: { type: 'string' },
      audience: { type: 'string' },
      narrative: { type: 'string' },
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            kicker: { type: 'string' },
            layout: { type: 'string' },
            bullets: { type: 'array', items: { type: 'string' } },
            notes: { type: 'string' },
            visualCue: { type: 'string' },
            imageSearchQuery: { type: 'string' },
            imagePrompt: { type: 'string' },
          },
          required: ['title', 'layout', 'bullets', 'notes', 'visualCue'],
        },
      },
    },
    required: ['title', 'subtitle', 'narrative', 'slides'],
  };

  for (const modelName of PRESENTATION_TEXT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 4500,
          responseMimeType: 'application/json',
          responseSchema,
        },
      } as any);

      const result = await model.generateContent(buildDeckPlanPrompt(sourceText, fallbackTitle));
      const text = result.response.text();
      plan = extractDeckPlanJson(text, fallbackTitle);
      if (plan) {
        console.log(`Presentation deck plan generated with ${modelName}`);
        break;
      }
      lastError = new Error(`Presentation deck plan model ${modelName} returned invalid JSON.`);
      console.warn(`Presentation deck plan model ${modelName} returned invalid JSON.`);
    } catch (error) {
      lastError = error;
      console.warn(
        `Presentation deck plan model ${modelName} failed:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (!plan) {
    console.warn(
      'Using content-aware fallback deck plan after all presentation planning models failed.',
      lastError instanceof Error ? lastError.message : String(lastError || '')
    );
    plan = buildContentAwareFallbackDeckPlan(sourceText, fallbackTitle);
  }

  plan.title = cleanPresentationText(plan.title || fallbackTitle, 90);
  plan.subtitle = cleanPresentationText(plan.subtitle || 'Presentation draft', 160);
  plan.narrative = cleanPresentationText(plan.narrative || '', 240);
  plan.slides = (plan.slides || [])
    .slice(0, 12)
    .map((slide) => {
      const imagePrompt = cleanPresentationText(slide.imagePrompt || '', 500);
      const requestedLayout = slide.layout || 'signal';
      const layout =
        imagePrompt && requestedLayout === 'signal'
          ? 'split'
          : requestedLayout;
      return {
        title: cleanPresentationText(slide.title || 'Key point', 90),
        kicker: cleanPresentationText(slide.kicker || '', 40),
        layout,
        bullets: Array.isArray(slide.bullets)
          ? slide.bullets.map((bullet) => cleanPresentationText(bullet, 120)).filter(Boolean).slice(0, 5)
          : [],
        notes: cleanPresentationText(slide.notes || '', 500),
        visualCue: cleanPresentationText(slide.visualCue || '', 140),
        imageSearchQuery: cleanPresentationText(slide.imageSearchQuery || '', 120),
        imagePrompt,
        imageUrl: cleanPresentationText(slide.imageUrl || '', 800),
      };
    })
    .filter((slide) => slide.title || slide.bullets.length);
  ensureImagePromptsForVisibleImageSlides(plan);

  if (!plan.slides.length) {
    const fallbackPlan = buildContentAwareFallbackDeckPlan(sourceText, fallbackTitle);
    ensureImagePromptsForVisibleImageSlides(fallbackPlan);
    return fallbackPlan;
  }
  if (plan.slides.length < 8) {
    console.warn(`Generated deck plan had only ${plan.slides.length} slides; using content-aware fallback.`);
    const fallbackPlan = buildContentAwareFallbackDeckPlan(sourceText, fallbackTitle);
    ensureImagePromptsForVisibleImageSlides(fallbackPlan);
    return fallbackPlan;
  }
  return plan;
}

async function savePresentationPptx(
  uid: string,
  solutionId: string,
  requestId: string,
  title: string,
  buffer: Buffer
): Promise<{ downloadUrl: string; storagePath: string; fileName: string }> {
  const fileName = `${slugPresentationFileName(title)}-ai-presentation.pptx`;
  const storagePath = `ai-presentations/${uid}/${solutionId}/${requestId}.pptx`;
  const file = bucket.file(storagePath);
  const downloadToken = randomUUID();

  await file.save(buffer, {
    metadata: {
      contentType: PRESENTATION_PPTX_MIME,
      contentDisposition: `attachment; filename="${fileName}"`,
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
        solutionId,
        createdBy: uid,
      },
    },
  });

  return {
    fileName,
    storagePath,
    downloadUrl: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      storagePath
    )}?alt=media&token=${downloadToken}`,
  };
}

async function generatePresentationVisuals(
  plan: GeneratedDeckPlan,
  uid: string,
  solutionId: string,
  requestId: string
): Promise<string[]> {
  const promptEntries = (plan.slides || [])
    .map((slide, slideIndex) => ({
      slide,
      slideIndex,
      prompt: cleanPresentationText(slide.imagePrompt, 620),
    }))
    .filter((entry) => entry.prompt)
    .slice(0, PRESENTATION_MAX_GENERATED_IMAGES);

  if (!promptEntries.length) return [];

  const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
  const generatedUrls: string[] = [];
  const usedPrompts = new Set<string>();

  for (const [imageIndex, entry] of promptEntries.entries()) {
    const normalizedPrompt = entry.prompt.toLowerCase();
    if (usedPrompts.has(normalizedPrompt)) continue;
    usedPrompts.add(normalizedPrompt);

    const fullPrompt = [
      entry.prompt,
      PRESENTATION_VISUAL_STYLE,
      'Create one coherent photographic or cinematic editorial scene, not a split-screen, not a diagram, not an infographic, not a UI mockup.',
      'Shot for a premium editable presentation slide; leave clean negative space for headline and cards.',
      'No typography, captions, numbers, letters, pseudo-letters, symbols, signs, posters, papers with writing, screen interfaces, icons containing text, charts, logos, or watermark inside the image.',
    ].join('. ');
    let imageBase64 = '';

    for (const modelName of PRESENTATION_IMAGEN_MODELS) {
      try {
        const imageResult = await ai.models.generateImages({
          model: modelName,
          prompt: fullPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: '16:9',
            includeRaiReason: true,
          },
        } as any);
        imageBase64 = imageResult.generatedImages?.[0]?.image?.imageBytes || '';
        if (imageBase64) {
          console.log(`Presentation image generated with ${modelName}`);
          break;
        }
      } catch (error: any) {
        console.warn(
          `Presentation Imagen model ${modelName} failed:`,
          String(error?.message || error).slice(0, 180)
        );
      }
    }

    for (const modelName of PRESENTATION_IMAGE_MODELS) {
      if (imageBase64) break;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
          config: {
            responseModalities: ['Image'],
            responseFormat: {
              image: {
                aspectRatio: '16:9',
                imageSize: modelName.includes('3-pro') ? '2K' : '1K',
              },
            },
          },
        } as any);

        imageBase64 = getInlineImageBase64(response);
        if (imageBase64) {
          console.log(`Presentation image generated with ${modelName}`);
          break;
        }
      } catch (error: any) {
        console.warn(
          `Presentation image model ${modelName} failed:`,
          String(error?.message || error).slice(0, 180)
        );
      }
    }

    if (!imageBase64) continue;

    try {
      const url = await uploadPresentationGeneratedImage(
        uid,
        solutionId,
        requestId,
        imageIndex,
        imageBase64
      );
      entry.slide.imageUrl = url;
      generatedUrls.push(url);
    } catch (error: any) {
      console.warn('Could not upload generated presentation image:', error?.message || error);
    }
  }

  return generatedUrls;
}

function buildPresentationViewerSlides(
  plan: GeneratedDeckPlan,
  imageUrls: string[],
  sourceTitle: string
): PresentationViewerSlide[] {
  const plannedSlides = (plan.slides || []).slice(0, 12);
  const imageFor = (index: number): string | undefined =>
    imageUrls.length ? imageUrls[index % imageUrls.length] : undefined;

  const slides: PresentationViewerSlide[] = [
    {
      title: cleanPresentationText(plan.title || sourceTitle || 'Presentation', 120),
      subtitle: cleanPresentationText(plan.subtitle || 'Presentation draft', 180),
      kicker: 'AI-GENERATED PRESENTATION',
      layout: 'cover',
      imageUrl: imageFor(0),
      bullets: [
        cleanPresentationText(plan.narrative || plan.subtitle || 'A focused presentation built from the solution content.', 220),
      ].filter(Boolean),
    },
    {
      title: 'Discussion Flow',
      subtitle: cleanPresentationText(plan.narrative || '', 180),
      kicker: 'Agenda',
      layout: 'agenda',
      imageUrl: imageFor(1),
      bullets: plannedSlides.slice(0, 6).map((slide, index) =>
        `${String(index + 1).padStart(2, '0')} ${cleanPresentationText(slide.title || 'Topic', 90)}`
      ),
    },
  ];

  plannedSlides.forEach((slide, index) => {
    slides.push({
      title: cleanPresentationText(slide.title || 'Key point', 100),
      subtitle: cleanPresentationText(slide.notes || slide.visualCue || '', 220),
      kicker: cleanPresentationText(slide.kicker || '', 44),
      layout: slide.layout || 'signal',
      imageUrl: slide.imageUrl || imageFor(index + 2),
      bullets: (slide.bullets || [])
        .map((bullet) => cleanPresentationText(bullet, 140))
        .filter(Boolean)
        .slice(0, 5),
      visualCue: cleanPresentationText(slide.visualCue || '', 180),
    });
  });

  slides.push({
    title: 'Next move',
    subtitle: 'Turn the presentation into decisions, commitments, and measurable work.',
    kicker: 'Close',
    layout: 'closing',
    imageUrl: imageFor(plannedSlides.length + 2),
    bullets: [
      'Choose the first validation audience',
      'Confirm the smallest credible pilot',
      'Assign owners and timing',
    ],
  });

  return slides;
}

type GoogleSlidesOutput = {
  presentationId: string;
  googleSlidesUrl: string;
  googleSlidesPresentUrl: string;
  googleSlidesEditUrl: string;
  pptxBuffer: Buffer;
};

type SlidesBatchRequest = Record<string, any>;

const GOOGLE_SLIDE = {
  width: 720,
  height: 405,
};

function rgbColor(hex: string): any {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean
        .split('')
        .map((part) => part + part)
        .join('')
    : clean;
  const int = parseInt(value, 16);
  return {
    red: ((int >> 16) & 255) / 255,
    green: ((int >> 8) & 255) / 255,
    blue: (int & 255) / 255,
  };
}

function pt(value: number): any {
  return { magnitude: value, unit: 'PT' };
}

function elementProperties(pageObjectId: string, x: number, y: number, w: number, h: number): any {
  return {
    pageObjectId,
    size: { width: pt(w), height: pt(h) },
    transform: {
      scaleX: 1,
      scaleY: 1,
      translateX: x,
      translateY: y,
      unit: 'PT',
    },
  };
}

function createRect(
  pageObjectId: string,
  objectId: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = fill,
  shapeType = 'RECTANGLE'
): SlidesBatchRequest[] {
  return [
    {
      createShape: {
        objectId,
        shapeType,
        elementProperties: elementProperties(pageObjectId, x, y, w, h),
      },
    },
    {
      updateShapeProperties: {
        objectId,
        shapeProperties: {
          shapeBackgroundFill: {
            solidFill: { color: { rgbColor: rgbColor(fill) } },
          },
          outline: {
            outlineFill: {
              solidFill: { color: { rgbColor: rgbColor(outline) } },
            },
            weight: pt(1),
          },
        },
        fields: 'shapeBackgroundFill.solidFill.color,outline.outlineFill.solidFill.color,outline.weight',
      },
    },
  ];
}

function createTextBox(
  pageObjectId: string,
  objectId: string,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options: {
    color?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    fontFamily?: string;
    align?: 'START' | 'CENTER' | 'END';
  } = {}
): SlidesBatchRequest[] {
  const safeText = cleanPresentationText(text, 1200);
  if (!safeText) return [];

  const requests: SlidesBatchRequest[] = [
    {
      createShape: {
        objectId,
        shapeType: 'TEXT_BOX',
        elementProperties: elementProperties(pageObjectId, x, y, w, h),
      },
    },
    {
      insertText: {
        objectId,
        insertionIndex: 0,
        text: safeText,
      },
    },
    {
      updateTextStyle: {
        objectId,
        textRange: { type: 'ALL' },
        style: {
          foregroundColor: {
            opaqueColor: { rgbColor: rgbColor(options.color || '0F172A') },
          },
          fontSize: pt(options.fontSize || 14),
          bold: !!options.bold,
          italic: !!options.italic,
          fontFamily: options.fontFamily || 'Arial',
        },
        fields: 'foregroundColor,fontSize,bold,italic,fontFamily',
      },
    },
  ];

  if (options.align) {
    requests.push({
      updateParagraphStyle: {
        objectId,
        textRange: { type: 'ALL' },
        style: { alignment: options.align },
        fields: 'alignment',
      },
    });
  }

  return requests;
}

function createBulletTextBox(
  pageObjectId: string,
  objectId: string,
  bullets: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  color = '1E293B'
): SlidesBatchRequest[] {
  const text = bullets
    .map((bullet) => cleanPresentationText(bullet, 160))
    .filter(Boolean)
    .slice(0, 5)
    .map((bullet) => `• ${bullet}`)
    .join('\n');
  return createTextBox(pageObjectId, objectId, text, x, y, w, h, {
    color,
    fontSize: 15,
    fontFamily: 'Arial',
  });
}

function setPageBackground(pageObjectId: string, color: string): SlidesBatchRequest {
  return {
    updatePageProperties: {
      objectId: pageObjectId,
      pageProperties: {
        pageBackgroundFill: {
          solidFill: { color: { rgbColor: rgbColor(color) } },
        },
      },
      fields: 'pageBackgroundFill.solidFill.color',
    },
  };
}

function addFooter(pageObjectId: string, prefix: string, slideNumber: number, totalSlides: number): SlidesBatchRequest[] {
  return [
    ...createRect(pageObjectId, `${prefix}_footer_rule`, 32, 370, 656, 1, 'CBD5E1'),
    ...createTextBox(pageObjectId, `${prefix}_footer_brand`, 'NewWorld Game', 34, 378, 170, 12, {
      color: '64748B',
      fontSize: 7,
      bold: true,
    }),
    ...createTextBox(pageObjectId, `${prefix}_footer_num`, `${slideNumber}/${totalSlides}`, 640, 378, 48, 12, {
      color: '64748B',
      fontSize: 7,
      align: 'END',
    }),
  ];
}

function addImageIfAvailable(
  pageObjectId: string,
  objectId: string,
  imageUrl: string | undefined,
  x: number,
  y: number,
  w: number,
  h: number
): SlidesBatchRequest[] {
  const requests = createRect(pageObjectId, `${objectId}_panel`, x, y, w, h, 'E0F2FE', 'BFDBFE', 'ROUND_RECTANGLE');
  if (!imageUrl) {
    requests.push(
      ...createTextBox(pageObjectId, `${objectId}_placeholder`, 'Solution visual', x + 22, y + h / 2 - 12, w - 44, 24, {
        color: '0F766E',
        fontSize: 16,
        bold: true,
        align: 'CENTER',
      })
    );
    return requests;
  }

  requests.push({
    createImage: {
      objectId,
      url: imageUrl,
      elementProperties: elementProperties(pageObjectId, x + 6, y + 6, w - 12, h - 12),
    },
  });
  return requests;
}

async function buildPresentationImageUrlPool(imageUrls: string[]): Promise<string[]> {
  const validUrls: string[] = [];
  const candidateUrls = uniquePresentationStrings([
    ...imageUrls,
    PRESENTATION_FALLBACK_IMAGE,
  ]).slice(0, PRESENTATION_MAX_GENERATED_IMAGES + 4);
  for (const url of candidateUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const contentType = response.headers.get('content-type') || '';
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (!contentType.toLowerCase().startsWith('image/')) continue;
      if (contentLength > 50 * 1024 * 1024) continue;
      validUrls.push(url);
    } catch (error) {
      console.warn('Could not validate presentation image URL:', (error as Error).message);
    }
  }
  return uniquePresentationStrings(validUrls).slice(0, PRESENTATION_MAX_GENERATED_IMAGES + 2);
}

async function buildPowerPointImageAssets(imageUrls: string[]): Promise<{
  dataByUrl: Map<string, string>;
  dataUris: string[];
}> {
  const validUrls = await buildPresentationImageUrlPool(imageUrls);
  const dataByUrl = new Map<string, string>();
  const dataUris: string[] = [];

  for (const url of validUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(contentType)) continue;
      const buffer = Buffer.from(await response.arrayBuffer());
      const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
      dataByUrl.set(url, dataUri);
      dataUris.push(dataUri);
    } catch (error) {
      console.warn('Could not prepare presentation image for PPTX:', (error as Error).message);
    }
  }

  return {
    dataByUrl,
    dataUris: dataUris.slice(0, PRESENTATION_MAX_GENERATED_IMAGES + 2),
  };
}

function pptxText(value: unknown, max = 500): string {
  return cleanPresentationText(value, max).replace(/[^\S\r\n]+/g, ' ');
}

function pptxShadow(color = '0F766E', opacity = 0.18): any {
  return {
    type: 'outer',
    color,
    opacity,
    blur: 2,
    angle: 45,
    distance: 1,
  };
}

function addPptxGlow(slide: any, x: number, y: number, w: number, h: number, color = '14B8A6'): void {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.12,
    fill: { color, transparency: 78 },
    line: { color, transparency: 100 },
  });
}

function addPptxFooter(slide: any, slideNumber: number, totalSlides: number): void {
  slide.addShape('line', {
    x: 0.62,
    y: 6.86,
    w: 12.1,
    h: 0,
    line: { color: 'CBD5E1', width: 1 },
  });
  slide.addText('NewWorld Game', {
    x: 0.62,
    y: 7.02,
    w: 2.2,
    h: 0.16,
    fontFace: 'Aptos',
    fontSize: 6.5,
    color: '64748B',
    bold: true,
    margin: 0,
  });
  slide.addText(`${slideNumber}/${totalSlides}`, {
    x: 11.65,
    y: 7.02,
    w: 1.1,
    h: 0.16,
    fontFace: 'Aptos',
    fontSize: 6.5,
    color: '64748B',
    align: 'right',
    margin: 0,
  });
}

function addPptxImageOrPanel(
  slide: any,
  imageData: string | undefined,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  slide.addShape('roundRect', {
    x,
    y,
    w,
    h,
    rectRadius: 0.08,
    fill: { color: 'E0F2FE' },
    line: { color: 'BFDBFE', width: 1 },
    shadow: pptxShadow('2563EB', 0.16),
  });
  if (imageData) {
    slide.addImage({ data: imageData, x: x + 0.08, y: y + 0.08, w: w - 0.16, h: h - 0.16 });
    return;
  }
  slide.addText('Solution visual', {
    x: x + 0.25,
    y: y + h / 2 - 0.18,
    w: w - 0.5,
    h: 0.3,
    fontFace: 'Aptos Display',
    fontSize: 15,
    color: '0F766E',
    bold: true,
    align: 'center',
    margin: 0,
  });
}

function addPptxAccent(slide: any, color: string): void {
  slide.background = { color: 'FFFFFF' };
  slide.addShape('rect', {
    x: 0,
    y: 0,
    w: 0.16,
    h: 7.5,
    fill: { color },
    line: { color },
  });
}

function addPptxBullets(
  slide: any,
  bullets: string[],
  x: number,
  y: number,
  w: number,
  h: number,
  color = '1E293B'
): void {
  const text = bullets
    .map((bullet) => pptxText(bullet, 120))
    .filter(Boolean)
    .slice(0, 5)
    .map((bullet) => `• ${bullet}`)
    .join('\n');
  slide.addText(text || '• Key point', {
    x,
    y,
    w,
    h,
    fontFace: 'Aptos',
    fontSize: 14,
    color,
    breakLine: false,
    fit: 'shrink',
    margin: 0.05,
    valign: 'mid',
  });
}

async function createPowerPointDeck(
  plan: GeneratedDeckPlan,
  imageUrls: string[],
  sourceTitle: string
): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'NewWorld Game';
  pptx.company = 'NewWorld Game';
  pptx.subject = pptxText(plan.subtitle || 'AI-generated presentation', 180);
  pptx.title = pptxText(plan.title || sourceTitle || 'AI Presentation', 120);
  pptx.lang = 'en-US';
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
    lang: 'en-US',
  };

  const slides = (plan.slides || []).slice(0, 12);
  const totalSlides = slides.length + 3;
  const imageAssets = await buildPowerPointImageAssets(imageUrls);
  const images = imageAssets.dataUris;
  const imageForDeckSlide = (deckSlide: GeneratedDeckSlide, index: number): string | undefined =>
    (deckSlide.imageUrl ? imageAssets.dataByUrl.get(deckSlide.imageUrl) : undefined) ||
    (images.length ? images[index % images.length] : undefined);
  let slideNumber = 1;

  const cover = pptx.addSlide();
  cover.background = { color: 'F8FAFC' };
  cover.addShape('rect', { x: 0, y: 0, w: 0.16, h: 7.5, fill: { color: '0F766E' }, line: { color: '0F766E' } });
  addPptxGlow(cover, 7.75, 0.52, 4.7, 5.5, '22D3EE');
  addPptxImageOrPanel(cover, images[0], 8.0, 0.78, 4.22, 5.0);
  cover.addText('AI-GENERATED PRESENTATION', {
    x: 0.78,
    y: 0.92,
    w: 4.6,
    h: 0.22,
    fontFace: 'Aptos',
    fontSize: 8,
    color: '0F766E',
    bold: true,
    margin: 0,
  });
  cover.addText(pptxText(plan.title || sourceTitle, 120), {
    x: 0.78,
    y: 1.35,
    w: 6.3,
    h: 1.45,
    fontFace: 'Aptos Display',
    fontSize: 30,
    color: '0F172A',
    bold: true,
    fit: 'shrink',
    margin: 0,
  });
  cover.addText(pptxText(plan.subtitle || 'Presentation draft', 180), {
    x: 0.8,
    y: 3.05,
    w: 6.1,
    h: 0.64,
    fontFace: 'Aptos',
    fontSize: 14,
    color: '475569',
    fit: 'shrink',
    margin: 0,
  });
  if (plan.narrative) {
    cover.addShape('roundRect', {
      x: 0.78,
      y: 4.75,
      w: 6.3,
      h: 0.9,
      rectRadius: 0.08,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 1 },
      shadow: pptxShadow('0F172A', 0.12),
    });
    cover.addText(pptxText(plan.narrative, 240), {
      x: 1.04,
      y: 5.02,
      w: 5.78,
      h: 0.36,
      fontFace: 'Aptos',
      fontSize: 11,
      italic: true,
      color: '334155',
      fit: 'shrink',
      margin: 0,
    });
  }
  addPptxFooter(cover, slideNumber, totalSlides);
  slideNumber += 1;

  const agenda = pptx.addSlide();
  addPptxAccent(agenda, '2563EB');
  agenda.addText('Discussion Flow', {
    x: 0.78,
    y: 0.74,
    w: 5.0,
    h: 0.55,
    fontFace: 'Aptos Display',
    fontSize: 28,
    color: '0F172A',
    bold: true,
    margin: 0,
  });
  slides.slice(0, 6).forEach((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = 0.9 + col * 5.85;
    const y = 1.85 + row * 1.42;
    const isTeal = index % 2 === 0;
    agenda.addShape('roundRect', {
      x,
      y,
      w: 5.15,
      h: 0.92,
      rectRadius: 0.08,
      fill: { color: isTeal ? 'F0FDFA' : 'EFF6FF' },
      line: { color: isTeal ? '99F6E4' : 'BFDBFE', width: 1 },
      shadow: pptxShadow(isTeal ? '0F766E' : '2563EB', 0.1),
    });
    agenda.addText(String(index + 1).padStart(2, '0'), {
      x: x + 0.22,
      y: y + 0.26,
      w: 0.55,
      h: 0.22,
      fontFace: 'Aptos',
      fontSize: 11,
      color: isTeal ? '0F766E' : '2563EB',
      bold: true,
      margin: 0,
    });
    agenda.addText(pptxText(item.title || 'Topic', 80), {
      x: x + 1.0,
      y: y + 0.18,
      w: 3.72,
      h: 0.26,
      fontFace: 'Aptos',
      fontSize: 11,
      color: '0F172A',
      bold: true,
      fit: 'shrink',
      margin: 0,
    });
    agenda.addText(pptxText((item.bullets || [])[0] || item.visualCue || '', 110), {
      x: x + 1.0,
      y: y + 0.52,
      w: 3.72,
      h: 0.22,
      fontFace: 'Aptos',
      fontSize: 7.5,
      color: '64748B',
      fit: 'shrink',
      margin: 0,
    });
  });
  addPptxFooter(agenda, slideNumber, totalSlides);
  slideNumber += 1;

  slides.forEach((deckSlide, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: index % 2 === 0 ? 'FFFFFF' : 'F8FAFC' };
    addPptxAccent(slide, index % 2 === 0 ? '0F766E' : '2563EB');
    const layout = deckSlide.layout || 'signal';
    if (deckSlide.kicker) {
      slide.addText(pptxText(deckSlide.kicker, 40).toUpperCase(), {
        x: 0.78,
        y: 0.58,
        w: 3.9,
        h: 0.2,
        fontFace: 'Aptos',
        fontSize: 8,
        color: '0F766E',
        bold: true,
        margin: 0,
      });
    }
    slide.addText(pptxText(deckSlide.title || 'Key point', 90), {
      x: 0.78,
      y: deckSlide.kicker ? 0.9 : 0.68,
      w: 7.6,
      h: 0.72,
      fontFace: 'Aptos Display',
      fontSize: 24,
      color: '0F172A',
      bold: true,
      fit: 'shrink',
      margin: 0,
    });

    if (layout === 'hero') {
      addPptxGlow(slide, 0.72, 1.62, 11.45, 4.65, index % 2 === 0 ? '99F6E4' : '93C5FD');
      addPptxImageOrPanel(slide, imageForDeckSlide(deckSlide, index), 0.95, 1.82, 11.0, 4.18);
      slide.addShape('roundRect', {
        x: 1.28,
        y: 4.72,
        w: 6.4,
        h: 0.95,
        rectRadius: 0.08,
        fill: { color: '0F172A', transparency: 8 },
        line: { color: '0F172A', transparency: 100 },
      });
      slide.addText(pptxText((deckSlide.bullets || [])[0] || deckSlide.visualCue || 'Core idea', 150), {
        x: 1.6,
        y: 5.0,
        w: 5.78,
        h: 0.34,
        fontFace: 'Aptos Display',
        fontSize: 18,
        color: 'FFFFFF',
        bold: true,
        fit: 'shrink',
        margin: 0,
      });
    } else if (layout === 'dashboard') {
      const colors = ['0F766E', '2563EB', 'F59E0B', 'EF4444'];
      (deckSlide.bullets || []).slice(0, 4).forEach((bullet, bulletIndex) => {
        const col = bulletIndex % 2;
        const row = Math.floor(bulletIndex / 2);
        const x = 0.95 + col * 5.75;
        const y = 1.9 + row * 1.75;
        const color = colors[bulletIndex % colors.length];
        slide.addShape('roundRect', {
          x,
          y,
          w: 5.15,
          h: 1.28,
          rectRadius: 0.08,
          fill: { color: 'FFFFFF' },
          line: { color: 'E2E8F0', width: 1 },
          shadow: pptxShadow(color, 0.11),
        });
        slide.addShape('rect', { x, y, w: 0.1, h: 1.28, fill: { color }, line: { color } });
        slide.addText(String(bulletIndex + 1).padStart(2, '0'), {
          x: x + 0.28,
          y: y + 0.2,
          w: 0.58,
          h: 0.24,
          fontFace: 'Aptos',
          fontSize: 10,
          color,
          bold: true,
          margin: 0,
        });
        slide.addText(pptxText(bullet, 150), {
          x: x + 0.92,
          y: y + 0.22,
          w: 3.82,
          h: 0.52,
          fontFace: 'Aptos Display',
          fontSize: 15,
          color: '0F172A',
          bold: true,
          fit: 'shrink',
          margin: 0,
        });
        slide.addShape('line', {
          x: x + 0.92,
          y: y + 0.92,
          w: 3.7,
          h: 0,
          line: { color, width: 4, transparency: 18 },
        });
      });
    } else if (layout === 'comparison') {
      const leftBullets = (deckSlide.bullets || []).filter((_, i) => i % 2 === 0).slice(0, 3);
      const rightBullets = (deckSlide.bullets || []).filter((_, i) => i % 2 === 1).slice(0, 3);
      [
        { label: 'Current reality', x: 0.95, color: '475569', bullets: leftBullets },
        { label: 'Better path', x: 6.55, color: '0F766E', bullets: rightBullets.length ? rightBullets : leftBullets },
      ].forEach((panel) => {
        slide.addShape('roundRect', {
          x: panel.x,
          y: 1.9,
          w: 5.05,
          h: 3.75,
          rectRadius: 0.08,
          fill: { color: 'FFFFFF' },
          line: { color: panel.color, transparency: 35, width: 1.2 },
          shadow: pptxShadow(panel.color, 0.12),
        });
        slide.addText(panel.label, {
          x: panel.x + 0.35,
          y: 2.22,
          w: 3.8,
          h: 0.3,
          fontFace: 'Aptos',
          fontSize: 10,
          color: panel.color,
          bold: true,
          margin: 0,
        });
        addPptxBullets(slide, panel.bullets, panel.x + 0.35, 2.85, 4.3, 2.1);
      });
    } else if (layout === 'roadmap') {
      (deckSlide.bullets || []).slice(0, 4).forEach((bullet, bulletIndex) => {
        const x = 0.95 + bulletIndex * 2.9;
        const color = bulletIndex % 2 === 0 ? '0F766E' : '2563EB';
        slide.addShape('line', {
          x: bulletIndex === 0 ? x + 0.85 : x - 1.05,
          y: 3.05,
          w: bulletIndex === 0 ? 0 : 2.15,
          h: 0,
          line: { color: 'CBD5E1', width: 2 },
        });
        slide.addShape('ellipse', {
          x: x + 0.72,
          y: 2.82,
          w: 0.48,
          h: 0.48,
          fill: { color },
          line: { color },
          shadow: pptxShadow(color, 0.2),
        });
        slide.addShape('roundRect', {
          x,
          y: 3.55,
          w: 2.25,
          h: 1.18,
          rectRadius: 0.08,
          fill: { color: bulletIndex % 2 === 0 ? 'F0FDFA' : 'EFF6FF' },
          line: { color: bulletIndex % 2 === 0 ? '99F6E4' : 'BFDBFE', width: 1 },
        });
        slide.addText(pptxText(bullet, 110), {
          x: x + 0.22,
          y: 3.88,
          w: 1.78,
          h: 0.45,
          fontFace: 'Aptos',
          fontSize: 10.5,
          color: '0F172A',
          bold: true,
          fit: 'shrink',
          margin: 0,
        });
      });
    } else if (layout === 'image' || layout === 'split') {
      addPptxBullets(slide, deckSlide.bullets || [], 0.95, 2.25, 5.4, 2.7);
      addPptxGlow(slide, 7.28, 1.48, 4.7, 4.7, '93C5FD');
      addPptxImageOrPanel(slide, imageForDeckSlide(deckSlide, index), 7.5, 1.68, 4.26, 4.26);
    } else if (layout === 'steps') {
      (deckSlide.bullets || []).slice(0, 4).forEach((bullet, bulletIndex) => {
        const x = 0.9 + bulletIndex * 2.9;
        const isTeal = bulletIndex % 2 === 0;
        slide.addShape('roundRect', {
          x,
          y: 2.15,
          w: 2.35,
          h: 2.2,
          rectRadius: 0.08,
          fill: { color: isTeal ? 'F0FDFA' : 'EFF6FF' },
          line: { color: isTeal ? '99F6E4' : 'BFDBFE', width: 1 },
          shadow: pptxShadow(isTeal ? '0F766E' : '2563EB', 0.1),
        });
        slide.addText(String(bulletIndex + 1).padStart(2, '0'), {
          x: x + 0.25,
          y: 2.45,
          w: 0.6,
          h: 0.25,
          fontFace: 'Aptos',
          fontSize: 13,
          color: isTeal ? '0F766E' : '2563EB',
          bold: true,
          margin: 0,
        });
        slide.addText(pptxText(bullet, 120), {
          x: x + 0.28,
          y: 3.2,
          w: 1.72,
          h: 0.62,
          fontFace: 'Aptos',
          fontSize: 11,
          color: '1E293B',
          bold: true,
          fit: 'shrink',
          margin: 0,
        });
      });
    } else if (layout === 'quote') {
      slide.addShape('roundRect', {
        x: 1.08,
        y: 2.15,
        w: 11.0,
        h: 2.45,
        rectRadius: 0.08,
        fill: { color: '0F172A' },
        line: { color: '0F172A' },
        shadow: pptxShadow('0F172A', 0.2),
      });
      slide.addText(pptxText((deckSlide.bullets || [deckSlide.visualCue || ''])[0] || '', 220), {
        x: 1.6,
        y: 2.85,
        w: 9.95,
        h: 0.88,
        fontFace: 'Aptos Display',
        fontSize: 22,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        fit: 'shrink',
        margin: 0,
      });
    } else {
      const first = (deckSlide.bullets || [])[0] || deckSlide.visualCue || 'Key signal';
      slide.addShape('roundRect', {
        x: 0.95,
        y: 2.15,
        w: 4.05,
        h: 2.15,
        rectRadius: 0.08,
        fill: { color: '0F766E' },
        line: { color: '0F766E' },
        shadow: pptxShadow('0F766E', 0.16),
      });
      slide.addText(pptxText(first, 140), {
        x: 1.32,
        y: 2.82,
        w: 3.3,
        h: 0.78,
        fontFace: 'Aptos Display',
        fontSize: 20,
        color: 'FFFFFF',
        bold: true,
        align: 'center',
        fit: 'shrink',
        margin: 0,
      });
      addPptxBullets(slide, (deckSlide.bullets || []).slice(1), 6.1, 2.2, 5.55, 2.65);
    }

    if (deckSlide.visualCue && layout !== 'quote') {
      slide.addText(pptxText(deckSlide.visualCue, 180), {
        x: 0.78,
        y: 6.28,
        w: 11.1,
        h: 0.18,
        fontFace: 'Aptos',
        fontSize: 7,
        color: '64748B',
        italic: true,
        fit: 'shrink',
        margin: 0,
      });
    }
    addPptxFooter(slide, slideNumber, totalSlides);
    slideNumber += 1;
  });

  const close = pptx.addSlide();
  close.background = { color: '0F172A' };
  close.addText('Next move', {
    x: 1.02,
    y: 1.15,
    w: 4.8,
    h: 0.6,
    fontFace: 'Aptos Display',
    fontSize: 28,
    color: 'FFFFFF',
    bold: true,
    margin: 0,
  });
  close.addText('Turn the presentation into decisions, commitments, and measurable work.', {
    x: 1.05,
    y: 2.08,
    w: 7.4,
    h: 0.42,
    fontFace: 'Aptos',
    fontSize: 14,
    color: 'CBD5E1',
    fit: 'shrink',
    margin: 0,
  });
  ['Choose the first validation audience', 'Confirm the smallest credible pilot', 'Assign owners and timing'].forEach((item, index) => {
    const y = 3.6 + index * 0.78;
    close.addShape('roundRect', {
      x: 1.08,
      y,
      w: 6.45,
      h: 0.48,
      rectRadius: 0.08,
      fill: { color: index % 2 === 0 ? '134E4A' : '1E3A8A' },
      line: { color: index % 2 === 0 ? '134E4A' : '1E3A8A' },
    });
    close.addText(item, {
      x: 1.35,
      y: y + 0.14,
      w: 5.6,
      h: 0.2,
      fontFace: 'Aptos',
      fontSize: 10,
      color: 'FFFFFF',
      bold: true,
      margin: 0,
    });
  });

  const output = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

function buildGoogleSlidesRequests(
  plan: GeneratedDeckPlan,
  imageUrls: string[],
  sourceTitle: string,
  requestId: string,
  defaultSlideId?: string
): SlidesBatchRequest[] {
  const slides = (plan.slides || []).slice(0, 12);
  const totalSlides = slides.length + 3;
  const safePrefix = `nwg_${requestId.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 28)}`;
  const requests: SlidesBatchRequest[] = [];
  let slideNumber = 1;

  const coverId = `${safePrefix}_cover`;
  requests.push({ createSlide: { objectId: coverId, slideLayoutReference: { predefinedLayout: 'BLANK' } } });
  requests.push(setPageBackground(coverId, 'F8FAFC'));
  requests.push(...createRect(coverId, `${safePrefix}_cover_accent`, 0, 0, 9, GOOGLE_SLIDE.height, '0F766E'));
  requests.push(...addImageIfAvailable(coverId, `${safePrefix}_cover_image`, imageUrls[0], 430, 42, 230, 270));
  requests.push(...createTextBox(coverId, `${safePrefix}_cover_label`, 'AI-GENERATED PRESENTATION', 42, 50, 240, 16, {
    color: '0F766E',
    fontSize: 8,
    bold: true,
  }));
  requests.push(...createTextBox(coverId, `${safePrefix}_cover_title`, plan.title || sourceTitle, 42, 82, 350, 92, {
    color: '0F172A',
    fontSize: 30,
    bold: true,
    fontFamily: 'Arial',
  }));
  requests.push(...createTextBox(coverId, `${safePrefix}_cover_subtitle`, plan.subtitle || 'Presentation draft', 44, 185, 330, 46, {
    color: '475569',
    fontSize: 14,
  }));
  if (plan.narrative) {
    requests.push(...createRect(coverId, `${safePrefix}_cover_narrative_box`, 42, 265, 340, 54, 'FFFFFF', 'CBD5E1', 'ROUND_RECTANGLE'));
    requests.push(...createTextBox(coverId, `${safePrefix}_cover_narrative`, plan.narrative, 58, 280, 308, 24, {
      color: '334155',
      fontSize: 11,
      italic: true,
    }));
  }
  requests.push(...addFooter(coverId, `${safePrefix}_cover`, slideNumber, totalSlides));
  slideNumber += 1;

  const agendaId = `${safePrefix}_agenda`;
  requests.push({ createSlide: { objectId: agendaId, slideLayoutReference: { predefinedLayout: 'BLANK' } } });
  requests.push(setPageBackground(agendaId, 'FFFFFF'));
  requests.push(...createRect(agendaId, `${safePrefix}_agenda_accent`, 0, 0, 9, GOOGLE_SLIDE.height, '2563EB'));
  requests.push(...createTextBox(agendaId, `${safePrefix}_agenda_title`, 'Discussion Flow', 42, 40, 320, 40, {
    color: '0F172A',
    fontSize: 28,
    bold: true,
  }));
  slides.slice(0, 6).forEach((item, index) => {
    const row = Math.floor(index / 2);
    const col = index % 2;
    const x = 48 + col * 318;
    const y = 105 + row * 76;
    const cardId = `${safePrefix}_agenda_card_${index}`;
    requests.push(...createRect(agendaId, cardId, x, y, 280, 55, index % 2 === 0 ? 'F0FDFA' : 'EFF6FF', index % 2 === 0 ? '99F6E4' : 'BFDBFE', 'ROUND_RECTANGLE'));
    requests.push(...createTextBox(agendaId, `${cardId}_num`, String(index + 1).padStart(2, '0'), x + 12, y + 13, 34, 18, {
      color: index % 2 === 0 ? '0F766E' : '2563EB',
      fontSize: 11,
      bold: true,
    }));
    requests.push(...createTextBox(agendaId, `${cardId}_title`, item.title || 'Topic', x + 56, y + 11, 198, 17, {
      color: '0F172A',
      fontSize: 11,
      bold: true,
    }));
    requests.push(...createTextBox(agendaId, `${cardId}_detail`, (item.bullets || [])[0] || item.visualCue || '', x + 56, y + 31, 198, 14, {
      color: '64748B',
      fontSize: 7,
    }));
  });
  requests.push(...addFooter(agendaId, `${safePrefix}_agenda`, slideNumber, totalSlides));
  slideNumber += 1;

  slides.forEach((deckSlide, index) => {
    const slideId = `${safePrefix}_slide_${index}`;
    const slidePrefix = `${safePrefix}_s${index}`;
    const imageUrl = deckSlide.imageUrl || (imageUrls.length ? imageUrls[index % imageUrls.length] : undefined);
    const layout = deckSlide.layout || 'signal';
    requests.push({ createSlide: { objectId: slideId, slideLayoutReference: { predefinedLayout: 'BLANK' } } });
    requests.push(setPageBackground(slideId, index % 2 === 0 ? 'FFFFFF' : 'F8FAFC'));
    requests.push(...createRect(slideId, `${slidePrefix}_accent`, 0, 0, 9, GOOGLE_SLIDE.height, index % 2 === 0 ? '0F766E' : '2563EB'));
    if (deckSlide.kicker) {
      requests.push(...createTextBox(slideId, `${slidePrefix}_kicker`, deckSlide.kicker.toUpperCase(), 42, 32, 210, 14, {
        color: '0F766E',
        fontSize: 8,
        bold: true,
      }));
    }
    requests.push(...createTextBox(slideId, `${slidePrefix}_title`, deckSlide.title || 'Key point', 42, deckSlide.kicker ? 50 : 38, 410, 42, {
      color: '0F172A',
      fontSize: 24,
      bold: true,
    }));

    if (layout === 'hero') {
      requests.push(...addImageIfAvailable(slideId, `${slidePrefix}_hero_image`, imageUrl, 52, 112, 590, 205));
      requests.push(...createRect(slideId, `${slidePrefix}_hero_caption_box`, 78, 260, 350, 48, '0F172A', '0F172A', 'ROUND_RECTANGLE'));
      requests.push(...createTextBox(slideId, `${slidePrefix}_hero_caption`, (deckSlide.bullets || [])[0] || deckSlide.visualCue || 'Core idea', 96, 275, 312, 18, {
        color: 'FFFFFF',
        fontSize: 14,
        bold: true,
      }));
    } else if (layout === 'dashboard') {
      const colors = ['0F766E', '2563EB', 'F59E0B', 'EF4444'];
      (deckSlide.bullets || []).slice(0, 4).forEach((bullet, bulletIndex) => {
        const col = bulletIndex % 2;
        const row = Math.floor(bulletIndex / 2);
        const x = 52 + col * 302;
        const y = 118 + row * 88;
        const color = colors[bulletIndex % colors.length];
        const cardId = `${slidePrefix}_dash_${bulletIndex}`;
        requests.push(...createRect(slideId, cardId, x, y, 260, 64, 'FFFFFF', 'E2E8F0', 'ROUND_RECTANGLE'));
        requests.push(...createRect(slideId, `${cardId}_bar`, x, y, 6, 64, color, color));
        requests.push(...createTextBox(slideId, `${cardId}_num`, String(bulletIndex + 1).padStart(2, '0'), x + 18, y + 14, 34, 18, {
          color,
          fontSize: 10,
          bold: true,
        }));
        requests.push(...createTextBox(slideId, `${cardId}_text`, bullet, x + 58, y + 13, 176, 28, {
          color: '0F172A',
          fontSize: 12,
          bold: true,
        }));
        requests.push(...createRect(slideId, `${cardId}_progress`, x + 58, y + 48, 150, 4, color, color, 'ROUND_RECTANGLE'));
      });
    } else if (layout === 'comparison') {
      const leftBullets = (deckSlide.bullets || []).filter((_, i) => i % 2 === 0).slice(0, 3);
      const rightBullets = (deckSlide.bullets || []).filter((_, i) => i % 2 === 1).slice(0, 3);
      [
        { label: 'Current reality', x: 58, color: '475569', bullets: leftBullets },
        { label: 'Better path', x: 370, color: '0F766E', bullets: rightBullets.length ? rightBullets : leftBullets },
      ].forEach((panel, panelIndex) => {
        const panelId = `${slidePrefix}_compare_${panelIndex}`;
        requests.push(...createRect(slideId, panelId, panel.x, 122, 270, 165, 'FFFFFF', panel.color, 'ROUND_RECTANGLE'));
        requests.push(...createTextBox(slideId, `${panelId}_label`, panel.label, panel.x + 18, 142, 160, 16, {
          color: panel.color,
          fontSize: 10,
          bold: true,
        }));
        requests.push(...createBulletTextBox(slideId, `${panelId}_bullets`, panel.bullets, panel.x + 18, 178, 220, 78));
      });
    } else if (layout === 'roadmap') {
      (deckSlide.bullets || []).slice(0, 4).forEach((bullet, bulletIndex) => {
        const x = 58 + bulletIndex * 152;
        const color = bulletIndex % 2 === 0 ? '0F766E' : '2563EB';
        const stepId = `${slidePrefix}_road_${bulletIndex}`;
        requests.push(...createRect(slideId, `${stepId}_dot`, x + 45, 150, 26, 26, color, color, 'ELLIPSE'));
        if (bulletIndex > 0) {
          requests.push(...createRect(slideId, `${stepId}_line`, x - 86, 162, 130, 2, 'CBD5E1', 'CBD5E1'));
        }
        requests.push(...createRect(slideId, stepId, x, 212, 116, 70, bulletIndex % 2 === 0 ? 'F0FDFA' : 'EFF6FF', bulletIndex % 2 === 0 ? '99F6E4' : 'BFDBFE', 'ROUND_RECTANGLE'));
        requests.push(...createTextBox(slideId, `${stepId}_text`, bullet, x + 12, 235, 90, 24, {
          color: '0F172A',
          fontSize: 10,
          bold: true,
        }));
      });
    } else if (layout === 'image' || layout === 'split') {
      requests.push(...createBulletTextBox(slideId, `${slidePrefix}_bullets`, deckSlide.bullets || [], 52, 125, 292, 180));
      requests.push(...addImageIfAvailable(slideId, `${slidePrefix}_image`, imageUrl, 405, 92, 230, 230));
    } else if (layout === 'steps') {
      (deckSlide.bullets || []).slice(0, 4).forEach((bullet, bulletIndex) => {
        const x = 48 + bulletIndex * 158;
        const boxId = `${slidePrefix}_step_${bulletIndex}`;
        requests.push(...createRect(slideId, boxId, x, 125, 128, 122, bulletIndex % 2 === 0 ? 'F0FDFA' : 'EFF6FF', bulletIndex % 2 === 0 ? '99F6E4' : 'BFDBFE', 'ROUND_RECTANGLE'));
        requests.push(...createTextBox(slideId, `${boxId}_num`, String(bulletIndex + 1).padStart(2, '0'), x + 14, 143, 36, 18, {
          color: bulletIndex % 2 === 0 ? '0F766E' : '2563EB',
          fontSize: 13,
          bold: true,
        }));
        requests.push(...createTextBox(slideId, `${boxId}_text`, bullet, x + 16, 182, 94, 38, {
          color: '1E293B',
          fontSize: 11,
          bold: true,
        }));
      });
    } else if (layout === 'quote') {
      requests.push(...createRect(slideId, `${slidePrefix}_quote_box`, 58, 120, 594, 135, '0F172A', '0F172A', 'ROUND_RECTANGLE'));
      requests.push(...createTextBox(slideId, `${slidePrefix}_quote`, (deckSlide.bullets || [deckSlide.visualCue || ''])[0] || '', 88, 158, 534, 48, {
        color: 'FFFFFF',
        fontSize: 22,
        bold: true,
        align: 'CENTER',
      }));
    } else {
      const first = (deckSlide.bullets || [])[0] || deckSlide.visualCue || 'Key signal';
      requests.push(...createRect(slideId, `${slidePrefix}_signal_box`, 52, 118, 220, 120, '0F766E', '0F766E', 'ROUND_RECTANGLE'));
      requests.push(...createTextBox(slideId, `${slidePrefix}_signal`, first, 72, 150, 180, 42, {
        color: 'FFFFFF',
        fontSize: 20,
        bold: true,
        align: 'CENTER',
      }));
      requests.push(...createBulletTextBox(slideId, `${slidePrefix}_bullets`, (deckSlide.bullets || []).slice(1), 330, 122, 300, 160));
    }

    if (deckSlide.visualCue && layout !== 'quote') {
      requests.push(...createTextBox(slideId, `${slidePrefix}_visual_cue`, deckSlide.visualCue, 42, 338, 600, 14, {
        color: '64748B',
        fontSize: 7,
        italic: true,
      }));
    }
    requests.push(...addFooter(slideId, slidePrefix, slideNumber, totalSlides));
    slideNumber += 1;
  });

  const closeId = `${safePrefix}_close`;
  requests.push({ createSlide: { objectId: closeId, slideLayoutReference: { predefinedLayout: 'BLANK' } } });
  requests.push(setPageBackground(closeId, '0F172A'));
  requests.push(...createTextBox(closeId, `${safePrefix}_close_title`, 'Next move', 56, 66, 260, 38, {
    color: 'FFFFFF',
    fontSize: 28,
    bold: true,
  }));
  requests.push(...createTextBox(closeId, `${safePrefix}_close_subtitle`, 'Turn the presentation into decisions, commitments, and measurable work.', 58, 122, 398, 34, {
    color: 'CBD5E1',
    fontSize: 14,
  }));
  ['Choose the first validation audience', 'Confirm the smallest credible pilot', 'Assign owners and timing'].forEach((item, index) => {
    const boxId = `${safePrefix}_close_action_${index}`;
    requests.push(...createRect(closeId, boxId, 60, 200 + index * 44, 348, 28, index % 2 === 0 ? '134E4A' : '1E3A8A', index % 2 === 0 ? '134E4A' : '1E3A8A', 'ROUND_RECTANGLE'));
    requests.push(...createTextBox(closeId, `${boxId}_text`, item, 76, 207 + index * 44, 300, 12, {
      color: 'FFFFFF',
      fontSize: 10,
      bold: true,
    }));
  });
  requests.push(...createTextBox(closeId, `${safePrefix}_close_url`, 'newworld-game.org', 540, 368, 112, 12, {
    color: '94A3B8',
    fontSize: 8,
    align: 'END',
  }));

  if (defaultSlideId) {
    requests.push({ deleteObject: { objectId: defaultSlideId } });
  }

  return requests;
}

async function createGoogleSlidesDeck(
  plan: GeneratedDeckPlan,
  imageUrls: string[],
  sourceTitle: string,
  requestId: string
): Promise<GoogleSlidesOutput> {
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/presentations',
      'https://www.googleapis.com/auth/drive',
    ],
  });
  const authClient = await auth.getClient();
  const slidesService = google.slides({ version: 'v1', auth: authClient as any });
  const driveService = google.drive({ version: 'v3', auth: authClient as any });
  const title = cleanPresentationText(plan.title || sourceTitle || 'AI Presentation', 120);

  const folder = await driveService.files.get({
    fileId: PRESENTATION_DRIVE_FOLDER_ID,
    fields: 'id,name,mimeType',
    supportsAllDrives: true,
  } as any);
  if (folder.data.mimeType !== 'application/vnd.google-apps.folder') {
    throw new Error(
      `Presentation destination ${PRESENTATION_DRIVE_FOLDER_ID} is not a Google Drive folder.`
    );
  }

  const created = await driveService.files.create({
    requestBody: {
      name: title,
      mimeType: GOOGLE_SLIDES_MIME,
      parents: [PRESENTATION_DRIVE_FOLDER_ID],
    },
    fields: 'id',
    supportsAllDrives: true,
  } as any);
  const presentationId = created.data.id;
  if (!presentationId) {
    throw new Error('Google Slides did not return a presentation ID.');
  }

  const presentation = await slidesService.presentations.get({ presentationId } as any);
  const defaultSlideId = presentation.data.slides?.[0]?.objectId || undefined;
  const validImageUrls = await buildPresentationImageUrlPool(imageUrls);
  const requests = buildGoogleSlidesRequests(plan, validImageUrls, sourceTitle, requestId, defaultSlideId);

  await slidesService.presentations.batchUpdate({
    presentationId,
    requestBody: { requests },
  } as any);

  await driveService.permissions.create({
    fileId: presentationId,
    requestBody: {
      type: 'anyone',
      role: 'reader',
      allowFileDiscovery: false,
    },
    fields: 'id',
    supportsAllDrives: true,
  } as any);

  const exported = await driveService.files.export(
    {
      fileId: presentationId,
      mimeType: PRESENTATION_PPTX_MIME,
      supportsAllDrives: true,
    } as any,
    { responseType: 'arraybuffer' } as any
  );
  const exportedData = exported.data as unknown;
  const pptxBuffer = Buffer.isBuffer(exportedData)
    ? exportedData
    : Buffer.from(exportedData as ArrayBuffer);

  return {
    presentationId,
    googleSlidesUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    googleSlidesEditUrl: `https://docs.google.com/presentation/d/${presentationId}/edit`,
    googleSlidesPresentUrl: `https://docs.google.com/presentation/d/${presentationId}/present`,
    pptxBuffer,
  };
}

export const onPresentationRequest = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .firestore.document('users/{uid}/presentation-requests/{docId}')
  .onCreate(async (snap, context) => {
    const uid = String(context.params.uid || '');
    const requestId = String(context.params.docId || snap.id);
    const data = snap.data() || {};
    const solutionId = cleanPresentationText(data?.solutionId, 120);

    if (!solutionId) {
      await snap.ref.update({
        status: { state: 'ERRORED', message: 'No solutionId provided.' },
      });
      return;
    }

    try {
      await snap.ref.update({
        status: { state: 'PROCESSING', message: 'Reading solution content...' },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const solutionRef = admin.firestore().doc(`solutions/${solutionId}`);
      const solutionSnap = await solutionRef.get();
      if (!solutionSnap.exists) {
        await snap.ref.update({
          status: { state: 'ERRORED', message: 'Solution not found.' },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      const solution = solutionSnap.data() || {};
      const title = cleanPresentationText(solution?.title || 'Solution Presentation', 90);
      const { sourceText, imageUrls } = await collectPresentationSourceText(solution);

      if (!sourceText || sourceText.length < 80) {
        await snap.ref.update({
          status: {
            state: 'ERRORED',
            message: 'There is not enough solution content to generate a presentation.',
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
      }

      await snap.ref.update({
        status: { state: 'PROCESSING', message: 'Designing slide narrative...' },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const plan = await generatePresentationDeckPlan(sourceText, title);

      await snap.ref.update({
        status: { state: 'PROCESSING', message: 'Creating presentation visuals...' },
        planPreview: {
          title: plan.title,
          subtitle: plan.subtitle,
          slideCount: plan.slides?.length || 0,
          generatedImagePrompts: (plan.slides || []).filter((slide) => slide.imagePrompt).length,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const generatedImageUrls = await generatePresentationVisuals(
        plan,
        uid,
        solutionId,
        requestId
      );
      const presentationImageUrls = uniquePresentationStrings([
        ...generatedImageUrls,
        ...imageUrls,
      ]).slice(0, 8);

      await snap.ref.update({
        status: { state: 'PROCESSING', message: 'Building Google Slides deck...' },
        planPreview: {
          title: plan.title,
          subtitle: plan.subtitle,
          slideCount: plan.slides?.length || 0,
          generatedImageCount: generatedImageUrls.length,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      let slidesDeck: GoogleSlidesOutput | null = null;
      let pptxBuffer: Buffer;
      let googleSlidesError = '';

      try {
        slidesDeck = await createGoogleSlidesDeck(
          plan,
          presentationImageUrls,
          title,
          requestId
        );
        pptxBuffer = slidesDeck.pptxBuffer;
      } catch (error: any) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const normalizedError = errorMsg.toLowerCase();
        const isDriveQuotaError =
          normalizedError.includes('drive storage quota') ||
          normalizedError.includes('storage quota has been exceeded');

        if (!isDriveQuotaError) {
          throw error;
        }

        googleSlidesError = errorMsg;
        console.warn('Google Slides creation hit Drive quota; creating PPTX fallback.');
        await snap.ref.update({
          status: {
            state: 'PROCESSING',
            message: 'Google Drive quota blocked Slides creation. Building PowerPoint fallback...',
          },
          googleSlidesError,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        pptxBuffer = await createPowerPointDeck(plan, presentationImageUrls, title);
      }

      await snap.ref.update({
        status: { state: 'PROCESSING', message: 'Preparing PowerPoint download...' },
        responsePreview: {
          title: plan.title || title,
          ...(slidesDeck
            ? {
                googleSlidesUrl: slidesDeck.googleSlidesUrl,
                googleSlidesPresentUrl: slidesDeck.googleSlidesPresentUrl,
              }
            : { primaryFormat: PRESENTATION_PPTX_MIME }),
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const saved = await savePresentationPptx(
        uid,
        solutionId,
        requestId,
        plan.title || title,
        pptxBuffer
      );
      const now = Date.now();
      const formattedDateCreated = new Date(now).toLocaleString('en-US', {
        year: '2-digit',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      const thumbnail = presentationImageUrls[0] || PRESENTATION_FALLBACK_IMAGE;
      const viewerSlides = buildPresentationViewerSlides(
        plan,
        presentationImageUrls,
        title
      );

      const documentEntry = {
        downloadURL: saved.downloadUrl,
        name: plan.title || title,
        originalFilename: saved.fileName,
        description: plan.subtitle || 'AI-generated PowerPoint export',
        type: PRESENTATION_PPTX_MIME,
        dateSorted: now,
        dateCreated: formattedDateCreated,
        formattedDateCreated,
      };

      await solutionRef.set(
        {
          documents: admin.firestore.FieldValue.arrayUnion(documentEntry),
        },
        { merge: true }
      );

      await solutionRef.collection('presentations').doc(requestId).set(
        {
          id: requestId,
          solutionId,
          name: plan.title || title,
          description: plan.subtitle || 'AI-generated presentation',
          dateCreated: now,
          thumbnail,
          generatedByAi: true,
          ...(slidesDeck
            ? {
                googleSlidesId: slidesDeck.presentationId,
                googleSlidesUrl: slidesDeck.googleSlidesUrl,
                googleSlidesEditUrl: slidesDeck.googleSlidesEditUrl,
                googleSlidesPresentUrl: slidesDeck.googleSlidesPresentUrl,
              }
            : {
                googleSlidesError,
              }),
          pptxDownloadURL: saved.downloadUrl,
          pptxFileName: saved.fileName,
          primaryFormat: slidesDeck ? GOOGLE_SLIDES_MIME : PRESENTATION_PPTX_MIME,
          slides: viewerSlides,
        },
        { merge: true }
      );

      await snap.ref.update({
        status: {
          state: 'COMPLETED',
          message: slidesDeck
            ? 'Presentation generated.'
            : 'PowerPoint presentation generated. Google Slides was blocked by Drive storage quota.',
        },
        response: {
          ...saved,
          title: plan.title || title,
          subtitle: plan.subtitle || '',
          ...(slidesDeck
            ? {
                googleSlidesId: slidesDeck.presentationId,
                googleSlidesUrl: slidesDeck.googleSlidesUrl,
                googleSlidesEditUrl: slidesDeck.googleSlidesEditUrl,
                googleSlidesPresentUrl: slidesDeck.googleSlidesPresentUrl,
              }
            : {
                googleSlidesError,
              }),
          primaryFormat: slidesDeck ? GOOGLE_SLIDES_MIME : PRESENTATION_PPTX_MIME,
          slideCount: viewerSlides.length,
          document: documentEntry,
          presentationId: requestId,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error: any) {
      console.error('onPresentationRequest error:', error?.message || error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      const normalizedError = errorMsg.toLowerCase();
      const isFolderAccessError =
        normalizedError.includes('file not found') &&
        errorMsg.includes(PRESENTATION_DRIVE_FOLDER_ID);
      const isPermissionError =
        normalizedError.includes('permission') ||
        normalizedError.includes('insufficient authentication') ||
        normalizedError.includes('insufficient permission');
      await snap.ref.update({
        status: {
          state: 'ERRORED',
          message: isPermissionError || isFolderAccessError
            ? `Share the Google Drive presentation folder with ${PRESENTATION_SERVICE_ACCOUNT_EMAIL} as Editor, then try again.`
            : normalizedError.includes('quota') || normalizedError.includes('429')
              ? 'The AI service is temporarily busy. Please try again shortly.'
              : 'Could not generate the presentation. Please try again.',
          technicalError: errorMsg,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

export const findSolutionReachPeople = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 180, memory: '1GB' })
  .https.onCall(async (data: ReachLookupRequest) => {
    const solutionId = normalizeReachText(data?.solutionId, 120);
    const page = Math.max(Number(data?.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(data?.pageSize) || 10, 1), 10);
    const city = normalizeReachText(data?.city, 120);
    const region = normalizeReachText(data?.region, 120);
    const country = normalizeReachText(data?.country, 120);
    const excludedIds = normalizeReachExcludedIds(data?.excludedIds);
    const forceRefresh = data?.forceRefresh === true;

    if (!solutionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A solutionId is required.'
      );
    }

    const solutionSnap = await admin.firestore().doc(`solutions/${solutionId}`).get();
    if (!solutionSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'The requested solution could not be found.'
      );
    }

    const solution = solutionSnap.data() || {};
    const solutionTitle =
      normalizeReachText(solution?.title, 180) || 'Untitled solution';
    const solutionSummary =
      normalizeReachText(
        solution?.description ||
          solution?.preview ||
          solution?.content ||
          solution?.recruitmentProfile?.challengeDescription,
        1800
      ) || `A developing solution called ${solutionTitle}.`;
    const focusArea = normalizeReachText(
      solution?.solutionArea ||
        solution?.recruitmentProfile?.focusArea ||
        (Array.isArray(solution?.sdgs) ? solution.sdgs.join(', ') : solution?.sdg),
      220
    );
    const category = normalizeReachText(solution?.category, 120);
    const sdgs = Array.isArray(solution?.sdgs)
      ? solution.sdgs
          .map((value: unknown) => normalizeReachText(value, 80))
          .filter(Boolean)
      : [];
    const cacheKey = buildReachCacheKey(city, country, region);
    const cacheRef = admin
      .firestore()
      .doc(`solutions/${solutionId}/solution_launch_reach/${cacheKey}`);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const cacheSnap = await cacheRef.get();
    let cache = cacheSnap.exists
      ? (cacheSnap.data() as ReachLookupCacheDocument)
      : undefined;

    if (forceRefresh && cacheSnap.exists) {
      await cacheRef.delete().catch(() => null);
      cache = undefined;
    } else if (isReachCacheExpired(cache, nowMs)) {
      await cacheRef.delete().catch(() => null);
      cache = undefined;
    }

    try {
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.15,
          maxOutputTokens: 5000,
        },
        tools: [{ google_search: {} }],
      } as any);

      let cachedPeople = normalizeCachedReachPeople(cache?.people);
      let summary = normalizeReachText(cache?.summary, 280);
      let lastSearchedAtIso = normalizeReachText(cache?.lastSearchedAtIso, 80);
      let availablePeople = cachedPeople.filter(
        (person) => !excludedIds.includes(person.id)
      );

      const maxCachePeople = 120;
      const fetchAttemptsLimit = 3;
      let attempts = 0;

      while (
        availablePeople.length < pageSize &&
        cachedPeople.length < maxCachePeople &&
        attempts < fetchAttemptsLimit
      ) {
        attempts += 1;

        const searchExcludedIds = Array.from(
          new Set([
            ...excludedIds,
            ...cachedPeople.map((person) => person.id),
          ])
        );

        const prompt = buildReachLookupPrompt({
          solutionTitle,
          solutionSummary,
          focusArea,
          sdgs,
          category,
          city,
          region,
          country,
          page: page + attempts - 1,
          pageSize,
          excludedIds: searchExcludedIds,
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text() || '';
        const parsed = parseReachLookupPayload(text);

        const normalized = parsed.people
          .map((person) => normalizeReachPersonCandidate(person))
          .filter((person): person is ReachLookupPerson => !!person)
          .filter((person) => !searchExcludedIds.includes(person.id))
          .slice(0, pageSize * 2);

        const validated = await Promise.all(
          normalized.map(async (person) => ({
            person,
            valid: await isUrlUsableForReport(person.url, 4000),
          }))
        );

        const freshPeople = dedupeReachPeople(
          validated.filter((entry) => entry.valid).map((entry) => entry.person)
        ).slice(0, pageSize);

        if (!freshPeople.length) {
          break;
        }

        cachedPeople = dedupeReachPeople([...cachedPeople, ...freshPeople]).slice(
          0,
          maxCachePeople
        );
        availablePeople = cachedPeople.filter(
          (person) => !excludedIds.includes(person.id)
        );
        summary =
          normalizeReachText(parsed.summary, 280) ||
          summary ||
          (city && country
            ? `This batch favors people closely aligned to ${solutionTitle} and weighted for ${[
                city,
                region,
                country,
              ]
                .filter(Boolean)
                .join(', ')}.`
            : `This batch favors people closely aligned to ${solutionTitle}.`);
        lastSearchedAtIso = new Date().toISOString();
      }

      if (!cache || attempts > 0) {
        const nextCache: ReachLookupCacheDocument = {
          solutionId,
          cacheKey,
          ...(city ? { city } : {}),
          ...(region ? { region } : {}),
          ...(country ? { country } : {}),
          summary:
            summary ||
            (city && country
              ? `This batch favors people closely aligned to ${solutionTitle} and weighted for ${[
                  city,
                  region,
                  country,
                ]
                  .filter(Boolean)
                  .join(', ')}.`
              : `This batch favors people closely aligned to ${solutionTitle}.`),
          people: cachedPeople,
          createdAtIso:
            normalizeReachText(cache?.createdAtIso, 80) || nowIso,
          lastSearchedAtIso: lastSearchedAtIso || nowIso,
          expiresAfterMonths: 3,
        };

        await cacheRef.set(stripUndefinedValues(nextCache), { merge: false });
        cache = nextCache;
      }

      availablePeople = cachedPeople.filter(
        (person) => !excludedIds.includes(person.id)
      );
      const people = availablePeople.slice(0, pageSize);
      const hasMore = availablePeople.length > pageSize;

      return {
        people,
        page,
        nextPage: page + 1,
        hasMore,
        summary:
          summary ||
          (city && country
            ? `This batch favors people closely aligned to ${solutionTitle} and weighted for ${[
                city,
                region,
                country,
              ]
                .filter(Boolean)
                .join(', ')}.`
            : `This batch favors people closely aligned to ${solutionTitle}.`),
        generatedAt:
          normalizeReachText(cache?.lastSearchedAtIso, 80) || nowIso,
      };
    } catch (error: any) {
      console.error('findSolutionReachPeople failed', error);
      throw new functions.https.HttpsError(
        'internal',
        error?.message || 'Reach lookup failed.'
      );
    }
  });

export const findSolutionLaunchResources = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 180, memory: '1GB' })
  .https.onCall(async (data: SolutionLaunchResourceRequest) => {
    const solutionId = normalizeReachText(data?.solutionId, 120);
    const lane = normalizeReachText(data?.lane, 40) as SolutionLaunchResourceLane;
    const pageSize = Math.min(Math.max(Number(data?.pageSize) || 5, 1), 10);
    const city = normalizeReachText(data?.city, 120);
    const region = normalizeReachText(data?.region, 120);
    const country = normalizeReachText(data?.country, 120);
    const requestedLocationMode =
      data?.locationMode === 'global' ? 'global' : 'location';
    const locationMode: 'location' | 'global' =
      requestedLocationMode === 'global' || (city && country)
        ? requestedLocationMode
        : 'global';
    const forceRefresh = data?.forceRefresh === true;
    const append = data?.append === true;
    const excludedIds = normalizeReachExcludedIds(data?.excludedIds);

    if (!solutionId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A solutionId is required.'
      );
    }
    if (!['publish', 'fund', 'partner'].includes(lane)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A valid launch lane is required.'
      );
    }

    const solutionSnap = await admin.firestore().doc(`solutions/${solutionId}`).get();
    if (!solutionSnap.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'The requested solution could not be found.'
      );
    }

    const solution = solutionSnap.data() || {};
    const solutionTitle =
      normalizeReachText(solution?.title, 180) || 'Untitled solution';
    const solutionSummary =
      normalizeReachText(
        solution?.description ||
          solution?.preview ||
          solution?.content ||
          solution?.recruitmentProfile?.challengeDescription,
        2200
      ) || `A developing solution called ${solutionTitle}.`;
    const focusArea = normalizeReachText(
      solution?.solutionArea ||
        solution?.recruitmentProfile?.focusArea ||
        (Array.isArray(solution?.sdgs) ? solution.sdgs.join(', ') : solution?.sdg),
      260
    );
    const category = normalizeReachText(solution?.category, 140);
    const sdgs = Array.isArray(solution?.sdgs)
      ? solution.sdgs
          .map((value: unknown) => normalizeReachText(value, 90))
          .filter(Boolean)
      : [];
    const recruitmentProfile = normalizeReachText(
      [
        solution?.recruitmentProfile?.scopeOfWork,
        solution?.recruitmentProfile?.finalProduct,
        solution?.recruitmentProfile?.perspectives,
        solution?.recruitmentProfile?.interests,
        solution?.recruitmentProfile?.knowledge,
        solution?.recruitmentProfile?.skills,
        solution?.recruitmentProfile?.additionalNotes,
      ]
        .filter(Boolean)
        .join(' '),
      1100
    );
    const participantCount = Array.isArray(solution?.participants)
      ? solution.participants.length
      : solution?.participants && typeof solution.participants === 'object'
        ? Object.keys(solution.participants).length
        : 0;
    const documentCount = Array.isArray(solution?.documents)
      ? solution.documents.length
      : 0;
    const evaluationCount = Array.isArray(solution?.evaluationDetails)
      ? solution.evaluationDetails.length
      : Number(solution?.numberofTimesEvaluated || 0) || 0;

    const cacheKey = buildSolutionLaunchResourceCacheKey(
      lane,
      locationMode,
      city,
      region,
      country
    );
    const cacheRef = admin
      .firestore()
      .doc(`solutions/${solutionId}/solution_launch_resources/${cacheKey}`);
    const nowIso = new Date().toISOString();
    const nowMs = Date.now();

    const cacheSnap = await cacheRef.get();
    let cache = cacheSnap.exists
      ? (cacheSnap.data() as SolutionLaunchResourceCacheDocument)
      : undefined;

    if (forceRefresh && cacheSnap.exists) {
      await cacheRef.delete().catch(() => null);
      cache = undefined;
    } else if (isSolutionLaunchResourceCacheExpired(cache, nowMs)) {
      await cacheRef.delete().catch(() => null);
      cache = undefined;
    }

    try {
      let resources = normalizeCachedSolutionLaunchResources(
        cache?.resources,
        lane
      );
      let summary = normalizeReachText(cache?.summary, 320);
      let lastSearchedAtIso = normalizeReachText(cache?.lastSearchedAtIso, 80);

      const requestedExcludedIds = forceRefresh && !append ? [] : excludedIds;
      let availableResources = resources.filter(
        (resource) => !requestedExcludedIds.includes(resource.id)
      );
      const maxCacheResources = 80;
      const fetchAttemptsLimit = 2;
      let attempts = 0;

      while (
        availableResources.length < pageSize &&
        resources.length < maxCacheResources &&
        attempts < fetchAttemptsLimit
      ) {
        attempts += 1;

        const searchExcludedIds = Array.from(
          new Set([
            ...requestedExcludedIds,
            ...resources.map((resource) => resource.id),
          ])
        );
        const genAI = new GoogleGenerativeAI(GEMINI_KEY);
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: append ? 0.18 : 0.12,
            maxOutputTokens: pageSize <= 5 ? 4200 : 6500,
          },
          tools: [{ google_search: {} }],
        } as any);

        const prompt = buildSolutionLaunchResourcePrompt({
          lane,
          solutionTitle,
          solutionSummary,
          focusArea,
          category,
          sdgs,
          recruitmentProfile,
          participantCount,
          documentCount,
          evaluationCount,
          city,
          region,
          country,
          locationMode,
          pageSize,
          excludedIds: searchExcludedIds,
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text() || '';
        const parsed = parseSolutionLaunchResourcePayload(text);
        const normalized = parsed.resources
          .map((resource) =>
            normalizeSolutionLaunchResourceCandidate(resource, lane)
          )
          .filter(
            (resource): resource is SolutionLaunchResource => !!resource
          )
          .filter((resource) => !searchExcludedIds.includes(resource.id))
          .slice(0, pageSize * 2);

        const validated = await Promise.all(
          normalized.map(async (resource) => ({
            resource,
            valid: await isUrlUsableForReport(resource.url, 4500),
          }))
        );

        const freshResources = rankSolutionLaunchResourcesForTarget(
          dedupeSolutionLaunchResources(
            validated
              .filter((entry) => entry.valid)
              .map((entry) => entry.resource)
          ),
          {
            locationMode,
            city,
            region,
            country,
          }
        )
          .filter((resource) => !searchExcludedIds.includes(resource.id))
          .slice(0, pageSize);

        if (!freshResources.length) {
          break;
        }

        resources = rankSolutionLaunchResourcesForTarget(
          dedupeSolutionLaunchResources([...resources, ...freshResources]),
          {
            locationMode,
            city,
            region,
            country,
          }
        ).slice(0, maxCacheResources);
        availableResources = resources.filter(
          (resource) => !requestedExcludedIds.includes(resource.id)
        );

        summary =
          normalizeReachText(parsed.summary, 320) ||
          summary ||
          (locationMode === 'global'
            ? `These ${lane} results are ranked globally for fit, credibility, and actionability.`
            : `These ${lane} results are weighted for ${[
                city,
                region,
                country,
              ]
                .filter(Boolean)
                .join(', ')} plus solution fit.`);
        lastSearchedAtIso = new Date().toISOString();
      }

      if (!cache || attempts > 0 || forceRefresh) {
        const nextCache: SolutionLaunchResourceCacheDocument = {
          solutionId,
          lane,
          cacheKey,
          locationMode,
          ...(city ? { city } : {}),
          ...(region ? { region } : {}),
          ...(country ? { country } : {}),
          summary:
            summary ||
            (locationMode === 'global'
              ? `These ${lane} results are ranked globally for fit, credibility, and actionability.`
              : `These ${lane} results are weighted for ${[
                  city,
                  region,
                  country,
                ]
                  .filter(Boolean)
                  .join(', ')} plus solution fit.`),
          resources,
          createdAtIso:
            normalizeReachText(cache?.createdAtIso, 80) || nowIso,
          lastSearchedAtIso: lastSearchedAtIso || nowIso,
          expiresAfterDays: 30,
        };

        await cacheRef.set(stripUndefinedValues(nextCache), { merge: false });
        cache = nextCache;
      }

      availableResources = resources.filter(
        (resource) => !requestedExcludedIds.includes(resource.id)
      );
      const selectedResources = dedupeSolutionLaunchResources(
        locationMode === 'global'
          ? availableResources
          : availableResources.filter(
              (resource) =>
                getSolutionLaunchLocalSignalScore(
                  resource,
                  city,
                  region,
                  country
                ) > 0 && !isGenericGlobalLaunchHost(resource.url)
            )
      ).slice(0, pageSize);
      const locationLabel = locationMode === 'global'
        ? 'global targeting'
        : [city, region, country].filter(Boolean).join(', ');
      const emptySummary = append
        ? `No additional high-quality ${lane} sources were found for ${locationLabel} right now.`
        : `No high-quality ${lane} sources were found for ${locationLabel} right now.`;

      return {
        lane,
        resources: selectedResources,
        summary:
          (!selectedResources.length ? emptySummary : '') ||
          summary ||
          (locationMode === 'global'
            ? `These ${lane} results are ranked globally for fit, credibility, and actionability.`
            : `These ${lane} results are weighted for local relevance and solution fit.`),
        generatedAt:
          normalizeReachText(cache?.lastSearchedAtIso, 80) ||
          lastSearchedAtIso ||
          nowIso,
        hasMore: availableResources.length > pageSize,
        locationMode,
      };
    } catch (error: any) {
      console.error('findSolutionLaunchResources failed', error);
      throw new functions.https.HttpsError(
        'internal',
        error?.message || 'Solution Launch resource lookup failed.'
      );
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
    const workspaceLogo = (data?.logoImage || '').toString().trim();
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
    const safeInviteUrl = escapeHtml(inviteUrl);
    const safeProjectImage = projectImage ? escapeHtml(projectImage) : '';
    const safeWorkspaceLogo = workspaceLogo ? escapeHtml(workspaceLogo) : '';
    const brandLogoUrl = `${APP_BASE_URL.replace(/\/$/, '')}/assets/img/earth-triangle-test.png`;
    
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
  <style>
    @media only screen and (max-width: 640px) {
      .outer-pad { padding: 18px 12px !important; }
      .content-pad { padding: 26px 20px 24px !important; }
      .mobile-full { width: 100% !important; }
      .mobile-button { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
      .mobile-title { font-size: 22px !important; line-height: 1.25 !important; }
      .project-image { max-height: 170px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;">
    <tr>
      <td class="outer-pad" align="center" style="padding: 32px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px; width:100%;">
          
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 0 8px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="${brandLogoUrl}" alt="NewWorld Game" width="42" style="display:block;width:42px;max-width:42px;height:auto;border:0;">
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="font-size:21px;line-height:1.1;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">NewWorld Game</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff; border:1px solid #dbe3ef; border-radius:16px; box-shadow: 0 4px 14px rgba(15,23,42,0.08); overflow:hidden;">
                
                <!-- Project Image (if provided) -->
                ${projectImage ? `
                <tr>
                  <td>
                    <img class="project-image" src="${safeProjectImage}" alt="${safeTitle}" width="600" style="display:block; width:100%; max-height:210px; object-fit:cover; border:0;" />
                  </td>
                </tr>
                ` : ''}
                
                <!-- Content -->
                <tr>
                  <td class="content-pad" style="padding: 36px 38px 32px;">
                    
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

                    ${safeWorkspaceLogo ? `
                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                      <tr>
                        <td style="padding:10px;border:1px solid #dbe3ef;border-radius:14px;background:#ffffff;">
                          <img src="${safeWorkspaceLogo}" alt="${safeTitle} logo" width="72" style="display:block;width:72px;max-width:72px;height:auto;border-radius:12px;border:0;">
                        </td>
                      </tr>
                    </table>
                    ` : ''}
                    
                    <!-- Project Info Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9; border-radius:12px; margin-bottom:28px;">
                      <tr>
                        <td style="padding:24px;">
                          <p style="margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; font-weight:600;">
                            ${typeLabel.toUpperCase()}
                          </p>
                          <h2 class="mobile-title" style="margin:0 0 12px; font-size:22px; color:#0f172a; font-weight:800; line-height:1.25;">
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
                    <table role="presentation" class="mobile-full" cellspacing="0" cellpadding="0" style="margin-bottom:28px;">
                      <tr>
                        <td align="center" style="background:#047857; border-radius:12px;">
                          <a class="mobile-button" href="${safeInviteUrl}" target="_blank" style="display:inline-block; padding:16px 30px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:12px;">
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
        heardAboutUs,
        heardAboutUsOther,
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
          amount = 80000; // $800
        } else if (targetGroup === 'student' || targetGroup === 'senior') {
          amount = 40000; // $400
        }
      } else {
        // Online Lab
        if (targetGroup === 'professional') {
          amount = 25000; // $250
        } else if (targetGroup === 'student' || targetGroup === 'senior') {
          amount = 20000; // $200
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
          heardAboutUs: heardAboutUs || '',
          heardAboutUsOther: heardAboutUsOther || '',
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
        heardAboutUs,
        heardAboutUsOther,
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
        heardAboutUs: heardAboutUs || '',
        heardAboutUsOther: heardAboutUsOther || '',
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
          subject: GSL_2026_CONFIRMATION_SUBJECT,
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
          heardAboutUs: heardAboutUs || '',
          heardAboutUsOther: heardAboutUsOther || '',
          targetGroup: targetGroup,
          labMode,
          letterOfInvitation,
          subject: 'New GSL 2026 Registration (Paid)',
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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildGslRegistrationConfirmationEmail(data: any): {
  subject: string;
  html: string;
  text: string;
} {
  const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  const displayName = fullName || 'Participant';
  const subject =
    (data.subject || '').toString().trim() || GSL_2026_CONFIRMATION_SUBJECT;

  const html = `
    <div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe4ee;border-radius:18px;overflow:hidden;">
        <div style="background:#0f172a;padding:20px 28px;">
          <div style="font-size:22px;font-weight:700;color:#ffffff;">NewWorld Game</div>
        </div>
        <div style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Dear ${escapeHtml(displayName)},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
            Thank you for registering for the 2026 Global Solutions Lab! We are thrilled to have you join us from ${GSL_2026_DATE_RANGE}.
            Get ready for an exciting and transformative experience focused on shaping a sustainable future together!
          </p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
            Stay tuned. More details will be sent your way soon. In the meantime, if you have any questions, feel free to reach out at
            <a href="mailto:${GSL_2026_CONTACT_EMAIL}" style="color:#0f766e;text-decoration:none;">${GSL_2026_CONTACT_EMAIL}</a>.
          </p>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
            We can't wait to see you at GSL 2026.
          </p>
          <p style="margin:0;font-size:16px;line-height:1.7;">
            Best,<br />
            NewWorld Game Team
          </p>
        </div>
      </div>
    </div>
  `.trim();

  const text = [
    'NewWorld Game',
    '',
    `Dear ${displayName},`,
    '',
    `Thank you for registering for the 2026 Global Solutions Lab! We are thrilled to have you join us from ${GSL_2026_DATE_RANGE}. Get ready for an exciting and transformative experience focused on shaping a sustainable future together!`,
    '',
    `Stay tuned. More details will be sent your way soon. In the meantime, if you have any questions, feel free to reach out at ${GSL_2026_CONTACT_EMAIL}.`,
    '',
    "We can't wait to see you at GSL 2026.",
    '',
    'Best,',
    'NewWorld Game Team',
  ].join('\n');

  return { subject, html, text };
}

export const gslRegistrationEmail = functions.https.onCall(
  async (data: any, context: any) => {
    const emailContent = buildGslRegistrationConfirmationEmail(data);
    const msg = {
      to: data.email,
      from: {
        email: 'newworld@newworld-game.org',
        name: 'NewWorld Game',
      },
      replyTo: GSL_2026_CONTACT_EMAIL,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
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
        heard_about_us: data.heardAboutUs || 'N/A',
        heard_about_us_other: data.heardAboutUsOther || 'N/A',
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
  const emailContent = buildGslRegistrationConfirmationEmail(data);
  const msg = {
    to: data.email,
    from: {
      email: 'newworld@newworld-game.org',
      name: 'NewWorld Game',
    },
    replyTo: GSL_2026_CONTACT_EMAIL,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
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
      subject: data.subject || 'New GSL 2026 Registration (Paid)',
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
      heard_about_us: data.heardAboutUs || 'N/A',
      heard_about_us_other: data.heardAboutUsOther || 'N/A',
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

/**
 * Infographic Generation Function
 * Triggered when a document is created in users/{uid}/infographics/{docId}
 * Generates a beautiful visual infographic summarizing the user's strategy
 */
export const onInfographicRequest = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .firestore.document('users/{uid}/infographics/{docId}')
  .onCreate(async (snap) => {
    try {
      const data = snap.data();
      const prompt: string = (data?.prompt || '').trim();
      const solutionTitle: string = data?.solutionTitle || 'Strategy';

      if (!prompt) {
        await snap.ref.update({
          status: { state: 'ERRORED', message: 'No prompt provided' },
        });
        return;
      }

      // Mark as processing
      await snap.ref.update({
        status: { state: 'PROCESSING' },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Step 1: Use a text model to turn the strategy into an infographic brief.
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const strategyText = prompt.slice(0, 4500);

      let infographicBrief = '';
      try {
        const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const cleanupResult = await textModel.generateContent(
          `You are an award-winning information designer. Turn this solution into a concise infographic design brief.

Rules:
- Choose ONE big takeaway sentence.
- Choose ONE structure: timeline, flow, comparison, hierarchy, cycle, map, anatomy, ranking, isotype, or big-number.
- Include a hero visual concept, 3 supporting sections, and one human-scale comparison.
- Use only facts present in the source. If a number is missing, say [VERIFY] rather than inventing it.
- This will become a text-free image. Describe visual metaphors, icons, arrows, shapes, and spatial layout instead of labels.
- Keep it concrete, visual, and concise.
- Return plain text only. No markdown.

${strategyText}

Respond in this shape:
TAKEAWAY: ...
STRUCTURE: ...
HERO VISUAL: ...
SUPPORTING SECTIONS: ...
HUMAN-SCALE COMPARISON: ...
SOURCE NOTE: Current solution draft.`
        );
        infographicBrief = cleanupResult.response.text().trim();
        console.log('Infographic brief:', infographicBrief);
      } catch (cleanupError: any) {
        console.log('Text cleanup failed, using simplified fallback:', cleanupError?.message?.slice(0, 100));
        infographicBrief = `TAKEAWAY: ${solutionTitle} creates a clearer path from problem to action.
STRUCTURE: Flow.
HERO VISUAL: A central pathway from community problem to measurable impact.
SUPPORTING SECTIONS: problem, solution, action steps, outcomes.
HUMAN-SCALE COMPARISON: Use [VERIFY] placeholder comparison only if the source includes numbers.
SOURCE NOTE: Current solution draft.`;
      }

      // Step 2: Create a real infographic prompt. Keep the raster text-free because
      // image models often distort typography; app-rendered text can be added later.
      const infographicPrompt = `Create a magnificent text-free editorial infographic-style visual based on this brief:

${infographicBrief}

Design direction:
- Visually express one clear takeaway without writing it as text.
- One dominant custom hero visual, not generic clip art.
- Clear reading path with 3 supporting visual sections, using arrows, icons, scale, position, and color.
- Include a human-scale comparison as imagery only.
- Cohesive information design inspired by Nicholas Felton, David McCandless, and The Pudding.
- Premium civic/editorial style, crisp grid, generous whitespace, strong hierarchy.
- Palette: paper white, near-black, slate, teal, emerald, one warm amber accent.
- Consistent icon style; flat/vector editorial shapes mixed with polished depth.
- Honest proportions; no 3D charts, no decorative chartjunk.
- ABSOLUTELY NO TEXT: no words, letters, numbers, captions, headings, labels, signs, interface text, pseudo-text, scribbles, charts with axis text, or tiny glyph marks.
- No logos, no watermarks, no fake UI.
- High quality, polished, inspiring, immediately understandable at thumbnail size.`;

      console.log('Generating visual infographic:', {
        title: solutionTitle,
        brief: infographicBrief.slice(0, 300),
      });

      let imgB64 = '';

      // Step 3: Try Gemini image generation first for infographic composition,
      // then fall back to Imagen.
      const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
      for (const modelName of INFOGRAPHIC_IMAGE_MODELS) {
        if (imgB64) break;
        try {
          console.log(`Trying infographic Gemini image model: ${modelName}`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: infographicPrompt,
            config: {
              responseModalities: ['Image'],
              responseFormat: {
                image: {
                  aspectRatio: '16:9',
                  imageSize: '1K',
                },
              },
            },
          } as any);

          imgB64 = getInlineImageBase64(response);
          if (imgB64) {
            console.log(`Infographic generated with ${modelName}`);
          }
        } catch (modelError: any) {
          console.log(`${modelName} failed:`, modelError?.message?.slice(0, 150));
        }
      }

      for (const modelName of INFOGRAPHIC_IMAGEN_MODELS) {
        if (imgB64) break;
        try {
          console.log(`Trying infographic Imagen model: ${modelName}`);
          const imageResult = await ai.models.generateImages({
            model: modelName,
            prompt: infographicPrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '16:9',
              includeRaiReason: true,
            },
          } as any);

          if (imageResult.generatedImages?.[0]?.image?.imageBytes) {
            imgB64 = imageResult.generatedImages[0].image.imageBytes;
            console.log(`Infographic generated with ${modelName}`);
          }
        } catch (modelError: any) {
          console.log(`${modelName} failed:`, modelError?.message?.slice(0, 150));
        }
      }

      if (imgB64) {
        // Upload to Cloud Storage
        const imageBuffer = Buffer.from(imgB64, 'base64');
        const fileName = `infographics/${snap.ref.parent.parent?.id}/${snap.id}.png`;
        const file = bucket.file(fileName);
        const downloadToken = randomUUID();

        await file.save(imageBuffer, {
          metadata: {
            contentType: 'image/png',
            metadata: {
              solutionTitle,
              createdAt: new Date().toISOString(),
              firebaseStorageDownloadTokens: downloadToken,
            },
          },
        });
        // Use Firebase download URL format for better browser compatibility.
        const encodedFileName = encodeURIComponent(fileName);
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFileName}?alt=media&token=${downloadToken}`;

        // Update document with success
        await snap.ref.update({
          status: { state: 'COMPLETED' },
          imageUrl,
          brief: infographicBrief,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('Infographic generated successfully:', imageUrl);
        return;
      }

      // No image generated after all attempts
      await snap.ref.update({
        status: {
          state: 'ERRORED',
          message: 'Image generation is temporarily unavailable. Please try again later.',
        },
      });
    } catch (error: any) {
      console.error('Infographic generation error:', error?.message || error);

      await snap.ref.update({
        status: {
          state: 'ERRORED',
          message: 'Could not generate the infographic. Please try again later.',
        },
      });
    }
  });
