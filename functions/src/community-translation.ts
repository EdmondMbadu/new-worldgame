import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { google } from 'googleapis';
import { createHash, randomUUID } from 'node:crypto';

type TranslationTargetLanguage = 'en' | 'fr';
type TranslationView = 'latest' | 'draft' | 'published';
type TranslationMimeType = 'text/html' | 'text/plain';

interface TranslationBlock {
  key: string;
  content: string;
  mimeType: TranslationMimeType;
}

interface CachedTranslation {
  translatedContent: string;
  sourceLanguage: string;
  characterCount: number;
}

interface CacheClaim {
  block: TranslationBlock;
  reference: admin.firestore.DocumentReference;
  state: 'ready' | 'owned' | 'waiting';
  cached?: CachedTranslation;
}

interface TranslationResult {
  translatedContent: string;
  sourceLanguage: string;
}

const TRANSLATION_CACHE_VERSION = 'gct-nmt-v1';
const TRANSLATION_CACHE_LEASE_MS = 90_000;
const TRANSLATION_CACHE_WAIT_MS = 8_000;
const TRANSLATION_CACHE_POLL_MS = 350;
const TRANSLATION_API_BATCH_CODEPOINTS = 24_000;
const TRANSLATION_TEXT_SEGMENT_CODEPOINTS = 4_500;
const TRANSLATION_REQUEST_CODEPOINT_LIMIT = 120_000;
const DEFAULT_USER_DAILY_CODEPOINT_LIMIT = 150_000;
const DEFAULT_GLOBAL_DAILY_CODEPOINT_LIMIT = 500_000;
const DEFAULT_GLOBAL_MONTHLY_CODEPOINT_LIMIT = 2_000_000;

const SOLUTION_ANSWER_KEYS = [
  'S1-A',
  'S1-B',
  'S1-C',
  'S1-D',
  'S2-A',
  'S2-B',
  'S3-A',
  'S3-B',
  'S3-C',
  'S3-D',
  'S3-E',
  'S4-A',
  'S4-B',
  'S4-C',
  'S4-D',
  'S4-E',
  'S4-F',
  'S4-G',
  'S4-H',
  'S4-I',
  'S4-J',
  'S4-K',
  'S4-L',
  'S4-M',
  'S4-N',
] as const;

let translationApi: any;

const normalizeEmail = (value: unknown): string =>
  String(value || '').trim().toLowerCase();

const codePointLength = (value: string): number => Array.from(value).length;

const meaningfulText = (value: unknown): string =>
  String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const envLimit = (name: string, fallback: number): number => {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const userDailyLimit = (): number =>
  envLimit(
    'TRANSLATION_USER_DAILY_CHARACTER_LIMIT',
    DEFAULT_USER_DAILY_CODEPOINT_LIMIT
  );

const globalDailyLimit = (): number =>
  envLimit(
    'TRANSLATION_GLOBAL_DAILY_CHARACTER_LIMIT',
    DEFAULT_GLOBAL_DAILY_CODEPOINT_LIMIT
  );

const globalMonthlyLimit = (): number =>
  envLimit(
    'TRANSLATION_GLOBAL_MONTHLY_CHARACTER_LIMIT',
    DEFAULT_GLOBAL_MONTHLY_CODEPOINT_LIMIT
  );

const translationCacheId = (
  targetLanguage: TranslationTargetLanguage,
  block: TranslationBlock
): string => {
  const digest = createHash('sha256')
    .update(
      `${TRANSLATION_CACHE_VERSION}\0${block.key}\0${block.mimeType}\0${block.content}`,
      'utf8'
    )
    .digest('hex');
  return `${targetLanguage}_${digest}`;
};

const addBlock = (
  blocks: TranslationBlock[],
  key: string,
  value: unknown,
  mimeType: TranslationMimeType
): void => {
  const content = String(value || '').trim();
  if (!content || !meaningfulText(content)) return;
  blocks.push({ key, content, mimeType });
};

const solutionBlocks = (
  solution: any,
  view: TranslationView
): TranslationBlock[] => {
  const blocks: TranslationBlock[] = [];
  addBlock(blocks, 'title', solution?.title, 'text/plain');

  if (view === 'latest') {
    addBlock(blocks, 'description', solution?.description, 'text/html');
    const status = solution?.status || {};
    SOLUTION_ANSWER_KEYS.forEach((answerKey) =>
      addBlock(
        blocks,
        `answer:${answerKey}`,
        status[answerKey],
        'text/html'
      )
    );
  } else if (view === 'draft') {
    addBlock(blocks, 'draft', solution?.strategyReview, 'text/html');
  } else {
    addBlock(blocks, 'published', solution?.content, 'text/html');
    if (!meaningfulText(solution?.content)) {
      addBlock(blocks, 'description', solution?.description, 'text/html');
    }
  }

  return blocks;
};

const solutionEmails = (solution: any): string[] => {
  const emails = new Set<string>();
  const add = (value: any): void => {
    const email = normalizeEmail(
      typeof value === 'string'
        ? value
        : value?.email ||
            value?.name ||
            value?.authorEmail ||
            value?.address
    );
    if (email.includes('@')) emails.add(email);
  };

  add(solution?.authorEmail);
  [solution?.participants, solution?.participantsHolder].forEach((value) => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value && typeof value === 'object') {
      Object.values(value).forEach(add);
    }
  });
  if (Array.isArray(solution?.chosenAdmins)) {
    solution.chosenAdmins.forEach(add);
  }

  return Array.from(emails);
};

