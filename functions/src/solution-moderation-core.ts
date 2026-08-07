import { createHash } from 'node:crypto';

export const MODERATION_POLICY_VERSION = 'gsl-safety-2026-08-07-v1';
export const MODERATION_ENFORCEMENT_EPOCH_MS = Date.UTC(2026, 7, 7, 0, 0, 0);
export const MODERATION_MAX_TEXT_CHARS = 160_000;
export const MODERATION_TEXT_CHUNK_CHARS = 40_000;

export const MODERATION_CATEGORIES = [
  'sexual_minors',
  'explicit_sexual',
  'graphic_violence',
  'violence_promotion',
  'credible_threat',
  'extremism',
  'hate',
  'self_harm',
  'criminal_instructions',
  'privacy_exposure',
  'scam_or_fraud',
  'political_persuasion',
] as const;

export type ModerationCategory = (typeof MODERATION_CATEGORIES)[number];
export type ModerationStatus =
  | 'pending'
  | 'scanning'
  | 'approved'
  | 'needs_review'
  | 'blocked'
  | 'error';
export type PoliticalContentMode =
  | 'allow_neutral_review_partisan'
  | 'review_all'
  | 'block_partisan';

export interface SolutionModerationPolicy {
  version: string;
  reviewThreshold: number;
  autoBlockThreshold: number;
  politicalMode: PoliticalContentMode;
  enabledCategories: Record<ModerationCategory, boolean>;
}

export interface ModerationEvidence {
  category: ModerationCategory;
  field: string;
  excerpt: string;
}

export interface ModerationAssessment {
  scores: Record<ModerationCategory, number>;
  evidence: ModerationEvidence[];
  summary: string;
  imageAssessed: boolean;
}

export interface ModerationDecision {
  status: 'approved' | 'needs_review' | 'blocked';
  reasonCodes: string[];
  topRisks: Array<{ category: ModerationCategory; score: number }>;
}

export interface ModerationTextPayload {
  text: string;
  chunks: string[];
  truncated: boolean;
}

export class ModerationResponseFormatError extends Error {
  constructor(message = 'The moderation model returned an unreadable response.') {
    super(message);
    this.name = 'ModerationResponseFormatError';
  }
}

const HARD_BLOCK_CATEGORIES = new Set<ModerationCategory>([
  'sexual_minors',
  'explicit_sexual',
  'graphic_violence',
  'violence_promotion',
  'credible_threat',
  'extremism',
  'hate',
  'self_harm',
]);

export const DEFAULT_MODERATION_POLICY: SolutionModerationPolicy = {
  version: MODERATION_POLICY_VERSION,
  reviewThreshold: 0.55,
  autoBlockThreshold: 0.9,
  politicalMode: 'allow_neutral_review_partisan',
  enabledCategories: Object.fromEntries(
    MODERATION_CATEGORIES.map((category) => [category, true])
  ) as Record<ModerationCategory, boolean>,
};

const plainText = (value: unknown): string =>
  String(value || '')
    .replace(
      /<(script|style|iframe|object|embed|form|meta|link)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
      ' '
    )
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const timestampMilliseconds = (value: any): number => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = value ? Date.parse(String(value)) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

const publicTextFields = (solution: any): Array<[string, string]> => {
  const fields: Array<[string, string]> = [
    ['title', plainText(solution?.title)],
    ['description', plainText(solution?.description)],
    ['solutionArea', plainText(solution?.solutionArea)],
    ['content', plainText(solution?.content)],
    ['strategyReview', plainText(solution?.strategyReview)],
  ];
  const status = solution?.status;
  if (status && typeof status === 'object' && !Array.isArray(status)) {
    Object.keys(status)
      .sort()
      .forEach((key) => fields.push([`status.${key}`, plainText(status[key])]));
  }
  return fields.filter(([, value]) => Boolean(value));
};

export const buildModerationTextPayload = (
  solution: any
): ModerationTextPayload => {
  const completeText = publicTextFields(solution)
    .map(([field, value]) => `FIELD ${field}:\n${value}`)
    .join('\n\n');
  const truncated = completeText.length > MODERATION_MAX_TEXT_CHARS;
  const text = completeText.slice(0, MODERATION_MAX_TEXT_CHARS);
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += MODERATION_TEXT_CHUNK_CHARS) {
    chunks.push(text.slice(index, index + MODERATION_TEXT_CHUNK_CHARS));
  }
  return { text, chunks: chunks.length ? chunks : ['(No public text yet.)'], truncated };
};

