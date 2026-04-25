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
const GOAL_INTRODUCED_ON_MS = new Date(2024, 7, 26).getTime();

type AutomationScheduleKey = 'weeklyReminder' | 'weeklyActivity';

type AutomationScheduleConfig = {
  enabled?: boolean;
  dayOfWeek?: string;
  time?: string;
  recipientEmails?: string[];
  subject?: string;
  introHtml?: string;
  lastRunAt?: any;
  lastRunStatus?: string;
  lastRunSummary?: string;
  lastError?: string;
  lastAttemptKey?: string;
  lastSuccessKey?: string;
};

type WeeklyEmailAutomationDocument = {
  timezone?: string;
  weeklyReminder?: AutomationScheduleConfig;
  weeklyActivity?: AutomationScheduleConfig;
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
  return parseDateToMsForAutomation(solution?.updatedAt);
}

function solutionFallbackMsForAutomation(solution: any): number {
  return parseDateToMsForAutomation(
    solution?.createdAt ?? solution?.creationDate ?? solution?.submissionDate
  );
}

function solutionActivityMsForAutomation(solution: any): number {
  return (
    solutionTrackedEditMsForAutomation(solution) ||
    solutionFallbackMsForAutomation(solution)
  );
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
  const clean = token.replace(/[^a-zA-Z]/g, '');
  if (clean.length < 16) return false;

  const upperCount = (clean.match(/[A-Z]/g) || []).length;
  const lowerCount = (clean.match(/[a-z]/g) || []).length;
  if (upperCount < 4 || lowerCount < 4) return false;

  const upperRatio = upperCount / clean.length;
  return upperRatio > 0.2 && upperRatio < 0.8;
}

