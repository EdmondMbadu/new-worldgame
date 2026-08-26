import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'node:crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as sgMail from '@sendgrid/mail';
import sanitizeHtml = require('sanitize-html');
import {
  buildCampaignGenerationPrompt,
  buildDefaultCampaignBrief,
  CampaignGenerationContext,
  CampaignGenerationSettings,
  extractCampaignPlanJson,
  findUnsupportedNumericClaims,
  normalizeCampaignGoal,
  normalizeCampaignPlan,
  renderGeneratedCampaignHtml,
  richTextToPlainText,
} from './campaign-generation';
import { renderCampaignPublicShell } from './campaign-public-shell';

const MAX_HTML_BYTES = 750 * 1024;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 320;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 60;
const APP_BASE_URL =
  ((functions.config() as any)?.app?.base_url as string) ||
  process.env['APP_BASE_URL'] ||
  'https://new-world-game.org';

const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'create',
  'edit',
  'new',
  'power-drc-clinics',
  'preview',
  'settings',
]);

type CampaignRoute = {
  campaignId?: string;
  status?: 'published' | 'unpublished' | 'redirect';
  redirectTo?: string;
  storagePath?: string;
  contentHash?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  supportCount?: number;
  publishedVersionId?: string;
};

type CampaignMetrics = {
  views: number;
  shares: number;
  supporters: number;
  connections: number;
};

const cleanText = (value: unknown, maxLength: number): string =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const normalizeEmail = (value: unknown): string =>
  cleanText(value, 320).toLowerCase();

const escapeHtml = (value: unknown): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const normalizeCampaignSlug = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

const assertValidSlug = (value: unknown): string => {
  const slug = normalizeCampaignSlug(value);
  if (
    slug.length < MIN_SLUG_LENGTH ||
    slug.length > MAX_SLUG_LENGTH ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    RESERVED_SLUGS.has(slug)
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Use 3–60 lowercase letters, numbers, or hyphens. This address may also be reserved.'
    );
  }
  return slug;
};

const documentHead = (title: string, description: string): string => `
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="website">
`;