export const buildSolutionModerationContentHash = (solution: any): string => {
  const stablePayload = {
    fields: publicTextFields(solution),
    image: String(solution?.image || '').trim(),
  };
  return createHash('sha256')
    .update(JSON.stringify(stablePayload))
    .digest('hex');
};

export const hasMeaningfulModerationContent = (solution: any): boolean => {
  const title = plainText(solution?.title);
  const bodyLength = publicTextFields(solution)
    .filter(([field]) => field !== 'title')
    .reduce((total, [, value]) => total + value.length, 0);
  return title.length >= 3 && bodyLength >= 40;
};

export const isLegacyModerationExempt = (solution: any): boolean => {
  if (
    solution?.moderation?.status ||
    solution?.moderationLegacyExempt !== true
  ) {
    return false;
  }
  const newestKnownWrite = Math.max(
    timestampMilliseconds(solution?.createdAt),
    timestampMilliseconds(solution?.updatedAt),
    timestampMilliseconds(solution?.lastSubstantiveEditAt),
    timestampMilliseconds(solution?.stepsUpdatedAt),
    timestampMilliseconds(solution?.draftUpdatedAt),
    timestampMilliseconds(solution?.publishedContentUpdatedAt)
  );
  return newestKnownWrite === 0 || newestKnownWrite < MODERATION_ENFORCEMENT_EPOCH_MS;
};

export const hasApprovedCurrentModerationVersion = (solution: any): boolean => {
  if (isLegacyModerationExempt(solution)) return true;
  const moderation = solution?.moderation || {};
  const currentHash = buildSolutionModerationContentHash(solution);
  return (
    moderation.status === 'approved' &&
    moderation.approvedContentHash === currentHash &&
    moderation.contentHash === currentHash
  );
};

const clampScore = (value: unknown): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
};

export const normalizeModerationAssessment = (
  value: Partial<ModerationAssessment> | null | undefined
): ModerationAssessment => {
  const rawScores = value?.scores || ({} as Record<ModerationCategory, number>);
  const scores = Object.fromEntries(
    MODERATION_CATEGORIES.map((category) => [
      category,
      clampScore(rawScores[category]),
    ])
  ) as Record<ModerationCategory, number>;
  const evidence = Array.isArray(value?.evidence)
    ? value.evidence
        .filter((item): item is ModerationEvidence =>
          Boolean(
            item &&
              MODERATION_CATEGORIES.includes(item.category) &&
              item.field
          )
        )
        .slice(0, 12)
        .map((item) => ({
          category: item.category,
          field: plainText(item.field).slice(0, 100),
          excerpt: plainText(item.excerpt).slice(0, 240),
        }))
    : [];
  return {
    scores,
    evidence,
    summary: plainText(value?.summary).slice(0, 600),
    imageAssessed: value?.imageAssessed === true,
  };
};

const hasCompleteModerationScores = (value: any): boolean =>
  Boolean(
    value?.scores &&
      typeof value.scores === 'object' &&
      MODERATION_CATEGORIES.every((category) => {
        const score = Number(value.scores[category]);
        return Number.isFinite(score) && score >= 0 && score <= 1;
      })
  );

/**
 * Accepts valid JSON, fenced JSON, JSON with trailing commas, and a truncated
 * response whose complete score map was emitted before the truncation.
 *
 * Missing category scores are never filled with zero here: doing that could
 * accidentally approve content that the model did not finish assessing.
 */
export const parseModerationAssessmentResponse = (
  responseText: unknown
): ModerationAssessment => {
  const raw = String(responseText || '')
    .replace(/^\uFEFF/, '')
    .trim();
  const unfenced = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const objectStart = unfenced.indexOf('{');
  const objectEnd = unfenced.lastIndexOf('}');
  const candidates = Array.from(
    new Set([
      unfenced,
      objectStart >= 0 && objectEnd > objectStart
        ? unfenced.slice(objectStart, objectEnd + 1)
        : '',
    ])
  ).filter(Boolean);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1'));
      if (hasCompleteModerationScores(parsed)) {
        return normalizeModerationAssessment(parsed);
      }
    } catch {
      // A complete score map can still be recovered below if later output was
      // truncated or surrounded by non-JSON prose.
    }
  }

  const scores = {} as Record<ModerationCategory, number>;
  for (const category of MODERATION_CATEGORIES) {
    const match = unfenced.match(
      new RegExp(
        `["']?${category}["']?\\s*:\\s*(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))`,
        'i'
      )
    );
    const score = Number(match?.[1]);
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      throw new ModerationResponseFormatError();
    }
    scores[category] = score;
  }

  return normalizeModerationAssessment({
    scores,
    evidence: [],
    summary: 'Safety scores recovered from an incomplete structured response.',
    imageAssessed: false,
  });
};

