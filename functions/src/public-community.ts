import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { hasApprovedCurrentModerationVersion } from './solution-moderation-core';

type CommunityFilter = 'all' | 'in-development' | 'submitted';

const PUBLIC_FEED_PAGE_SIZE = 18;
const PUBLIC_FEED_MAX_PAGE_SIZE = 24;
const PUBLIC_FEED_FALLBACK_SCAN_LIMIT = 1000;
const PUBLIC_PREVIEW_COMMENT_LIMIT = 200;
const PUBLIC_TEXT_LIMIT = 500;
const PUBLIC_DESCRIPTION_LIMIT = 20_000;
const PUBLIC_RICH_TEXT_LIMIT = 250_000;
const PUBLIC_READ_RATE_WINDOW_MS = 60_000;
const PUBLIC_READ_RATE_LIMIT = 120;
const publicReadRateWindows = new Map<
  string,
  { windowStartedAt: number; count: number }
>();

const enforcePublicReadRateLimit = (
  context: functions.https.CallableContext,
  operation: 'feed' | 'preview'
): void => {
  const forwarded = String(
    context.rawRequest.headers['x-forwarded-for'] || ''
  )
    .split(',')[0]
    .trim();
  const client = forwarded || context.rawRequest.ip || 'unknown';
  const key = `${operation}:${client}`;
  const now = Date.now();
  const current = publicReadRateWindows.get(key);
  if (!current || now - current.windowStartedAt >= PUBLIC_READ_RATE_WINDOW_MS) {
    publicReadRateWindows.set(key, { windowStartedAt: now, count: 1 });
  } else {
    current.count += 1;
    if (current.count > PUBLIC_READ_RATE_LIMIT) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Too many community requests. Please try again shortly.'
      );
    }
  }

  if (publicReadRateWindows.size > 5000) {
    for (const [entryKey, entry] of publicReadRateWindows.entries()) {
      if (now - entry.windowStartedAt >= PUBLIC_READ_RATE_WINDOW_MS) {
        publicReadRateWindows.delete(entryKey);
      }
    }
  }
};

const safePlainText = (value: unknown, maxLength = PUBLIC_TEXT_LIMIT): string =>
  String(value || '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);

const safeRichText = (
  value: unknown,
  maxLength = PUBLIC_RICH_TEXT_LIMIT
): string =>
  String(value || '')
    .replace(
      /<(script|style|iframe|object|embed|form|meta|link)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      ''
    )
    .replace(/<(script|style|iframe|object|embed|form|meta|link)\b[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(
      /\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,
      ' $1="#"'
    )
    .trim()
    .slice(0, maxLength);

const safePublicUrl = (value: unknown): string => {
  const url = String(value || '').trim();
  if (!url || url.length > 4096) return '';
  if (
    /^https?:\/\//i.test(url) ||
    /^\/?assets\//i.test(url) ||
    /^\.{1,2}\/.*assets\//i.test(url)
  ) {
    return url;
  }
  return '';
};

const publicFeedExcerpt = (value: unknown): string =>
  safeRichText(value, PUBLIC_DESCRIPTION_LIMIT)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1200);

const milliseconds = (value: any): number => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = value ? Date.parse(String(value)) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isCommunityVisible = (solution: any): boolean =>
  solution?.feedEligible === true &&
  solution?.isPrivate === false &&
  solution?.communityVisibility !== 'private' &&
  hasApprovedCurrentModerationVersion(solution);

const publicDesignerCount = (solution: any): number => {
  const designers = new Set<string>();
  const add = (value: unknown) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      designers.add(normalized);
    }
  };

  if (Array.isArray(solution?.participants)) {
    solution.participants.forEach((entry: any) =>
      add(typeof entry === 'string' ? entry : entry?.name || entry?.email)
    );
  } else if (solution?.participants && typeof solution.participants === 'object') {
    Object.entries(solution.participants).forEach(([key, entry]: [string, any]) => {
      add(key);
      add(entry?.name || entry?.email || entry);
    });
  }

  return designers.size;
};