const ensureHtmlDocument = (
  sanitized: string,
  title: string,
  description: string
): string => {
  const withoutTitle = sanitized.replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '');
  const head = documentHead(title, description);
  let document = withoutTitle;

  if (/<html\b/i.test(document)) {
    if (/<head\b[^>]*>/i.test(document)) {
      document = document.replace(/<head\b[^>]*>/i, (match) => `${match}${head}`);
    } else {
      document = document.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${head}</head>`);
    }
    return `<!doctype html>\n${document}`;
  }

  return `<!doctype html>
<html lang="en">
<head>${head}</head>
<body>${document}</body>
</html>`;
};

export const sanitizeCampaignHtml = (
  source: string,
  title = 'Solution campaign',
  description = ''
): string => {
  const sanitized = sanitizeHtml(String(source || ''), {
    // Static campaign pages need author-provided CSS. Scripts, navigation
    // primitives, forms, and network access are independently disabled below
    // and again by the delivery CSP.
    allowVulnerableTags: true,
    allowedTags: [
      'html', 'head', 'meta', 'title', 'body', 'main', 'header', 'footer', 'nav',
      'section', 'article', 'aside', 'div', 'span', 'p', 'br', 'hr', 'h1', 'h2',
      'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 's', 'small',
      'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'figure',
      'figcaption', 'picture', 'source', 'img', 'a', 'table', 'caption', 'thead',
      'tbody', 'tfoot', 'tr', 'th', 'td', 'colgroup', 'col', 'details', 'summary',
      'time', 'mark', 'sup', 'sub', 'style', 'video', 'audio',
    ],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'role', 'aria-*', 'data-*', 'title'],
      html: ['lang', 'dir'],
      meta: ['charset', 'name', 'content', 'property'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'srcset', 'sizes'],
      source: ['src', 'srcset', 'type', 'media', 'sizes'],
      video: ['src', 'poster', 'controls', 'muted', 'loop', 'playsinline', 'preload'],
      audio: ['src', 'controls', 'loop', 'preload'],
      time: ['datetime'],
      th: ['scope', 'colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      col: ['span'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data'],
      source: ['http', 'https', 'data'],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          ...(attributes['target'] === '_blank'
            ? { rel: 'noopener noreferrer' }
            : {}),
        },
      }),
      img: (_tagName, attributes) => ({
        tagName: 'img',
        attribs: {
          ...attributes,
          loading: attributes['loading'] || 'lazy',
          decoding: attributes['decoding'] || 'async',
        },
      }),
    },
  });

  return ensureHtmlDocument(
    sanitized,
    cleanText(title, MAX_TITLE_LENGTH) || 'Solution campaign',
    cleanText(description, MAX_DESCRIPTION_LENGTH)
  );
};

const contentHash = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

const htmlByteLength = (value: string): number => Buffer.byteLength(value, 'utf8');

const requireAuth = (context: functions.https.CallableContext) => {
  const uid = String(context.auth?.uid || '');
  const email = normalizeEmail(context.auth?.token?.email);
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in to manage a campaign website.');
  }
  return { uid, email };
};

const entryEmail = (entry: any): string =>
  normalizeEmail(
    typeof entry === 'string'
      ? entry
      : entry?.email || entry?.name || entry?.authorEmail || entry?.address
  );

const solutionMemberEmails = (solution: any): Set<string> => {
  const emails = new Set<string>();
  const add = (entry: any) => {
    const email = entryEmail(entry);
    if (email) emails.add(email);
  };
  add(solution?.ownerEmail || solution?.authorEmail);
  [solution?.participants, solution?.participantsHolder, solution?.chosenAdmins].forEach(
    (entries) => {
      if (Array.isArray(entries)) entries.forEach(add);
      else if (entries && typeof entries === 'object') Object.values(entries).forEach(add);
    }
  );
  return emails;
};

const solutionOwnerOrAdmin = (solution: any, uid: string, email: string): boolean => {
  if (
    String(solution?.ownerAccountId || solution?.authorAccountId || '') === uid ||
    normalizeEmail(solution?.ownerEmail || solution?.authorEmail) === email
  ) {
    return true;
  }
  return Array.isArray(solution?.chosenAdmins)
    ? solution.chosenAdmins.some(
        (entry: any) =>
          String(entry?.authorAccountId || entry?.uid || '') === uid ||
          entryEmail(entry) === email
      )
    : false;
};

const platformAdmin = async (uid: string): Promise<boolean> => {
  const snapshot = await admin.firestore().doc(`users/${uid}`).get();
  const user = snapshot.data() || {};
  return user['admin'] === 'true' || user['admin'] === true || user['role'] === 'admin';
};

const authorizeSolution = async (
  solutionId: string,
  actor: { uid: string; email: string }
) => {
  if (!solutionId || solutionId.includes('/')) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid solution is required.');
  }
  const snapshot = await admin.firestore().doc(`solutions/${solutionId}`).get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError('not-found', 'Solution not found.');
  }
  const solution = snapshot.data() || {};
  const isPlatformAdmin = await platformAdmin(actor.uid);
  const canPublish = isPlatformAdmin || solutionOwnerOrAdmin(solution, actor.uid, actor.email);
  const canEdit = canPublish || solutionMemberEmails(solution).has(actor.email);
  if (!canEdit) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only solution team members can edit this campaign website.'
    );
  }
  return { solution, canEdit, canPublish };
};

const campaignLiveUrl = (slug: string): string =>
  `${APP_BASE_URL.replace(/\/$/, '')}/campaigns/${slug}`;

const campaignMetrics = (value: any): CampaignMetrics => ({
  views: Math.max(0, Number(value?.views || 0)),
  shares: Math.max(0, Number(value?.shares || 0)),
  supporters: Math.max(0, Number(value?.supporters || 0)),
  connections: Math.max(0, Number(value?.connections || 0)),
});

const solutionTeamNames = (solution: any): string[] => {
  const names = new Set<string>();
  const add = (entry: any) => {
    const name = cleanText(
      typeof entry === 'string'
        ? entry
        : entry?.name || entry?.displayName || entry?.authorName || entry?.email,
      100
    );
    if (name && !name.includes('@')) names.add(name);
  };
  add(solution?.ownerName || solution?.authorName);
  [solution?.participantsHolder, solution?.chosenAdmins].forEach((entries) => {
    if (Array.isArray(entries)) entries.forEach(add);
  });
  return Array.from(names).slice(0, 12);
};

const solutionStepAnswers = (solution: any): Record<string, string> => {
  const status = solution?.status && typeof solution.status === 'object'
    ? solution.status as Record<string, unknown>
    : {};
  return Object.keys(status)
    .filter((key) => /^S[1-4](?:-|$)/i.test(key))
    .sort()
    .reduce<Record<string, string>>((answers, key) => {
      const answer = String(status[key] || '').trim();
      if (answer) answers[key] = answer;
      return answers;
    }, {});
};

const generationContext = (solution: any): CampaignGenerationContext => {
  const title = cleanText(solution?.title, MAX_TITLE_LENGTH) || 'Solution campaign';
  const description = cleanText(solution?.description, 2000);
  const strategyReview = String(solution?.strategyReview || '');
  const sourceWarning = solution?.strategyReviewSyncStatus === 'attention'
    ? 'Strategy Review may not include the latest changes from Steps 1–4. Review the generated draft carefully.'
    : '';
  return {
    title,
    description,
    strategyReview,
    stepAnswers: solutionStepAnswers(solution),
    sdgs: Array.isArray(solution?.sdgs)
      ? solution.sdgs.map((item: unknown) => cleanText(item, 80)).filter(Boolean).slice(0, 12)
      : [],
    teamNames: solutionTeamNames(solution),
    imageUrl: /^https:\/\//i.test(String(solution?.image || ''))
      ? String(solution.image)
      : '',
    sourceWarning,
  };
};

const persistCampaignDraft = async (input: {
  actor: { uid: string; email: string };
  solutionId: string;
  title: string;
  description: string;
  slug: string;
  html: string;
  sourceType: 'pasted' | 'uploaded' | 'generated';
  generationSettings?: CampaignGenerationSettings;
  generatedPlan?: unknown;
  sourceWarning?: string;
}) => {
  const bytes = htmlByteLength(input.html);
  if (!input.html.trim() || bytes > MAX_HTML_BYTES) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `HTML is required and must be smaller than ${Math.floor(MAX_HTML_BYTES / 1024)} KB.`
    );
  }
  const requestedSlug = assertValidSlug(input.slug);
  const sanitizedHtml = sanitizeCampaignHtml(input.html, input.title, input.description);
  const versionId = randomUUID();
  const draftStoragePath = `campaign-drafts/${input.solutionId}/${versionId}/source.html`;
  await admin.storage().bucket().file(draftStoragePath).save(Buffer.from(input.html, 'utf8'), {
    contentType: 'text/plain; charset=utf-8',
    resumable: false,
    metadata: { cacheControl: 'private, no-store, max-age=0' },
  });

  const pageRef = admin.firestore().doc(`campaignPages/${input.solutionId}`);
  const versionRef = pageRef.collection('versions').doc(versionId);
  const previous = (await pageRef.get()).data() || {};
  const now = Date.now();
  const batch = admin.firestore().batch();
  batch.set(
    pageRef,
    {
      campaignId: input.solutionId,
      solutionId: input.solutionId,
      createdByUid: previous['createdByUid'] || input.actor.uid,
      requestedSlug,
      title: input.title,
      description: input.description,
      status: previous['status'] || 'draft',
      draftVersionId: versionId,
      draftStoragePath,
      draftSourceType: input.sourceType,
      hasUnpublishedChanges: true,
      ...(input.generationSettings ? {
        generationSettings: input.generationSettings,
        sourceWarning: input.sourceWarning || '',
        generatedAtMs: now,
      } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    },
    { merge: true }
  );
  batch.set(versionRef, {
    versionId,
    sourceType: input.sourceType,
    sourceStoragePath: draftStoragePath,
    sourceBytes: bytes,
    sanitizedBytes: htmlByteLength(sanitizedHtml),
    contentHash: contentHash(sanitizedHtml),
    sanitizerVersion: 'gsl-static-html-v1',
    createdByUid: input.actor.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: now,
    status: 'draft',
    ...(input.generationSettings ? {
      generationSettings: input.generationSettings,
      generatedPlan: input.generatedPlan || null,
      sourceWarning: input.sourceWarning || '',
    } : {}),
  });
  await batch.commit();

  return {
    success: true,
    versionId,
    slug: requestedSlug,
    sanitizedHtml,
    sourceBytes: bytes,
    sanitizedBytes: htmlByteLength(sanitizedHtml),
  };
};

export const getCampaignWebsite = functions.https.onCall(async (data: any, context) => {
  const actor = requireAuth(context);
  const solutionId = cleanText(data?.solutionId, 200);
  const authorization = await authorizeSolution(solutionId, actor);
  const pageRef = admin.firestore().doc(`campaignPages/${solutionId}`);
  const pageSnapshot = await pageRef.get();
  const page = pageSnapshot.data() || {};
  const source = generationContext(authorization.solution);
  let html = '';
  const draftStoragePath = String(page['draftStoragePath'] || '');
  if (draftStoragePath) {
    try {
      const [buffer] = await admin.storage().bucket().file(draftStoragePath).download();
      html = buffer.toString('utf8');
    } catch (error) {
      functions.logger.warn('Campaign draft could not be loaded', { solutionId, error });
    }
  }
  const slug = String(page['slug'] || page['requestedSlug'] || '');
  const title =
    cleanText(page['title'] || authorization.solution?.title, MAX_TITLE_LENGTH) ||
    'Solution campaign';
  const description = cleanText(
    page['description'] || authorization.solution?.description,
    MAX_DESCRIPTION_LENGTH
  );
  let recentConnections: Array<Record<string, unknown>> = [];
  try {
    const connections = await pageRef
      .collection('connections')
      .orderBy('createdAtMs', 'desc')
      .limit(8)
      .get();
    recentConnections = connections.docs.map((snapshot) => {
      const connection = snapshot.data() || {};
      return {
        id: snapshot.id,
        name: cleanText(connection['name'], 100),
        email: cleanText(connection['email'], 200),
        reason: cleanText(connection['reason'], 40),
        message: cleanText(connection['message'], 1500),
        createdAtMs: Number(connection['createdAtMs'] || 0),
      };
    });
  } catch (error) {
    functions.logger.warn('Campaign connections could not be loaded', { solutionId, error });
  }
  const storedSettings = page['generationSettings'] && typeof page['generationSettings'] === 'object'
    ? page['generationSettings'] as Record<string, unknown>
    : {};
  return {
    campaignId: solutionId,
    solutionId,
    solutionTitle: cleanText(authorization.solution?.title, MAX_TITLE_LENGTH),
    title,
    description,
    slug,
    html,
    sanitizedHtml: html ? sanitizeCampaignHtml(html, title, description) : '',
    status: String(page['status'] || 'draft'),
    hasUnpublishedChanges: page['hasUnpublishedChanges'] === true,
    canEdit: authorization.canEdit,
    canPublish: authorization.canPublish,
    liveUrl: slug && page['status'] === 'published' ? campaignLiveUrl(slug) : '',
    sourceType: cleanText(page['draftSourceType'], 30) || (html ? 'pasted' : 'generated'),
    generationBrief: cleanText(
      storedSettings['brief'] || buildDefaultCampaignBrief(
        source.title,
        source.description,
        source.strategyReview
      ),
      1200
    ),
    generationGoal: normalizeCampaignGoal(storedSettings['goal']),
    generationTone: cleanText(storedSettings['tone'] || 'Hopeful and credible', 100),
    generationFocusAreas: Array.isArray(storedSettings['focusAreas'])
      ? storedSettings['focusAreas'].map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 8)
      : ['The challenge', 'How it works', 'Community impact'],
    sourceWarning: cleanText(page['sourceWarning'] || source.sourceWarning, 300),
    strategyReviewAvailable: richTextToPlainText(source.strategyReview, 200).length > 0,
    metrics: campaignMetrics(page['metrics']),
    recentConnections,
    updatedAtMs: Number(page['updatedAtMs'] || 0),
    publishedAtMs: Number(page['publishedAtMs'] || 0),
  };
});

export const checkCampaignSlugAvailability = functions.https.onCall(
  async (data: any, context) => {
    const actor = requireAuth(context);
    const solutionId = cleanText(data?.solutionId, 200);
    await authorizeSolution(solutionId, actor);
    const slug = assertValidSlug(data?.slug);
    const snapshot = await admin.firestore().doc(`campaignRoutes/${slug}`).get();
    const route = (snapshot.data() || {}) as CampaignRoute;
    return {
      slug,
      available: !snapshot.exists || route.campaignId === solutionId,
      liveUrl: campaignLiveUrl(slug),
    };
  }
);

export const saveCampaignDraft = functions.https.onCall(async (data: any, context) => {
  const actor = requireAuth(context);
  const solutionId = cleanText(data?.solutionId, 200);
  const authorization = await authorizeSolution(solutionId, actor);
  const html = String(data?.html || '');
  const title =
    cleanText(data?.title, MAX_TITLE_LENGTH) ||
    cleanText(authorization.solution?.title, MAX_TITLE_LENGTH) ||
    'Solution campaign';
  const description = cleanText(data?.description, MAX_DESCRIPTION_LENGTH);
  const requestedSourceType = cleanText(data?.sourceType, 30);
  const sourceType = requestedSourceType === 'uploaded'
    ? 'uploaded'
    : requestedSourceType === 'generated'
      ? 'generated'
      : 'pasted';
  return persistCampaignDraft({
    actor,
    solutionId,
    title,
    description,
    slug: String(data?.slug || ''),
    html,
    sourceType,
  });
});

export const generateCampaignDraft = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(async (data: any, context) => {
    const actor = requireAuth(context);
    const solutionId = cleanText(data?.solutionId, 200);
    const authorization = await authorizeSolution(solutionId, actor);
    const source = generationContext(authorization.solution);
    const goal = normalizeCampaignGoal(data?.goal);
    const settings: CampaignGenerationSettings = {
      brief: cleanText(
        data?.brief || buildDefaultCampaignBrief(
          source.title,
          source.description,
          source.strategyReview
        ),
        1200
      ),
      goal,
      tone: cleanText(data?.tone || 'Hopeful and credible', 100),
      focusAreas: Array.isArray(data?.focusAreas)
        ? data.focusAreas.map((item: unknown) => cleanText(item, 80)).filter(Boolean).slice(0, 8)
        : [],
    };
    if (!settings.brief) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Describe the campaign website you want before generating it.'
      );
    }
    const slug = assertValidSlug(data?.slug || normalizeCampaignSlug(source.title));
    const apiKey = String((functions.config() as any)?.gemini?.key || '').trim();
    if (!apiKey) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Campaign generation is not configured. Add the Gemini API key and try again.'
      );
    }

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.35,
        maxOutputTokens: 7000,
      },
    });
    const prompt = buildCampaignGenerationPrompt(source, settings);
    let result = await model.generateContent(prompt);
    let parsed = extractCampaignPlanJson(result.response.text());
    let plan = normalizeCampaignPlan(parsed, source.title, source.description, goal);
    const sourceText = [
      source.title,
      source.description,
      richTextToPlainText(source.strategyReview),
      ...Object.values(source.stepAnswers).map((answer) => richTextToPlainText(answer)),
    ].join('\n');
    let unsupported = findUnsupportedNumericClaims(plan, sourceText);
    if (unsupported.length) {
      result = await model.generateContent(
        `${prompt}\n\nCORRECTION: A previous draft introduced unsupported numbers (${unsupported.join(', ')}). Regenerate the full JSON and include a number only when the exact number appears in SOURCE MATERIAL.`
      );
      parsed = extractCampaignPlanJson(result.response.text());
      plan = normalizeCampaignPlan(parsed, source.title, source.description, goal);
      unsupported = findUnsupportedNumericClaims(plan, sourceText);
      if (unsupported.length) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'The generated draft included claims that were not grounded in the solution. Please try again.'
        );
      }
    }

    const title = cleanText(data?.title || source.title, MAX_TITLE_LENGTH) || 'Solution campaign';
    const description = cleanText(
      data?.description || plan.metaDescription || source.description,
      MAX_DESCRIPTION_LENGTH
    );
    const html = renderGeneratedCampaignHtml(plan, {
      title,
      slug,
      goal,
      imageUrl: source.imageUrl,
      sdgs: source.sdgs,
    });
    const draft = await persistCampaignDraft({
      actor,
      solutionId,
      title,
      description,
      slug,
      html,
      sourceType: 'generated',
      generationSettings: settings,
      generatedPlan: plan,
      sourceWarning: source.sourceWarning,
    });
    return {
      ...draft,
      title,
      description,
      sourceWarning: source.sourceWarning,
      generationSettings: settings,
    };
  });

export const publishCampaignWebsite = functions.https.onCall(async (data: any, context) => {
  const actor = requireAuth(context);
  const solutionId = cleanText(data?.solutionId, 200);
  const authorization = await authorizeSolution(solutionId, actor);
  if (!authorization.canPublish) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only the solution owner or an administrator can publish this website.'
    );
  }

  const pageRef = admin.firestore().doc(`campaignPages/${solutionId}`);
  const pageSnapshot = await pageRef.get();
  if (!pageSnapshot.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Save a website draft first.');
  }
  const page = pageSnapshot.data() || {};
  const draftVersionId = String(page['draftVersionId'] || '');
  const draftStoragePath = String(page['draftStoragePath'] || '');
  if (!draftVersionId || !draftStoragePath) {
    throw new functions.https.HttpsError('failed-precondition', 'Save a website draft first.');
  }
  const slug = assertValidSlug(data?.slug || page['requestedSlug'] || page['slug']);
  const title = cleanText(page['title'], MAX_TITLE_LENGTH) || 'Solution campaign';
  const description = cleanText(page['description'], MAX_DESCRIPTION_LENGTH);
  const [rawBuffer] = await admin.storage().bucket().file(draftStoragePath).download();
  const sanitizedHtml = sanitizeCampaignHtml(rawBuffer.toString('utf8'), title, description);
  const hash = contentHash(sanitizedHtml);
  const publishedStoragePath = `campaign-published/${solutionId}/${draftVersionId}/index.html`;
  await admin.storage().bucket().file(publishedStoragePath).save(
    Buffer.from(sanitizedHtml, 'utf8'),
    {
      contentType: 'text/html; charset=utf-8',
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000, immutable',
        contentDisposition: 'inline',
        metadata: { contentHash: hash, campaignId: solutionId },
      },
    }
  );

  const now = Date.now();
  await admin.firestore().runTransaction(async (transaction) => {
    const currentPageSnapshot = await transaction.get(pageRef);
    const currentPage = currentPageSnapshot.data() || {};
    if (String(currentPage['draftVersionId'] || '') !== draftVersionId) {
      throw new functions.https.HttpsError(
        'aborted',
        'The draft changed while publishing. Review and publish the newest draft.'
      );
    }
    const routeRef = admin.firestore().doc(`campaignRoutes/${slug}`);
    const routeSnapshot = await transaction.get(routeRef);
    const route = (routeSnapshot.data() || {}) as CampaignRoute;
    if (routeSnapshot.exists && route.campaignId !== solutionId) {
      throw new functions.https.HttpsError(
        'already-exists',
        'That campaign address is already in use.'
      );
    }

    const previousSlug = String(currentPage['slug'] || '');
    if (previousSlug && previousSlug !== slug) {
      const previousRouteRef = admin.firestore().doc(`campaignRoutes/${previousSlug}`);
      transaction.set(
        previousRouteRef,
        {
          campaignId: solutionId,
          status: 'redirect',
          redirectTo: slug,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: now,
        },
        { merge: true }
      );
    }

    transaction.set(routeRef, {
      campaignId: solutionId,
      status: 'published',
      storagePath: publishedStoragePath,
      contentHash: hash,
      title,
      description,
      imageUrl: /^https:\/\//i.test(String(authorization.solution?.image || ''))
        ? String(authorization.solution.image)
        : '',
      supportCount: campaignMetrics(currentPage['metrics']).supporters,
      publishedVersionId: draftVersionId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    });
    transaction.set(
      pageRef,
      {
        slug,
        requestedSlug: slug,
        status: 'published',
        publishedVersionId: draftVersionId,
        publishedStoragePath,
        publishedContentHash: hash,
        hasUnpublishedChanges: false,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedAtMs: now,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtMs: now,
      },
      { merge: true }
    );
    transaction.set(
      pageRef.collection('versions').doc(draftVersionId),
      {
        status: 'published',
        publishedStoragePath,
        contentHash: hash,
        publishedAt: admin.firestore.FieldValue.serverTimestamp(),
        publishedAtMs: now,
      },
      { merge: true }
    );
  });

  return {
    success: true,
    status: 'published',
    slug,
    liveUrl: campaignLiveUrl(slug),
    publishedVersionId: draftVersionId,
  };
});

export const unpublishCampaignWebsite = functions.https.onCall(
  async (data: any, context) => {
    const actor = requireAuth(context);
    const solutionId = cleanText(data?.solutionId, 200);
    const authorization = await authorizeSolution(solutionId, actor);
    if (!authorization.canPublish) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only the solution owner or an administrator can unpublish this website.'
      );
    }
    const pageRef = admin.firestore().doc(`campaignPages/${solutionId}`);
    const now = Date.now();
    await admin.firestore().runTransaction(async (transaction) => {
      const pageSnapshot = await transaction.get(pageRef);
      if (!pageSnapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Campaign website not found.');
      }
      const page = pageSnapshot.data() || {};
      const slug = String(page['slug'] || '');
      transaction.set(
        pageRef,
        {
          status: 'unpublished',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAtMs: now,
        },
        { merge: true }
      );
      if (slug) {
        transaction.set(
          admin.firestore().doc(`campaignRoutes/${slug}`),
          {
            campaignId: solutionId,
            status: 'unpublished',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAtMs: now,
          },
          { merge: true }
        );
      }
    });
    return { success: true, status: 'unpublished' };
  }
);

const loadPublishedCampaign = async (slugInput: unknown) => {
  const slug = normalizeCampaignSlug(slugInput);
  if (!slug) return null;
  const routeSnapshot = await admin.firestore().doc(`campaignRoutes/${slug}`).get();
  if (!routeSnapshot.exists) return null;
  const route = (routeSnapshot.data() || {}) as CampaignRoute;
  if (route.status === 'redirect' && route.redirectTo) {
    return { redirectTo: route.redirectTo };
  }
  if (route.status !== 'published' || !route.storagePath) return null;
  const [buffer] = await admin.storage().bucket().file(route.storagePath).download();
  return {
    slug,
    campaignId: String(route.campaignId || ''),
    html: buffer.toString('utf8'),
    title: cleanText(route.title, MAX_TITLE_LENGTH),
    description: cleanText(route.description, MAX_DESCRIPTION_LENGTH),
    imageUrl: /^https:\/\//i.test(String(route.imageUrl || '')) ? String(route.imageUrl) : '',
    supportCount: Math.max(0, Number(route.supportCount || 0)),
    contentHash: String(route.contentHash || ''),
  };
};

export const getPublishedCampaignWebsite = functions.https.onCall(async (data: any) => {
  const campaign = await loadPublishedCampaign(data?.slug);
  if (!campaign) {
    throw new functions.https.HttpsError('not-found', 'Campaign website not found.');
  }
  return campaign;
});

const campaignVisitorHash = (
  campaignId: string,
  visitorId: unknown,
  request?: functions.Request
): string => {
  const visitor = cleanText(visitorId, 120);
  const forwarded = cleanText(request?.headers['x-forwarded-for'], 120).split(',')[0];
  const address = forwarded || cleanText(request?.ip, 120);
  const agent = cleanText(request?.headers['user-agent'], 240);
  const identity = visitor ? `${visitor}|${address}|${agent}` : `${address}|${agent}`;
  return contentHash(`${campaignId}|${identity}`).slice(0, 40);
};

const notifyCampaignOwner = async (
  campaignId: string,
  campaignSlug: string,
  connection: { name: string; email: string; reason: string; message: string }
): Promise<void> => {
  try {
    const solution = (await admin.firestore().doc(`solutions/${campaignId}`).get()).data() || {};
    const recipient = normalizeEmail(solution['ownerEmail'] || solution['authorEmail']);
    const apiKey = String((functions.config() as any)?.sendgrid?.key || '');
    if (!recipient || !apiKey) return;
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: recipient,
      from: 'newworld@newworld-game.org',
      replyTo: connection.email,
      subject: `${connection.name} wants to connect about your campaign`,
      text: `${connection.name} (${connection.email}) is interested in ${connection.reason}.\n\n${connection.message}\n\nCampaign: ${campaignLiveUrl(campaignSlug)}`,
      html: `<p><strong>${escapeHtml(connection.name)}</strong> (${escapeHtml(connection.email)}) is interested in <strong>${escapeHtml(connection.reason)}</strong>.</p><p>${escapeHtml(connection.message).replace(/\n/g, '<br>')}</p><p><a href="${escapeHtml(campaignLiveUrl(campaignSlug))}">View the published campaign</a></p>`,
    });
  } catch (error) {
    functions.logger.warn('Campaign connection email could not be sent.', {
      campaignId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const campaignEngagement = async (
  campaign: { campaignId?: string; slug?: string; supportCount?: number },
  actionInput: unknown,
  payload: any,
  request?: functions.Request
) => {
  const campaignId = cleanText(campaign.campaignId, 200);
  const action = cleanText(actionInput, 30).toLowerCase();
  if (!campaignId) throw new functions.https.HttpsError('not-found', 'Campaign not found.');
  const pageRef = admin.firestore().doc(`campaignPages/${campaignId}`);
  const routeRef = admin.firestore().doc(`campaignRoutes/${campaign.slug}`);
  const visitorHash = campaignVisitorHash(campaignId, payload?.visitorId, request);
  const now = Date.now();

  if (action === 'view') {
    const visitorRef = pageRef.collection('visitors').doc(visitorHash);
    let recorded = false;
    await admin.firestore().runTransaction(async (transaction) => {
      const visitor = await transaction.get(visitorRef);
      if (visitor.exists) return;
      recorded = true;
      transaction.set(visitorRef, {
        firstSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        firstSeenAtMs: now,
      });
      transaction.update(pageRef, {
        'metrics.views': admin.firestore.FieldValue.increment(1),
      });
    });
    return { success: true, recorded };
  }

  if (action === 'support') {
    const supporterRef = pageRef.collection('supporters').doc(visitorHash);
    let supported = false;
    let supportCount = Math.max(0, Number(campaign.supportCount || 0));
    await admin.firestore().runTransaction(async (transaction) => {
      const [supporter, page] = await Promise.all([
        transaction.get(supporterRef),
        transaction.get(pageRef),
      ]);
      const metrics = campaignMetrics(page.data()?.['metrics']);
      supported = !supporter.exists;
      supportCount = Math.max(0, metrics.supporters + (supported ? 1 : -1));
      if (supported) {
        transaction.set(supporterRef, {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAtMs: now,
        });
      } else {
        transaction.delete(supporterRef);
      }
      transaction.set(pageRef, { metrics: { ...metrics, supporters: supportCount } }, { merge: true });
      transaction.set(routeRef, { supportCount, updatedAtMs: now }, { merge: true });
    });
    return { success: true, supported, supportCount };
  }

  if (action === 'share') {
    const allowedChannels = ['copy', 'native', 'email', 'linkedin', 'facebook', 'x', 'whatsapp'];
    const channel = cleanText(payload?.channel, 30).toLowerCase();
    if (!allowedChannels.includes(channel)) {
      throw new functions.https.HttpsError('invalid-argument', 'Choose a valid sharing channel.');
    }
    const day = new Date().toISOString().slice(0, 10);
    const shareRef = pageRef.collection('shares').doc(`${visitorHash}-${day}-${channel}`);
    let recorded = false;
    await admin.firestore().runTransaction(async (transaction) => {
      const share = await transaction.get(shareRef);
      if (share.exists) return;
      recorded = true;
      transaction.set(shareRef, {
        channel,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: now,
      });
      transaction.update(pageRef, {
        'metrics.shares': admin.firestore.FieldValue.increment(1),
        [`shareChannels.${channel}`]: admin.firestore.FieldValue.increment(1),
      });
    });
    return { success: true, recorded };
  }

  if (action === 'connect') {
    const name = cleanText(payload?.name, 100);
    const email = normalizeEmail(payload?.email);
    const message = cleanText(payload?.message, 1500);
    const allowedReasons = ['partnership', 'funding', 'volunteering', 'pilot', 'feedback'];
    const reason = cleanText(payload?.reason, 40).toLowerCase();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10 || !allowedReasons.includes(reason)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Add your name, a valid email, and a short message before sending.'
      );
    }
    const rateRef = pageRef.collection('connectionRateLimits').doc(visitorHash);
    const connectionRef = pageRef.collection('connections').doc(randomUUID());
    await admin.firestore().runTransaction(async (transaction) => {
      const rate = await transaction.get(rateRef);
      const lastSentAtMs = Number(rate.data()?.['lastSentAtMs'] || 0);
      if (lastSentAtMs && now - lastSentAtMs < 60_000) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Please wait a minute before sending another message.'
        );
      }
      transaction.set(connectionRef, {
        name,
        email,
        reason,
        message,
        status: 'new',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAtMs: now,
      });
      transaction.set(rateRef, { lastSentAtMs: now }, { merge: true });
      transaction.update(pageRef, {
        'metrics.connections': admin.firestore.FieldValue.increment(1),
      });
    });
    await notifyCampaignOwner(campaignId, String(campaign.slug || ''), {
      name,
      email,
      reason,
      message,
    });
    return { success: true };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Choose a valid campaign action.');
};

export const engageCampaignWebsite = functions.https.onCall(async (data: any, context) => {
  const campaign = await loadPublishedCampaign(data?.slug);
  if (!campaign || 'redirectTo' in campaign) {
    throw new functions.https.HttpsError('not-found', 'Campaign not found.');
  }
  return campaignEngagement(campaign, data?.action, data, context.rawRequest);
});

const sendCampaignError = (
  response: functions.Response,
  status: number,
  title: string,
  message: string
) => {
  response.status(status).set({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': status === 404 ? 'public, max-age=60, s-maxage=60' : 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07110f;color:#f7fbf8;font-family:system-ui,sans-serif}.card{max-width:42rem;padding:3rem;text-align:center}a{color:#56d6ad}</style></head><body><main class="card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="/">Return to Global Solutions Lab</a></p></main></body></html>`);
};