export const normalizeModerationPolicy = (
  value: Partial<SolutionModerationPolicy> | null | undefined
): SolutionModerationPolicy => {
  const reviewThreshold = Math.min(
    0.85,
    Math.max(0.3, Number(value?.reviewThreshold) || DEFAULT_MODERATION_POLICY.reviewThreshold)
  );
  const autoBlockThreshold = Math.min(
    0.99,
    Math.max(
      reviewThreshold + 0.05,
      Number(value?.autoBlockThreshold) || DEFAULT_MODERATION_POLICY.autoBlockThreshold
    )
  );
  const politicalMode: PoliticalContentMode = [
    'allow_neutral_review_partisan',
    'review_all',
    'block_partisan',
  ].includes(String(value?.politicalMode))
    ? (value?.politicalMode as PoliticalContentMode)
    : DEFAULT_MODERATION_POLICY.politicalMode;
  const enabledCategories = Object.fromEntries(
    MODERATION_CATEGORIES.map((category) => [
      category,
      value?.enabledCategories?.[category] !== false,
    ])
  ) as Record<ModerationCategory, boolean>;
  // These severe categories are intentionally non-disableable.
  ['sexual_minors', 'explicit_sexual', 'credible_threat'].forEach((category) => {
    enabledCategories[category as ModerationCategory] = true;
  });
  return {
    version: plainText(value?.version) || MODERATION_POLICY_VERSION,
    reviewThreshold,
    autoBlockThreshold,
    politicalMode,
    enabledCategories,
  };
};

export const decideModeration = (
  assessmentValue: Partial<ModerationAssessment>,
  policyValue: Partial<SolutionModerationPolicy>,
  options: { imageRequired: boolean; textTruncated: boolean }
): ModerationDecision => {
  const assessment = normalizeModerationAssessment(assessmentValue);
  const policy = normalizeModerationPolicy(policyValue);
  const ranked = MODERATION_CATEGORIES
    .filter((category) => policy.enabledCategories[category])
    .map((category) => ({ category, score: assessment.scores[category] }))
    .sort((a, b) => b.score - a.score);
  const reasonCodes: string[] = [];

  if (options.textTruncated) reasonCodes.push('content_too_large');
  if (options.imageRequired && !assessment.imageAssessed) {
    reasonCodes.push('image_not_scanned');
  }

  const hardBlock = ranked.find(
    ({ category, score }) =>
      HARD_BLOCK_CATEGORIES.has(category) && score >= policy.autoBlockThreshold
  );
  const politicalScore = assessment.scores.political_persuasion;
  if (
    policy.enabledCategories.political_persuasion &&
    policy.politicalMode === 'block_partisan' &&
    politicalScore >= policy.autoBlockThreshold
  ) {
    reasonCodes.push('political_persuasion');
    return {
      status: 'blocked',
      reasonCodes: Array.from(new Set(reasonCodes)),
      topRisks: ranked.slice(0, 5),
    };
  }
  if (hardBlock) {
    reasonCodes.push(hardBlock.category);
    return {
      status: 'blocked',
      reasonCodes: Array.from(new Set(reasonCodes)),
      topRisks: ranked.slice(0, 5),
    };
  }

  const reviewRisk = ranked.find(({ score }) => score >= policy.reviewThreshold);
  if (reviewRisk) reasonCodes.push(reviewRisk.category);
  if (
    policy.enabledCategories.political_persuasion &&
    policy.politicalMode === 'review_all' &&
    politicalScore >= Math.min(0.35, policy.reviewThreshold)
  ) {
    reasonCodes.push('political_content');
  }

  return {
    status: reasonCodes.length ? 'needs_review' : 'approved',
    reasonCodes: Array.from(new Set(reasonCodes)),
    topRisks: ranked.slice(0, 5),
  };
};