const publicProgress = (solution: any): number => {
  if (solution?.finished === 'true') return 100;
  const answers = Object.entries(solution?.status || {}).filter(
    ([key, value]) =>
      /^S[1-4]-[A-N]$/.test(key) &&
      safeRichText(value, 10_000).replace(/<[^>]*>/g, '').trim().length > 15
  ).length;
  const supporting = [
    solution?.description,
    solution?.strategyReview,
    solution?.content,
  ].filter(
    (value) =>
      safeRichText(value, 10_000).replace(/<[^>]*>/g, '').trim().length > 30
  ).length;
  return Math.min(90, Math.max(10, (answers + supporting) * 10));
};

const publicOwnerName = (solution: any): string =>
  safePlainText(solution?.ownerName, 160) ||
  safePlainText(solution?.authorName, 160) ||
  'Solution team';

export const publicFeedSolution = (
  document: Pick<admin.firestore.DocumentSnapshot, 'id' | 'data'>
): Record<string, unknown> => {
  const solution = document.data() || {};
  const feedUpdatedAtMs =
    milliseconds(solution['feedUpdatedAt']) ||
    milliseconds(solution['lastSubstantiveEditAt']) ||
    milliseconds(solution['updatedAt']) ||
    milliseconds(solution['submissionDate']) ||
    milliseconds(solution['creationDate']);

  return {
    solutionId: document.id,
    title: safePlainText(solution['title'], 240),
    description: publicFeedExcerpt(
      solution['description'] ||
        solution['strategyReview'] ||
        solution['content']
    ),
    image: safePublicUrl(solution['image']),
    // Keep the public field name for older clients, but attribute the solution
    // to its current owner after a handoff.
    authorName: publicOwnerName(solution),
    finished: solution['finished'] === 'true' ? 'true' : 'false',
    statusForPublication:
      solution['statusForPublication'] === 'approved' ? 'approved' : 'pending',
    category: safePlainText(solution['category'], 120),
    submissionDate: safePlainText(solution['submissionDate'], 80),
    numLike: String(Math.max(0, Number(solution['numLike'] || 0))),
    feedStatus:
      solution['feedStatus'] === 'submitted' || solution['finished'] === 'true'
        ? 'submitted'
        : 'in-development',
    feedUpdatedAtMs,
    commentCount: Math.max(
      0,
      Number(solution['commentCount'] || solution['comments']?.length || 0)
    ),
    publicDesignerCount: publicDesignerCount(solution),
    // Kept for older clients; its meaning is now designers, not every role.
    publicMemberCount: publicDesignerCount(solution),
    publicProgress: publicProgress(solution),
  };
};

/**
 * Keeps the public home feed on a deliberately small, sanitized collection.
 *
 * The home screen can read this projection directly without waiting for a
 * callable function container to start. Full solution content remains in the
 * protected `solutions` collection and is still served through the public
 * preview callable.
 */
export const syncPublicCommunitySolutionFeed = functions.firestore
  .document('solutions/{solutionId}')
  .onWrite(async (change, context) => {
    const publicReference = admin
      .firestore()
      .doc(`publicCommunitySolutions/${context.params.solutionId}`);

    if (
      !change.after.exists ||
      !isCommunityVisible(change.after.data())
    ) {
      await publicReference.delete();
      return;
    }

    await publicReference.set(publicFeedSolution(change.after), {
      merge: false,
    });
  });

const publicStatus = (value: any): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => /^S[1-4]-[A-N]$/.test(key))
      .map(([key, content]) => [key, safeRichText(content)])
      .filter(([, content]) => Boolean(content))
  );
};

const publicEvaluationSummary = (value: any): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const allowed = [
    'average',
    'achievable',
    'feasible',
    'ecological',
    'economical',
    'equitable',
    'understandable',
  ];
  return Object.fromEntries(
    allowed
      .map((key) => [key, safePlainText(value[key], 32)])
      .filter(([, content]) => Boolean(content))
  );
};

const publicSdgs = (value: any): string[] =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => safePlainText(item, 8))
            .filter((item) => /^(?:[1-9]|1[0-7])$/.test(item))
        )
      )
    : [];