const isSolutionMember = (
  solution: any,
  uid: string,
  email: string
): boolean => {
  if (
    solution?.authorAccountId === uid ||
    normalizeEmail(solution?.authorEmail) === email
  ) {
    return true;
  }

  const chosenAdmin = Array.isArray(solution?.chosenAdmins)
    ? solution.chosenAdmins.some(
        (entry: any) =>
          entry?.authorAccountId === uid ||
          normalizeEmail(entry?.authorEmail) === email
      )
    : false;

  return chosenAdmin || solutionEmails(solution).includes(email);
};

const isPlatformAdmin = async (uid: string): Promise<boolean> => {
  const snapshot = await admin.firestore().doc(`users/${uid}`).get();
  const user = snapshot.data() || {};
  return (
    user['admin'] === true ||
    user['admin'] === 'true' ||
    user['role'] === 'admin'
  );
};

const assertSolutionAccess = async (
  solution: any,
  uid: string,
  email: string
): Promise<void> => {
  const isPrivate =
    solution?.isPrivate === true || solution?.communityVisibility === 'private';
  if (!isPrivate || isSolutionMember(solution, uid, email)) return;
  if (await isPlatformAdmin(uid)) return;

  throw new functions.https.HttpsError(
    'permission-denied',
    'You do not have access to translate this solution.'
  );
};

const translationProjectId = (): string => {
  const projectId = String(
    process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      admin.app().options.projectId ||
      ''
  ).trim();
  if (!projectId) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Translation is not configured for this project.'
    );
  }
  return projectId;
};

const getTranslationApi = async (): Promise<any> => {
  if (translationApi) return translationApi;
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-translation'],
  });
  translationApi = google.translate({ version: 'v3', auth });
  return translationApi;
};

const translateContents = async (
  contents: string[],
  mimeType: TranslationMimeType,
  targetLanguage: TranslationTargetLanguage
): Promise<TranslationResult[]> => {
  if (!contents.length) return [];
  const projectId = translationProjectId();
  const api = await getTranslationApi();
  const parent = `projects/${projectId}/locations/global`;

  try {
    const response = await api.projects.locations.translateText({
      parent,
      requestBody: {
        contents,
        mimeType,
        targetLanguageCode: targetLanguage,
        model: `${parent}/models/general/nmt`,
      },
    });
    const translations = response.data.translations || [];
    if (translations.length !== contents.length) {
      throw new Error('Translation response did not contain every block.');
    }
    return translations.map((translation: any) => ({
      translatedContent: String(translation.translatedText || ''),
      sourceLanguage: String(translation.detectedLanguageCode || ''),
    }));
  } catch (error: any) {
    console.error('Cloud Translation request failed', {
      code: error?.code,
      message: error?.message,
      targetLanguage,
      characterCount: contents.reduce(
        (total, content) => total + codePointLength(content),
        0
      ),
    });
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError(
      'unavailable',
      'Translation is temporarily unavailable. Please try again.'
    );
  }
};

