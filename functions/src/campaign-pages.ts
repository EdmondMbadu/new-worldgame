import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { createHash, randomUUID } from 'node:crypto';
import sanitizeHtml = require('sanitize-html');

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
  publishedVersionId?: string;
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

export const getCampaignWebsite = functions.https.onCall(async (data: any, context) => {
  const actor = requireAuth(context);
  const solutionId = cleanText(data?.solutionId, 200);
  const authorization = await authorizeSolution(solutionId, actor);
  const pageSnapshot = await admin.firestore().doc(`campaignPages/${solutionId}`).get();
  const page = pageSnapshot.data() || {};
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
  const bytes = htmlByteLength(html);
  if (!html.trim() || bytes > MAX_HTML_BYTES) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `HTML is required and must be smaller than ${Math.floor(MAX_HTML_BYTES / 1024)} KB.`
    );
  }
  const title =
    cleanText(data?.title, MAX_TITLE_LENGTH) ||
    cleanText(authorization.solution?.title, MAX_TITLE_LENGTH) ||
    'Solution campaign';
  const description = cleanText(data?.description, MAX_DESCRIPTION_LENGTH);
  const requestedSlug = assertValidSlug(data?.slug);
  const sanitizedHtml = sanitizeCampaignHtml(html, title, description);
  const versionId = randomUUID();
  const draftStoragePath = `campaign-drafts/${solutionId}/${versionId}/source.html`;
  await admin.storage().bucket().file(draftStoragePath).save(Buffer.from(html, 'utf8'), {
    contentType: 'text/plain; charset=utf-8',
    resumable: false,
    metadata: { cacheControl: 'private, no-store, max-age=0' },
  });

  const pageRef = admin.firestore().doc(`campaignPages/${solutionId}`);
  const versionRef = pageRef.collection('versions').doc(versionId);
  const previous = (await pageRef.get()).data() || {};
  const now = Date.now();
  const batch = admin.firestore().batch();
  batch.set(
    pageRef,
    {
      campaignId: solutionId,
      solutionId,
      createdByUid: previous['createdByUid'] || actor.uid,
      requestedSlug,
      title,
      description,
      status: previous['status'] || 'draft',
      draftVersionId: versionId,
      draftStoragePath,
      hasUnpublishedChanges: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtMs: now,
    },
    { merge: true }
  );
  batch.set(versionRef, {
    versionId,
    sourceType: cleanText(data?.sourceType, 30) || 'pasted',
    sourceStoragePath: draftStoragePath,
    sourceBytes: bytes,
    sanitizedBytes: htmlByteLength(sanitizedHtml),
    contentHash: contentHash(sanitizedHtml),
    sanitizerVersion: 'gsl-static-html-v1',
    createdByUid: actor.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtMs: now,
    status: 'draft',
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
    html: buffer.toString('utf8'),
    title: cleanText(route.title, MAX_TITLE_LENGTH),
    description: cleanText(route.description, MAX_DESCRIPTION_LENGTH),
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
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.set('Allow', 'GET, HEAD').status(405).send('Method not allowed');
      return;
    }
    const match = request.path.match(/^\/campaigns\/([^/?#]+)\/?$/i);
    const slug = match?.[1] || '';
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
      const etag = `"${campaign.contentHash}"`;
      response.set({
        'Content-Type': 'text/html; charset=utf-8',
        // Keep the CDN useful without allowing an unpublished or updated page
        // to remain stale for more than a minute.
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
      if (request.method === 'HEAD') {
        response.status(200).send();
        return;
      }
      response.status(200).send(campaign.html);
    } catch (error) {
      functions.logger.error('Campaign page delivery failed', { slug, error });
      sendCampaignError(
        response,
        500,
        'Campaign temporarily unavailable',
        'Please try again in a moment.'
      );
    }
  });