const publicComment = (
  value: any,
  fallbackId: string
): Record<string, unknown> | null => {
  const content = safePlainText(value?.content, 3000);
  if (!content) return null;
  const createdAtMs =
    Number(value?.createdAtMs || 0) ||
    milliseconds(value?.createdAt) ||
    milliseconds(value?.date);

  return {
    messageId: safePlainText(value?.messageId, 200) || fallbackId,
    authorName:
      safePlainText(value?.authorName, 160) || 'Global Solutions Lab member',
    authorAvatar: safePublicUrl(value?.authorAvatar || value?.profilePic),
    content,
    date: createdAtMs ? new Date(createdAtMs).toISOString() : '',
    createdAtMs,
  };
};

const publicPreviewSolution = (
  solutionId: string,
  solution: any,
  comments: Record<string, unknown>[],
  hasMoreComments: boolean
): Record<string, unknown> => ({
  solutionId,
  title: safePlainText(solution?.title, 240),
  description: safeRichText(solution?.description, PUBLIC_DESCRIPTION_LIMIT),
  image: safePublicUrl(solution?.image),
  authorName: publicOwnerName(solution),
  content: safeRichText(solution?.content),
  strategyReview: safeRichText(solution?.strategyReview),
  status: publicStatus(solution?.status),
  finished: solution?.finished === 'true' ? 'true' : 'false',
  edited: solution?.edited === 'true' ? 'true' : 'false',
  creationDate: safePlainText(solution?.creationDate, 80),
  submissionDate: safePlainText(solution?.submissionDate, 80),
  stepsUpdatedAt: milliseconds(solution?.stepsUpdatedAt),
  draftUpdatedAt: milliseconds(solution?.draftUpdatedAt),
  publishedContentUpdatedAt: milliseconds(solution?.publishedContentUpdatedAt),
  sdgs: publicSdgs(solution?.sdgs),
  evaluationSummary: publicEvaluationSummary(solution?.evaluationSummary),
  numberofTimesEvaluated: safePlainText(solution?.numberofTimesEvaluated, 16),
  numLike: String(
    Math.max(0, Number(solution?.numLike || solution?.likes?.length || 0))
  ),
  numShare: String(Math.max(0, Number(solution?.numShare || 0))),
  tournament: solution?.tournament === 'true' ? 'true' : 'false',
  winner: solution?.winner === 'true' ? 'true' : 'false',
  publicDesignerCount: publicDesignerCount(solution),
  publicMemberCount: publicDesignerCount(solution),
  comments,
  commentCount: Math.max(
    comments.length,
    Number(solution?.commentCount || solution?.comments?.length || 0)
  ),
  hasMoreComments,
});

const validatedFilter = (value: unknown): CommunityFilter => {
  const filter = String(value || 'all');
  if (
    filter !== 'all' &&
    filter !== 'in-development' &&
    filter !== 'submitted'
  ) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The requested community filter is not supported.'
    );
  }
  return filter;
};