const groupByCharacterLimit = <T extends { content: string }>(
  items: T[],
  limit: number
): T[][] => {
  const groups: T[][] = [];
  let current: T[] = [];
  let currentLength = 0;

  items.forEach((item) => {
    const itemLength = codePointLength(item.content);
    if (current.length && currentLength + itemLength > limit) {
      groups.push(current);
      current = [];
      currentLength = 0;
    }
    current.push(item);
    currentLength += itemLength;
  });

  if (current.length) groups.push(current);
  return groups;
};

const splitPlainText = (value: string, limit: number): string[] => {
  if (codePointLength(value) <= limit) return [value];

  const codePoints = Array.from(value);
  const pieces: string[] = [];
  let start = 0;

  while (start < codePoints.length) {
    let end = Math.min(start + limit, codePoints.length);
    if (end < codePoints.length) {
      const candidate = codePoints.slice(start, end).join('');
      const boundary = Math.max(
        candidate.lastIndexOf('. '),
        candidate.lastIndexOf('! '),
        candidate.lastIndexOf('? '),
        candidate.lastIndexOf('\n'),
        candidate.lastIndexOf(' ')
      );
      if (boundary > Math.floor(limit * 0.55)) {
        end = start + Array.from(candidate.slice(0, boundary + 1)).length;
      }
    }
    pieces.push(codePoints.slice(start, end).join(''));
    start = end;
  }

  return pieces;
};