function hasSuspiciousNameFormatForAutomation(user: any): boolean {
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  if (!first || !last) return false;

  return (
    isRandomLookingNameTokenForAutomation(first) &&
    isRandomLookingNameTokenForAutomation(last)
  );
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
  if (hasGoalForAutomation(user)) return false;

  const stats =
    statsByEmail.get(normalizeEmailForAutomation(user?.email)) || {
      started: 0,
      submitted: 0,
      lastTrackedEditMs: 0,
    };
  const hasSolutionActivity = stats.started > 0 || stats.submitted > 0;
  if (hasSolutionActivity) return false;

  if (hasSuspiciousNameFormatForAutomation(user)) {
    return true;
  }

  if (isAdminUserForAutomation(user)) return false;

  const joinedAt = parseDateMMDDYYYYForAutomation(String(user?.dateJoined || ''));
  if (!joinedAt) return false;
  return joinedAt >= GOAL_INTRODUCED_ON_MS;
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

  const realUsers = users.filter(
    (user) => !isLikelyBotForAutomation(user, statsByEmail)
  );
  const realUserEmailSet = new Set(
    realUsers
      .map((user) => normalizeEmailForAutomation(user?.email))
      .filter(Boolean)
  );

  const weeklyActiveUsers = realUsers.filter(
    (user) =>
      userActivityMsForAutomation(user, authMaps.byUid, authMaps.byEmail) >=
      windowStartMs
  ).length;
  const previousWeeklyActiveUsers = realUsers.filter((user) => {
    const activityMs = userActivityMsForAutomation(
      user,
      authMaps.byUid,
      authMaps.byEmail
    );
    return activityMs >= previousWeekStartMs && activityMs < windowStartMs;
  }).length;

  const weeklyNewSignups = realUsers.filter(
    (user) =>
      parseDateMMDDYYYYForAutomation(String(user?.dateJoined || '')) >=
      windowStartMs
  ).length;
  const previousWeeklyNewSignups = realUsers.filter((user) => {
    const joinedAt = parseDateMMDDYYYYForAutomation(String(user?.dateJoined || ''));
    return joinedAt >= previousWeekStartMs && joinedAt < windowStartMs;
  }).length;

  const totalOpenSolutions = solutions.filter((solution) => {
    if (solution?.finished === 'true') return false;
    return solutionBelongsToRealUsersForAutomation(solution, realUserEmailSet);
  }).length;

  const weeklyWorkedSolutions = solutions.filter(
    (solution) =>
      solutionBelongsToRealUsersForAutomation(solution, realUserEmailSet) &&
      solutionWorkedInRangeForAutomation(solution, windowStartMs, nowMs)
  ).length;
  const previousWeeklyWorkedSolutions = solutions.filter(
    (solution) =>
      solutionBelongsToRealUsersForAutomation(solution, realUserEmailSet) &&
      solutionWorkedInRangeForAutomation(
        solution,
        previousWeekStartMs,
        windowStartMs
      )
  ).length;

  const weeklyActiveRate =
    realUsers.length > 0
      ? Math.round((weeklyActiveUsers / realUsers.length) * 100)
      : 0;

  const workedSolutions = solutions
    .filter(
      (solution) =>
        solutionBelongsToRealUsersForAutomation(solution, realUserEmailSet) &&
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
    totalRealUsers: realUsers.length,
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
            `Last activity ${formatDateMDYForAutomation(solution.lastActivityMs)}`,
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
                No real-user solutions were worked on during this reporting window.
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
                              ${metricCard('Total Real Users', report.totalRealUsers)}
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
                          A live list of recent solution activity from real users during this reporting window.
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
    if (dueRuns.some((item) => item.key === 'weeklyReminder')) {
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
  country?: string;
  summary?: string;
  people?: ReachLookupPerson[];
  createdAtIso?: string;
  lastSearchedAtIso?: string;
  expiresAfterMonths?: number;
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
    location: location || undefined,
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

const buildReachCacheKey = (city: string, country: string): string => {
  const raw = [city, country]
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
  country: string;
  page: number;
  pageSize: number;
  excludedIds: string[];
}) => {
  const locationLabel =
    params.city && params.country
      ? `${params.city}, ${params.country}`
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
      const concurrency = Math.min(
        Math.max(Number(data.concurrency) || 4, 1),
        6
      );
      const subject = `Weekly NewWorld Game Intelligence Brief (bulk)`;

      // Create the log entry FIRST so we have a single log ID for all batches
      const logRef = await admin.firestore().collection('ai_insights_send_logs').add({
        mode: 'bulk',
        subject,
        createdBy,
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

      // Create the first batch job with the log ID
      const jobRef = await admin.firestore().collection('ai_insights_bulk_jobs').add({
        status: 'queued',
        createdBy,
        recipients,
        concurrency,
        logId: logRef.id,        // Share log ID across all batches
        batchIndex: 0,           // Track which batch this is
        totalRecipients: recipients.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, jobId: jobRef.id, logId: logRef.id };
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
      // Per-recipient substitution: {{unsubscribe_url}} in the HTML template
      // is replaced with each recipient's personal one-click unsubscribe link.
      substitutionWrappers: ['{{', '}}'] as [string, string],
      personalizations: batch.map((email) => ({
        to: [{ email }],
        substitutions: {
          '{{unsubscribe_url}}': `https://newworld-game.org/unsubscribe?e=${encodeURIComponent(email)}`,
        },
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

export const findSolutionReachPeople = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 180, memory: '1GB' })
  .https.onCall(async (data: ReachLookupRequest) => {
    const solutionId = normalizeReachText(data?.solutionId, 120);
    const page = Math.max(Number(data?.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(data?.pageSize) || 10, 1), 10);
    const city = normalizeReachText(data?.city, 120);
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
    const cacheKey = buildReachCacheKey(city, country);
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
            ? `This batch favors people closely aligned to ${solutionTitle} and weighted for ${city}, ${country}.`
            : `This batch favors people closely aligned to ${solutionTitle}.`);
        lastSearchedAtIso = new Date().toISOString();
      }

      if (!cache || attempts > 0) {
        const nextCache: ReachLookupCacheDocument = {
          solutionId,
          cacheKey,
          city: city || undefined,
          country: country || undefined,
          summary:
            summary ||
            (city && country
              ? `This batch favors people closely aligned to ${solutionTitle} and weighted for ${city}, ${country}.`
              : `This batch favors people closely aligned to ${solutionTitle}.`),
          people: cachedPeople,
          createdAtIso:
            normalizeReachText(cache?.createdAtIso, 80) || nowIso,
          lastSearchedAtIso: lastSearchedAtIso || nowIso,
          expiresAfterMonths: 3,
        };

        await cacheRef.set(nextCache, { merge: false });
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
            ? `This batch favors people closely aligned to ${solutionTitle} and weighted for ${city}, ${country}.`
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

      // Step 1: Use text model to extract and clean key concepts
      const genAI = new GoogleGenerativeAI(GEMINI_KEY);
      const strategyText = prompt.slice(0, 2000);

      let cleanedConcepts = '';
      try {
        const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const cleanupResult = await textModel.generateContent(
          `Extract the main concept from this text and describe it in 2-3 simple, clear English sentences. Fix any spelling errors and summarize the core idea. Do not include any special characters or formatting:

${strategyText}

Respond with ONLY the clean summary, nothing else.`
        );
        cleanedConcepts = cleanupResult.response.text().trim();
        console.log('Cleaned concepts:', cleanedConcepts);
      } catch (cleanupError: any) {
        console.log('Text cleanup failed, using simplified fallback:', cleanupError?.message?.slice(0, 100));
        // Fallback: just use the title
        cleanedConcepts = `A solution about: ${solutionTitle}`;
      }

      // Step 2: Create image prompt with cleaned concepts - NO TEXT in image
      const infographicPrompt = `Create a beautiful, professional illustration for this concept:

${cleanedConcepts}

CRITICAL REQUIREMENTS:
- DO NOT include ANY text, words, letters, or numbers in the image
- Pure visual storytelling using illustrations, icons, and imagery only
- Beautiful conceptual scene with people, nature, technology, or abstract shapes
- Professional magazine-quality artistic composition
- Warm, hopeful color palette with teal and emerald green accents
- High quality, detailed, inspiring visual that captures the essence
- The image must be completely text-free`;

      console.log('Generating visual infographic:', {
        title: solutionTitle,
        cleanedConcepts: cleanedConcepts.slice(0, 200),
      });

      let imgB64 = '';

      // Step 3: Try image generation models
      const imageGenModels = [
        'gemini-2.0-flash-exp',                        // Latest experimental
        'gemini-2.0-flash-preview-image-generation',   // Preview with image gen
        'gemini-2.0-flash-exp-image-generation',       // Experimental image gen
        'gemini-2.0-flash-thinking-exp-01-21',         // Thinking model (may have better text)
      ];

      for (const modelName of imageGenModels) {
        if (imgB64) break;
        try {
          console.log(`Trying image generation model: ${modelName}`);
          const modelConfig: Record<string, unknown> = {
            model: modelName,
            generationConfig: {
              responseModalities: ['IMAGE'],
            },
          };
          const model = genAI.getGenerativeModel(modelConfig as any);
          const result = await model.generateContent(infographicPrompt);
          const response = await result.response;

          for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData?.data) {
              imgB64 = part.inlineData.data;
              console.log(`Image generated with ${modelName}`);
              break;
            }
          }
        } catch (modelError: any) {
          console.log(`${modelName} failed:`, modelError?.message?.slice(0, 150));
        }
      }

      // Fallback to Imagen 4
      if (!imgB64) {
        try {
          console.log('Trying Imagen 4 as fallback');
          const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
          const imageResult = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: infographicPrompt,
            config: {
              numberOfImages: 1,
              aspectRatio: '16:9',
            },
          });

          if (imageResult.generatedImages?.[0]?.image?.imageBytes) {
            imgB64 = imageResult.generatedImages[0].image.imageBytes;
            console.log('Image generated with Imagen 4');
          }
        } catch (imagenError: any) {
          console.log('Imagen 4 failed:', imagenError?.message?.slice(0, 150));
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