export const serveCampaignPage = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (request, response) => {
    const match = request.path.match(
      /^\/campaigns\/([^/?#]+)(?:\/(content|engagement\/(view|support|share|connect)))?\/?$/i
    );
    const slug = match?.[1] || '';
    const subRoute = String(match?.[2] || '').toLowerCase();
    const engagementAction = String(match?.[3] || '').toLowerCase();
    if (!slug) {
      sendCampaignError(response, 404, 'Campaign not found', 'This campaign page is unavailable.');
      return;
    }
    try {
      const campaign = await loadPublishedCampaign(slug);
      if (!campaign) {
        sendCampaignError(
          response,
          404,
          'Campaign not found',
          'This campaign page is unavailable or has not been published yet.'
        );
        return;
      }
      if ('redirectTo' in campaign) {
        response.redirect(301, `/campaigns/${campaign.redirectTo}`);
        return;
      }

      if (engagementAction) {
        if (request.method !== 'POST') {
          response.set('Allow', 'POST').status(405).json({ message: 'Method not allowed.' });
          return;
        }
        const origin = cleanText(request.headers.origin, 300);
        const expectedOrigin = `${request.protocol}://${request.get('host')}`;
        if (origin && origin !== expectedOrigin && origin !== APP_BASE_URL.replace(/\/$/, '')) {
          response.status(403).json({ message: 'This request could not be verified.' });
          return;
        }
        const result = await campaignEngagement(
          campaign,
          engagementAction,
          request.body || {},
          request
        );
        response.set({
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }).status(200).json(result);
        return;
      }

      if (!['GET', 'HEAD'].includes(request.method)) {
        response.set('Allow', 'GET, HEAD').status(405).send('Method not allowed');
        return;
      }

      if (subRoute === 'content') {
        const etag = `"${campaign.contentHash}"`;
        response.set({
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=60, must-revalidate',
          ETag: etag,
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
          'Content-Security-Policy': "default-src 'none'; img-src https: data:; media-src https:; font-src https: data:; style-src 'unsafe-inline' https:; script-src 'none'; connect-src 'none'; frame-src 'none'; frame-ancestors 'self'; object-src 'none'; base-uri 'none'; form-action 'none'",
        });
        if (request.headers['if-none-match'] === etag) {
          response.status(304).send();
          return;
        }
        response.status(200).send(request.method === 'HEAD' ? '' : campaign.html);
        return;
      }

      const nonce = randomUUID().replace(/-/g, '');
      const shell = renderCampaignPublicShell({
        slug: campaign.slug,
        publicUrl: campaignLiveUrl(campaign.slug),
        title: campaign.title || 'Global Solutions Lab campaign',
        description: campaign.description || 'Discover and support this solution.',
        supportCount: campaign.supportCount,
        imageUrl: campaign.imageUrl,
        nonce,
      });
      const etag = `"${contentHash(`${campaign.contentHash}|${campaign.supportCount}`)}"`;
      response.set({
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate',
        ETag: etag,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Content-Security-Policy': `default-src 'none'; img-src https: data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`,
      });
      if (request.headers['if-none-match'] === etag) {
        response.status(304).send();
        return;
      }
      if (request.method === 'HEAD') {
        response.status(200).send();
        return;
      }
      response.status(200).send(shell);
    } catch (error) {
      if (engagementAction) {
        const code = error instanceof functions.https.HttpsError ? error.code : 'internal';
        const status = code === 'invalid-argument'
          ? 400
          : code === 'resource-exhausted'
            ? 429
            : code === 'not-found'
              ? 404
              : 500;
        response.status(status).json({
          message: error instanceof Error ? error.message : 'Please try again.',
        });
        return;
      }
      functions.logger.error('Campaign page delivery failed', { slug, error });
      sendCampaignError(
        response,
        500,
        'Campaign temporarily unavailable',
        'Please try again in a moment.'
      );
    }
  });