const translateOversizedHtml = async (
  html: string,
  targetLanguage: TranslationTargetLanguage
): Promise<TranslationResult> => {
  const tokens = html.split(/(<!--[\s\S]*?-->|<[^>]+>)/g);
  const textParts: Array<{ tokenIndex: number; partIndex: number; content: string }> =
    [];
  const tokenPieces = new Map<number, string[]>();

  tokens.forEach((token, tokenIndex) => {
    if (!token || token.startsWith('<') || !meaningfulText(token)) return;
    const pieces = splitPlainText(token, TRANSLATION_TEXT_SEGMENT_CODEPOINTS);
    tokenPieces.set(tokenIndex, pieces);
    pieces.forEach((content, partIndex) => {
      textParts.push({ tokenIndex, partIndex, content });
    });
  });

  const translatedParts = new Map<string, TranslationResult>();
  const groups = groupByCharacterLimit(
    textParts,
    TRANSLATION_API_BATCH_CODEPOINTS
  );

  for (const group of groups) {
    const results = await translateContents(
      group.map((part) => part.content),
      'text/plain',
      targetLanguage
    );
    group.forEach((part, index) => {
      translatedParts.set(
        `${part.tokenIndex}:${part.partIndex}`,
        results[index]
      );
    });
  }

  const sourceLanguageWeights = new Map<string, number>();
  tokenPieces.forEach((pieces, tokenIndex) => {
    tokens[tokenIndex] = pieces
      .map((piece, partIndex) => {
        const result = translatedParts.get(`${tokenIndex}:${partIndex}`);
        if (result?.sourceLanguage) {
          sourceLanguageWeights.set(
            result.sourceLanguage,
            (sourceLanguageWeights.get(result.sourceLanguage) || 0) +
              codePointLength(piece)
          );
        }
        return result?.translatedContent || piece;
      })
      .join('');
  });

  const sourceLanguage =
    Array.from(sourceLanguageWeights.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || '';
  return { translatedContent: tokens.join(''), sourceLanguage };
};

const translateOwnedBlocks = async (
  blocks: TranslationBlock[],
  targetLanguage: TranslationTargetLanguage
): Promise<Map<string, TranslationResult>> => {
  const results = new Map<string, TranslationResult>();
  const directHtml = blocks.filter(
    (block) =>
      block.mimeType === 'text/html' &&
      codePointLength(block.content) <= TRANSLATION_API_BATCH_CODEPOINTS
  );
  const directPlain = blocks.filter(
    (block) =>
      block.mimeType === 'text/plain' &&
      codePointLength(block.content) <= TRANSLATION_API_BATCH_CODEPOINTS
  );
  const oversized = blocks.filter(
    (block) =>
      codePointLength(block.content) > TRANSLATION_API_BATCH_CODEPOINTS
  );

  for (const mimeType of ['text/html', 'text/plain'] as const) {
    const candidates = mimeType === 'text/html' ? directHtml : directPlain;
    for (const group of groupByCharacterLimit(
      candidates,
      TRANSLATION_API_BATCH_CODEPOINTS
    )) {
      const translated = await translateContents(
        group.map((block) => block.content),
        mimeType,
        targetLanguage
      );
      group.forEach((block, index) => results.set(block.key, translated[index]));
    }
  }

  for (const block of oversized) {
    if (block.mimeType === 'text/html') {
      results.set(
        block.key,
        await translateOversizedHtml(block.content, targetLanguage)
      );
      continue;
    }

    const pieces = splitPlainText(
      block.content,
      TRANSLATION_TEXT_SEGMENT_CODEPOINTS
    );
    const translatedPieces: TranslationResult[] = [];
    for (const group of groupByCharacterLimit(
      pieces.map((content) => ({ content })),
      TRANSLATION_API_BATCH_CODEPOINTS
    )) {
      translatedPieces.push(
        ...(await translateContents(
          group.map((piece) => piece.content),
          'text/plain',
          targetLanguage
        ))
      );
    }
    results.set(block.key, {
      translatedContent: translatedPieces
        .map((piece) => piece.translatedContent)
        .join(''),
      sourceLanguage:
        translatedPieces.find((piece) => piece.sourceLanguage)
          ?.sourceLanguage || '',
    });
  }

  return results;
};

const claimCache = async (
  solutionReference: admin.firestore.DocumentReference,
  block: TranslationBlock,
  targetLanguage: TranslationTargetLanguage,
  requestId: string
): Promise<CacheClaim> => {
  const cacheReference = solutionReference
    .collection('translationCache')
    .doc(translationCacheId(targetLanguage, block));
  const now = Date.now();

  return admin.firestore().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(cacheReference);
    const cache = snapshot.data() || {};

    if (
      cache['status'] === 'ready' &&
      typeof cache['translatedContent'] === 'string'
    ) {
      return {
        block,
        reference: cacheReference,
        state: 'ready' as const,
        cached: {
          translatedContent: cache['translatedContent'],
          sourceLanguage: String(cache['sourceLanguage'] || ''),
          characterCount: Number(
            cache['characterCount'] || codePointLength(block.content)
          ),
        },
      };
    }

    const leaseUntil =
      cache['leaseExpiresAt']?.toMillis?.() ||
      Number(cache['leaseExpiresAtMs'] || 0);
    if (
      cache['status'] === 'processing' &&
      leaseUntil > now &&
      cache['requestId'] !== requestId
    ) {
      return {
        block,
        reference: cacheReference,
        state: 'waiting' as const,
      };
    }

    transaction.set(
      cacheReference,
      {
        status: 'processing',
        requestId,
        cacheVersion: TRANSLATION_CACHE_VERSION,
        targetLanguage,
        mimeType: block.mimeType,
        blockKey: block.key,
        characterCount: codePointLength(block.content),
        leaseExpiresAt: admin.firestore.Timestamp.fromMillis(
          now + TRANSLATION_CACHE_LEASE_MS
        ),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return {
      block,
      reference: cacheReference,
      state: 'owned' as const,
    };
  });
};

const reserveTranslationUsage = async (
  uid: string,
  characterCount: number
): Promise<void> => {
  if (characterCount <= 0) return;

  const day = new Date().toISOString().slice(0, 10);
  const month = day.slice(0, 7);
  const db = admin.firestore();
  const userReference = db.doc(`translationUsage/${uid}/days/${day}`);
  const globalReference = db.doc(`translationUsageDaily/${day}`);
  const globalMonthlyReference = db.doc(`translationUsageMonthly/${month}`);

  await db.runTransaction(async (transaction) => {
    const [userSnapshot, globalSnapshot, globalMonthlySnapshot] =
      await Promise.all([
        transaction.get(userReference),
        transaction.get(globalReference),
        transaction.get(globalMonthlyReference),
      ]);
    const currentUserCharacters = Number(
      userSnapshot.data()?.['characters'] || 0
    );
    const currentGlobalCharacters = Number(
      globalSnapshot.data()?.['characters'] || 0
    );
    const currentGlobalMonthlyCharacters = Number(
      globalMonthlySnapshot.data()?.['characters'] || 0
    );

    if (currentUserCharacters + characterCount > userDailyLimit()) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Your daily translation limit has been reached. Please try again tomorrow.'
      );
    }
    if (currentGlobalCharacters + characterCount > globalDailyLimit()) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'The translation service has reached today’s safety limit. Please try again tomorrow.'
      );
    }
    if (
      currentGlobalMonthlyCharacters + characterCount >
      globalMonthlyLimit()
    ) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'The translation service has reached this month’s safety limit.'
      );
    }

    const update = {
      characters: admin.firestore.FieldValue.increment(characterCount),
      requests: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    transaction.set(userReference, update, { merge: true });
    transaction.set(globalReference, update, { merge: true });
    transaction.set(globalMonthlyReference, update, { merge: true });
  });
};