export const getPublicCommunitySolutions = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data: any, context) => {
    enforcePublicReadRateLimit(context, 'feed');
    const filter = validatedFilter(data?.filter);
    const requestedPageSize = Number(data?.pageSize || PUBLIC_FEED_PAGE_SIZE);
    const pageSize = Math.min(
      PUBLIC_FEED_MAX_PAGE_SIZE,
      Math.max(6, Number.isFinite(requestedPageSize) ? requestedPageSize : 18)
    );
    const cursorUpdatedAtMs = Math.max(
      0,
      Number(data?.cursorUpdatedAtMs || 0)
    );
    const db = admin.firestore();

    let documents: admin.firestore.QueryDocumentSnapshot[] = [];
    try {
      let query: admin.firestore.Query = db
        .collection('solutions')
        .where('feedEligible', '==', true)
        .where('isPrivate', '==', false);
      if (filter !== 'all') {
        query = query.where('feedStatus', '==', filter);
      }
      query = query.orderBy('feedUpdatedAt', 'desc');
      if (cursorUpdatedAtMs) {
        query = query.startAfter(
          admin.firestore.Timestamp.fromMillis(cursorUpdatedAtMs)
        );
      }
      const snapshot = await query.limit(pageSize + 1).get();
      documents = snapshot.docs;
    } catch (error: any) {
      if (error?.code !== 9 && error?.code !== 'failed-precondition') {
        console.error('Public community feed query failed', error);
        throw new functions.https.HttpsError(
          'unavailable',
          'Community solutions are temporarily unavailable.'
        );
      }

      const fallback = await db
        .collection('solutions')
        .where('isPrivate', '==', false)
        .limit(PUBLIC_FEED_FALLBACK_SCAN_LIMIT)
        .get();
      documents = fallback.docs
        .filter((document) => {
          const solution = document.data();
          const updatedAt =
            milliseconds(solution['feedUpdatedAt']) ||
            milliseconds(solution['updatedAt']);
          return (
            isCommunityVisible(solution) &&
            (filter === 'all' || solution['feedStatus'] === filter) &&
            (!cursorUpdatedAtMs || updatedAt < cursorUpdatedAtMs)
          );
        })
        .sort((a, b) => {
          const aTime =
            milliseconds(a.data()['feedUpdatedAt']) ||
            milliseconds(a.data()['updatedAt']);
          const bTime =
            milliseconds(b.data()['feedUpdatedAt']) ||
            milliseconds(b.data()['updatedAt']);
          return bTime - aTime;
        })
        .slice(0, pageSize + 1);
    }

    const visible = documents
      .filter((document) => isCommunityVisible(document.data()))
      .slice(0, pageSize);
    const solutions = visible.map(publicFeedSolution);
    const last = solutions[solutions.length - 1] as
      | { feedUpdatedAtMs?: number }
      | undefined;

    return {
      solutions,
      cursorUpdatedAtMs: Number(last?.feedUpdatedAtMs || 0) || null,
      hasMore: documents.length > pageSize,
    };
  });

export const getPublicCommunitySolution = functions
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onCall(async (data: any, context) => {
    enforcePublicReadRateLimit(context, 'preview');
    const solutionId = String(data?.solutionId || '').trim();
    if (
      !solutionId ||
      solutionId.length > 200 ||
      solutionId.includes('/') ||
      solutionId === '.' ||
      solutionId === '..'
    ) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'A valid solution is required.'
      );
    }

    const db = admin.firestore();
    const solutionReference = db.doc(`solutions/${solutionId}`);
    const solutionSnapshot = await solutionReference.get();
    if (!solutionSnapshot.exists || !isCommunityVisible(solutionSnapshot.data())) {
      // Do not reveal whether a private solution exists.
      throw new functions.https.HttpsError(
        'not-found',
        'This community solution is not available.'
      );
    }

    const solution = solutionSnapshot.data() || {};
    const currentCommentsSnapshot = await solutionReference
      .collection('communityComments')
      .orderBy('createdAtMs', 'desc')
      .limit(PUBLIC_PREVIEW_COMMENT_LIMIT + 1)
      .get();
    const hasMoreComments =
      currentCommentsSnapshot.docs.length > PUBLIC_PREVIEW_COMMENT_LIMIT;
    const currentComments = currentCommentsSnapshot.docs
      .slice(0, PUBLIC_PREVIEW_COMMENT_LIMIT)
      .map((document) =>
        publicComment(
          { ...document.data(), messageId: document.id },
          document.id
        )
      )
      .filter(
        (comment): comment is Record<string, unknown> => comment !== null
      );
    const legacyComments = Array.isArray(solution['comments'])
      ? solution['comments']
          .map((comment: any, index: number) =>
            publicComment(comment, `legacy-${index}`)
          )
          .filter(
            (comment: Record<string, unknown> | null): comment is Record<
              string,
              unknown
            > => comment !== null
          )
      : [];
    const deduplicated = new Map<string, Record<string, unknown>>();
    [...legacyComments, ...currentComments].forEach((comment) => {
      deduplicated.set(String(comment['messageId']), comment);
    });
    const comments = Array.from(deduplicated.values())
      .sort(
        (a, b) =>
          Number(a['createdAtMs'] || 0) - Number(b['createdAtMs'] || 0)
      )
      .slice(-PUBLIC_PREVIEW_COMMENT_LIMIT);

    return {
      solution: publicPreviewSolution(
        solutionId,
        solution,
        comments,
        hasMoreComments || deduplicated.size > PUBLIC_PREVIEW_COMMENT_LIMIT
      ),
    };
  });