const readyCacheValue = (
  snapshot: admin.firestore.DocumentSnapshot
): CachedTranslation | null => {
  const cache = snapshot.data() || {};
  if (
    cache['status'] !== 'ready' ||
    typeof cache['translatedContent'] !== 'string'
  ) {
    return null;
  }
  return {
    translatedContent: cache['translatedContent'],
    sourceLanguage: String(cache['sourceLanguage'] || ''),
    characterCount: Number(cache['characterCount'] || 0),
  };
};

const waitForCache = async (
  claim: CacheClaim
): Promise<CachedTranslation> => {
  const deadline = Date.now() + TRANSLATION_CACHE_WAIT_MS;
  while (Date.now() < deadline) {
    const cached = readyCacheValue(await claim.reference.get());
    if (cached) return cached;
    await new Promise((resolve) =>
      setTimeout(resolve, TRANSLATION_CACHE_POLL_MS)
    );
  }

  throw new functions.https.HttpsError(
    'aborted',
    'This translation is already being prepared. Please try again in a moment.'
  );
};

const primarySourceLanguage = (
  blocks: TranslationBlock[],
  translations: Map<string, CachedTranslation>
): string => {
  const weights = new Map<string, number>();
  blocks.forEach((block) => {
    const language = translations.get(block.key)?.sourceLanguage;
    if (!language) return;
    weights.set(
      language,
      (weights.get(language) || 0) + codePointLength(block.content)
    );
  });
  return (
    Array.from(weights.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  );
};

const translateBlocksWithCache = async (
  solutionReference: admin.firestore.DocumentReference,
  blocks: TranslationBlock[],
  targetLanguage: TranslationTargetLanguage,
  uid: string
): Promise<{
  translations: Record<string, string>;
  sourceLanguage: string;
  alreadyInTargetLanguage: boolean;
  cacheHit: boolean;
}> => {
  const requestId = randomUUID();
  const claims: CacheClaim[] = [];
  for (const block of blocks) {
    claims.push(
      await claimCache(solutionReference, block, targetLanguage, requestId)
    );
  }

  const translatedByKey = new Map<string, CachedTranslation>();
  claims
    .filter((claim) => claim.state === 'ready' && claim.cached)
    .forEach((claim) => translatedByKey.set(claim.block.key, claim.cached!));

  const owned = claims.filter((claim) => claim.state === 'owned');
  if (owned.length) {
    const ownedCharacterCount = owned.reduce(
      (total, claim) => total + codePointLength(claim.block.content),
      0
    );

    try {
      await reserveTranslationUsage(uid, ownedCharacterCount);
      const translated = await translateOwnedBlocks(
        owned.map((claim) => claim.block),
        targetLanguage
      );
      const batch = admin.firestore().batch();
      owned.forEach((claim) => {
        const result = translated.get(claim.block.key);
        if (!result) {
          throw new Error(`Missing translated block ${claim.block.key}.`);
        }
        const cached: CachedTranslation = {
          translatedContent: result.translatedContent,
          sourceLanguage: result.sourceLanguage,
          characterCount: codePointLength(claim.block.content),
        };
        translatedByKey.set(claim.block.key, cached);
        batch.set(
          claim.reference,
          {
            status: 'ready',
            translatedContent: cached.translatedContent,
            sourceLanguage: cached.sourceLanguage,
            characterCount: cached.characterCount,
            provider: 'google-cloud-translation',
            model: 'general/nmt',
            cacheVersion: TRANSLATION_CACHE_VERSION,
            leaseExpiresAt: admin.firestore.FieldValue.delete(),
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    } catch (error) {
      const failureBatch = admin.firestore().batch();
      owned.forEach((claim) =>
        failureBatch.set(
          claim.reference,
          {
            status: 'failed',
            leaseExpiresAt: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
      );
      await failureBatch.commit().catch(() => undefined);
      throw error;
    }
  }

  const waiting = claims.filter((claim) => claim.state === 'waiting');
  const waited = await Promise.all(waiting.map(waitForCache));
  waiting.forEach((claim, index) =>
    translatedByKey.set(claim.block.key, waited[index])
  );

  const sourceLanguage = primarySourceLanguage(blocks, translatedByKey);
  const detectedLanguages = Array.from(translatedByKey.values())
    .map((translation) => translation.sourceLanguage)
    .filter(Boolean);

  return {
    translations: Object.fromEntries(
      blocks.map((block) => [
        block.key,
        translatedByKey.get(block.key)?.translatedContent || block.content,
      ])
    ),
    sourceLanguage,
    alreadyInTargetLanguage:
      detectedLanguages.length > 0 &&
      detectedLanguages.every((language) => language === targetLanguage),
    cacheHit: owned.length === 0,
  };
};

const commentBlock = async (
  solutionReference: admin.firestore.DocumentReference,
  solution: any,
  commentId: string,
  legacyCommentIndex: number | null
): Promise<TranslationBlock> => {
  let comment: any;
  if (commentId) {
    const commentSnapshot = await solutionReference
      .collection('communityComments')
      .doc(commentId)
      .get();
    if (commentSnapshot.exists) {
      comment = commentSnapshot.data();
    } else if (Array.isArray(solution?.comments)) {
      comment = solution.comments.find(
        (entry: any) => String(entry?.messageId || '') === commentId
      );
    }
  } else if (
    legacyCommentIndex !== null &&
    Array.isArray(solution?.comments)
  ) {
    comment = solution.comments[legacyCommentIndex];
  }

  const content = String(comment?.content || '').trim();
  if (!content) {
    throw new functions.https.HttpsError(
      'not-found',
      'This comment is no longer available.'
    );
  }
  return { key: 'comment', content, mimeType: 'text/plain' };
};

export const translateCommunityContent = functions
  .runWith({ timeoutSeconds: 120, memory: '512MB' })
  .https.onCall(
    async (data: any, context: functions.https.CallableContext) => {
      const uid = String(context.auth?.uid || '');
      const email = normalizeEmail(context.auth?.token?.email);
      if (!uid || !email) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'Sign in to translate community content.'
        );
      }

      const solutionId = String(data?.solutionId || '').trim();
      const targetLanguage = String(
        data?.targetLanguage || ''
      ) as TranslationTargetLanguage;
      const contentType = String(data?.contentType || '');
      if (
        !solutionId ||
        !['en', 'fr'].includes(targetLanguage) ||
        !['solution', 'comment'].includes(contentType)
      ) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'A valid solution, content type, and target language are required.'
        );
      }

      const solutionReference = admin
        .firestore()
        .doc(`solutions/${solutionId}`);
      const solutionSnapshot = await solutionReference.get();
      if (!solutionSnapshot.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Solution not found.'
        );
      }
      const solution = solutionSnapshot.data() || {};
      await assertSolutionAccess(solution, uid, email);

      let blocks: TranslationBlock[];
      let view: TranslationView | undefined;
      if (contentType === 'solution') {
        view = String(data?.view || '') as TranslationView;
        if (!['latest', 'draft', 'published'].includes(view)) {
          throw new functions.https.HttpsError(
            'invalid-argument',
            'A valid solution view is required.'
          );
        }
        blocks = solutionBlocks(solution, view);
      } else {
        const legacyIndexValue = Number(data?.legacyCommentIndex);
        const legacyCommentIndex = Number.isInteger(legacyIndexValue)
          ? legacyIndexValue
          : null;
        blocks = [
          await commentBlock(
            solutionReference,
            solution,
            String(data?.commentId || '').trim(),
            legacyCommentIndex
          ),
        ];
      }

      if (!blocks.length) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'There is no text to translate in this view.'
        );
      }
      const requestCharacterCount = blocks.reduce(
        (total, block) => total + codePointLength(block.content),
        0
      );
      if (requestCharacterCount > TRANSLATION_REQUEST_CODEPOINT_LIMIT) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'This view is too large to translate at once.'
        );
      }

      const result = await translateBlocksWithCache(
        solutionReference,
        blocks,
        targetLanguage,
        uid
      );
      return {
        ...result,
        contentType,
        view: view || null,
        targetLanguage,
      };
    }
  );
