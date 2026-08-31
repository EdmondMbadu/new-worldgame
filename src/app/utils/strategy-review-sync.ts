export type StrategyReviewStepKey = 'S1' | 'S2' | 'S3' | 'S4';

export type StrategyReviewResolution =
  | 'keep-review'
  | 'use-steps'
  | 'combine';

export interface StrategyReviewSyncMetadata {
  version: 1;
  baseAnswerFingerprints: Record<string, string>;
  baseStepFingerprints: Partial<Record<StrategyReviewStepKey, string>>;
  lastReviewedStepsHash: string;
  sourceSnapshotHash?: string;
  pendingConflictStepKeys?: StrategyReviewStepKey[];
  reconciliationRecoveryCreated?: boolean;
  lastOutcome:
    | 'generated'
    | 'auto-updated'
    | 'merged'
    | 'kept-review'
    | 'replaced'
    | 'restored'
    | 'initialized';
  updatedAt?: unknown;
}

export interface StrategyReviewConflict {
  stepKey: StrategyReviewStepKey;
  stepNumber: number;
  stepTitle: string;
  changedAnswerKeys: string[];
  removedAnswerKeys: string[];
  previousSourceHtml: string;
  currentSourceHtml: string;
  changedSourceHtml: string;
  currentDraftHtml: string;
  legacy: boolean;
}

export interface StrategyReviewReconciliation {
  state: 'aligned' | 'auto-updated' | 'attention';
  draftHtml: string;
  conflicts: StrategyReviewConflict[];
  changedAnswerKeys: string[];
  nextMetadata: StrategyReviewSyncMetadata;
  legacy: boolean;
}

interface StrategyReviewSectionRange {
  stepKey: StrategyReviewStepKey;
  stepNumber: number;
  start: number;
  end: number;
  html: string;
}

const STEP_KEYS: StrategyReviewStepKey[] = ['S1', 'S2', 'S3', 'S4'];

const STEP_TITLES: Record<StrategyReviewStepKey, string> = {
  S1: 'Problem State',
  S2: 'Preferred State',
  S3: 'Plan',
  S4: 'Implementation',
};

const STEP_HEADING_ALIASES: Record<StrategyReviewStepKey, string[]> = {
  S1: ['problem state', 'état du problème'],
  S2: ['preferred state', 'état souhaité'],
  S3: ['plan'],
  S4: ['implementation', 'mise en oeuvre', 'mise en œuvre'],
};

export function strategyReviewSourceAnswers(
  status: Record<string, string> | undefined
): Record<string, string> {
  if (!status) {
    return {};
  }

  return Object.keys(status)
    .filter((key) => /^S[1-4](?:-|$)/i.test(key))
    .sort(compareAnswerKeys)
    .reduce<Record<string, string>>((answers, key) => {
      answers[key] = String(status[key] ?? '');
      return answers;
    }, {});
}

export function strategyReviewStepsHash(
  answers: Record<string, string>
): string {
  return fingerprintsHash(answerFingerprints(answers));
}

function fingerprintsHash(fingerprints: Record<string, string>): string {
  const serialized = Object.keys(fingerprints)
    .sort(compareAnswerKeys)
    .map((key) => `${key}\u001f${fingerprints[key]}`)
    .join('\u001e');

  return hashString(serialized);
}

export function createStrategyReviewSyncMetadata(
  status: Record<string, string> | undefined,
  outcome: StrategyReviewSyncMetadata['lastOutcome'],
  headings: Partial<Record<StrategyReviewStepKey, string>> = {}
): StrategyReviewSyncMetadata {
  const answers = strategyReviewSourceAnswers(status);
  const baseAnswerFingerprints = answerFingerprints(answers);
  return {
    version: 1,
    baseAnswerFingerprints,
    baseStepFingerprints: stepFingerprints(answers, headings),
    lastReviewedStepsHash: fingerprintsHash(baseAnswerFingerprints),
    sourceSnapshotHash: fingerprintsHash(baseAnswerFingerprints),
    pendingConflictStepKeys: [],
    reconciliationRecoveryCreated: false,
    lastOutcome: outcome,
  };
}

export function buildStrategyReviewFromSteps(
  status: Record<string, string> | undefined,
  headings: Partial<Record<StrategyReviewStepKey, string>> = {}
): string {
  const answers = strategyReviewSourceAnswers(status);
  return STEP_KEYS.map((stepKey) =>
    buildSourceSection(stepKey, answers, headings)
  )
    .filter(Boolean)
    .join('\n');
}

export function reconcileStrategyReview(
  status: Record<string, string> | undefined,
  draftHtml: string,
  metadata: StrategyReviewSyncMetadata | undefined,
  headings: Partial<Record<StrategyReviewStepKey, string>> = {}
): StrategyReviewReconciliation {
  const currentAnswers = strategyReviewSourceAnswers(status);
  const currentSourceHash = strategyReviewStepsHash(currentAnswers);
  const legacy = !metadata;

  if (!draftHtml.trim()) {
    const generatedDraft = buildStrategyReviewFromSteps(status, headings);
    return {
      state: generatedDraft ? 'auto-updated' : 'aligned',
      draftHtml: generatedDraft,
      conflicts: [],
      changedAnswerKeys: Object.keys(currentAnswers),
      nextMetadata: createStrategyReviewSyncMetadata(
        status,
        'generated',
        headings
      ),
      legacy,
    };
  }

  if (!metadata) {
    return reconcileLegacyDraft(currentAnswers, draftHtml, headings);
  }

  const baseAnswerFingerprints = {
    ...(metadata.baseAnswerFingerprints || {}),
  };
  const baseStepFingerprints = {
    ...(metadata.baseStepFingerprints || {}),
  };
  const changedAnswerKeys = changedKeys(
    baseAnswerFingerprints,
    currentAnswers
  );
  if (!changedAnswerKeys.length) {
    return {
      state: 'aligned',
      draftHtml,
      conflicts: [],
      changedAnswerKeys: [],
      nextMetadata: {
        ...metadata,
        baseAnswerFingerprints: answerFingerprints(currentAnswers),
        baseStepFingerprints: stepFingerprints(currentAnswers, headings),
        lastReviewedStepsHash: currentSourceHash,
        sourceSnapshotHash: currentSourceHash,
        pendingConflictStepKeys: [],
        reconciliationRecoveryCreated: false,
      },
      legacy: false,
    };
  }

  let nextDraft = draftHtml;
  const nextBaseAnswerFingerprints = { ...baseAnswerFingerprints };
  const nextBaseStepFingerprints = { ...baseStepFingerprints };
  const conflicts: StrategyReviewConflict[] = [];

  STEP_KEYS.forEach((stepKey) => {
    const stepChangedKeys = changedAnswerKeys.filter(
      (key) => answerStepKey(key) === stepKey
    );
    if (!stepChangedKeys.length) {
      return;
    }

    const currentSourceHtml = buildSourceSection(
      stepKey,
      currentAnswers,
      headings
    );
    const currentDraftHtml = findStrategyReviewSection(nextDraft, stepKey);

    const draftStillMatchesSource =
      (!baseStepFingerprints[stepKey] && !currentDraftHtml) ||
      contentFingerprint(currentDraftHtml) ===
        baseStepFingerprints[stepKey];

    if (draftStillMatchesSource) {
      nextDraft = replaceStrategyReviewSection(
        nextDraft,
        stepKey,
        currentSourceHtml
      );
      copyStepFingerprints(
        nextBaseAnswerFingerprints,
        currentAnswers,
        stepKey
      );
      nextBaseStepFingerprints[stepKey] =
        contentFingerprint(currentSourceHtml);
      return;
    }

    conflicts.push({
      stepKey,
      stepNumber: Number(stepKey.substring(1)),
      stepTitle: plainHeading(headings[stepKey]) || STEP_TITLES[stepKey],
      changedAnswerKeys: stepChangedKeys,
      removedAnswerKeys: stepChangedKeys.filter(
        (key) => !(key in currentAnswers)
      ),
      previousSourceHtml: '',
      currentSourceHtml,
      changedSourceHtml: buildSourceSection(
        stepKey,
        pickAnswers(currentAnswers, stepChangedKeys),
        headings
      ),
      currentDraftHtml,
      legacy: false,
    });
  });

  return {
    state: conflicts.length ? 'attention' : 'auto-updated',
    draftHtml: nextDraft,
    conflicts,
    changedAnswerKeys,
    nextMetadata: {
      version: 1,
      baseAnswerFingerprints: nextBaseAnswerFingerprints,
      baseStepFingerprints: nextBaseStepFingerprints,
      lastReviewedStepsHash: fingerprintsHash(nextBaseAnswerFingerprints),
      sourceSnapshotHash: currentSourceHash,
      pendingConflictStepKeys: conflicts.map((conflict) => conflict.stepKey),
      reconciliationRecoveryCreated:
        metadata.reconciliationRecoveryCreated || false,
      lastOutcome: conflicts.length
        ? metadata.lastOutcome
        : 'auto-updated',
    },
    legacy: false,
  };
}

export function resolveStrategyReviewConflict(
  draftHtml: string,
  conflict: StrategyReviewConflict,
  resolution: StrategyReviewResolution
): string {
  let replacement = conflict.currentDraftHtml;

  if (resolution === 'use-steps') {
    replacement = conflict.currentSourceHtml;
  } else if (resolution === 'combine') {
    const sourceBody = stripLeadingStepHeading(conflict.changedSourceHtml);
    replacement = [
      conflict.currentDraftHtml,
      sourceBody
        ? `<h2>New information from Step ${conflict.stepNumber}</h2>${sourceBody}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  return replaceStrategyReviewSection(
    draftHtml,
    conflict.stepKey,
    replacement
  );
}

/**
 * Refresh the draft-side section stored on each pending conflict.
 *
 * Conflict reconciliation can remain pending while the full Strategy Review is
 * edited. Keeping these section snapshots current ensures a later decision is
 * applied to the latest draft instead of restoring wording that was visible
 * when the conflict panel first loaded.
 */
export function rebaseStrategyReviewConflicts(
  draftHtml: string,
  conflicts: StrategyReviewConflict[]
): StrategyReviewConflict[] {
  return conflicts.map((conflict) => ({
    ...conflict,
    currentDraftHtml: findStrategyReviewSection(draftHtml, conflict.stepKey),
  }));
}

export function acknowledgeConflictStep(
  metadata: StrategyReviewSyncMetadata,
  currentStatus: Record<string, string> | undefined,
  stepKey: StrategyReviewStepKey,
  outcome: StrategyReviewSyncMetadata['lastOutcome'],
  headings: Partial<Record<StrategyReviewStepKey, string>> = {}
): StrategyReviewSyncMetadata {
  const currentAnswers = strategyReviewSourceAnswers(currentStatus);
  const baseAnswerFingerprints = {
    ...(metadata.baseAnswerFingerprints || {}),
  };
  const baseStepFingerprints = {
    ...(metadata.baseStepFingerprints || {}),
  };
  copyStepFingerprints(baseAnswerFingerprints, currentAnswers, stepKey);
  baseStepFingerprints[stepKey] = contentFingerprint(
    buildSourceSection(stepKey, currentAnswers, headings)
  );
  return {
    version: 1,
    baseAnswerFingerprints,
    baseStepFingerprints,
    lastReviewedStepsHash: fingerprintsHash(baseAnswerFingerprints),
    sourceSnapshotHash: strategyReviewStepsHash(currentAnswers),
    pendingConflictStepKeys: (
      metadata.pendingConflictStepKeys || []
    ).filter((pendingStepKey) => pendingStepKey !== stepKey),
    reconciliationRecoveryCreated:
      metadata.reconciliationRecoveryCreated || false,
    lastOutcome: outcome,
  };
}

export function findStrategyReviewSection(
  html: string,
  stepKey: StrategyReviewStepKey
): string {
  return findSectionRanges(html).find((section) => section.stepKey === stepKey)
    ?.html ?? '';
}

export function replaceStrategyReviewSection(
  html: string,
  stepKey: StrategyReviewStepKey,
  replacement: string
): string {
  const ranges = findSectionRanges(html);
  const existing = ranges.find((section) => section.stepKey === stepKey);

  if (existing) {
    return `${html.slice(0, existing.start)}${replacement}${html.slice(
      existing.end
    )}`;
  }

  if (!replacement) {
    return html;
  }

  const targetStep = Number(stepKey.substring(1));
  const nextSection = ranges.find(
    (section) => section.stepNumber > targetStep
  );
  const insertAt = nextSection?.start ?? html.length;
  const separatorBefore =
    insertAt > 0 && !html.slice(0, insertAt).endsWith('\n') ? '\n' : '';
  const separatorAfter =
    insertAt < html.length && !replacement.endsWith('\n') ? '\n' : '';

  return `${html.slice(0, insertAt)}${separatorBefore}${replacement}${separatorAfter}${html.slice(insertAt)}`;
}

export function strategyReviewPlainText(html: string): string {
  return decodeBasicEntities(
    String(html || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(?:p|div|li|h[1-6]|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function reconcileLegacyDraft(
  currentAnswers: Record<string, string>,
  draftHtml: string,
  headings: Partial<Record<StrategyReviewStepKey, string>>
): StrategyReviewReconciliation {
  const conflicts: StrategyReviewConflict[] = [];
  const nextBaseAnswerFingerprints: Record<string, string> = {};
  const nextBaseStepFingerprints: Partial<
    Record<StrategyReviewStepKey, string>
  > = {};

  STEP_KEYS.forEach((stepKey) => {
    const currentSourceHtml = buildSourceSection(
      stepKey,
      currentAnswers,
      headings
    );
    if (!currentSourceHtml) {
      return;
    }

    const currentDraftHtml = findStrategyReviewSection(draftHtml, stepKey);
    if (
      currentDraftHtml &&
      comparableHtml(currentDraftHtml) === comparableHtml(currentSourceHtml)
    ) {
      copyStepFingerprints(
        nextBaseAnswerFingerprints,
        currentAnswers,
        stepKey
      );
      nextBaseStepFingerprints[stepKey] =
        contentFingerprint(currentSourceHtml);
      return;
    }

    conflicts.push({
      stepKey,
      stepNumber: Number(stepKey.substring(1)),
      stepTitle: plainHeading(headings[stepKey]) || STEP_TITLES[stepKey],
      changedAnswerKeys: Object.keys(currentAnswers).filter(
        (key) => answerStepKey(key) === stepKey
      ),
      removedAnswerKeys: [],
      previousSourceHtml: '',
      currentSourceHtml,
      changedSourceHtml: currentSourceHtml,
      currentDraftHtml,
      legacy: true,
    });
  });

  if (!conflicts.length) {
    return {
      state: 'aligned',
      draftHtml,
      conflicts: [],
      changedAnswerKeys: [],
      nextMetadata: createStrategyReviewSyncMetadata(
        currentAnswers,
        'initialized',
        headings
      ),
      legacy: true,
    };
  }

  return {
    state: 'attention',
    draftHtml,
    conflicts,
    changedAnswerKeys: Object.keys(currentAnswers),
    nextMetadata: {
      version: 1,
      baseAnswerFingerprints: nextBaseAnswerFingerprints,
      baseStepFingerprints: nextBaseStepFingerprints,
      lastReviewedStepsHash: fingerprintsHash(nextBaseAnswerFingerprints),
      sourceSnapshotHash: strategyReviewStepsHash(currentAnswers),
      pendingConflictStepKeys: conflicts.map((conflict) => conflict.stepKey),
      reconciliationRecoveryCreated: false,
      lastOutcome: 'initialized',
    },
    legacy: true,
  };
}

function buildSourceSection(
  stepKey: StrategyReviewStepKey,
  answers: Record<string, string>,
  headings: Partial<Record<StrategyReviewStepKey, string>>
): string {
  const snippets = Object.keys(answers)
    .filter((key) => answerStepKey(key) === stepKey)
    .sort(compareAnswerKeys)
    .map((key) => answers[key])
    .filter((value) => hasMeaningfulContent(value));

  if (!snippets.length) {
    return '';
  }

  const heading =
    headings[stepKey] ||
    `<h1 class="text-left text-xl font-bold my-4">${STEP_TITLES[stepKey]}</h1>`;
  return [heading, ...snippets].join('\n');
}

function changedKeys(
  baseAnswerFingerprints: Record<string, string>,
  currentAnswers: Record<string, string>
): string[] {
  const currentFingerprints = answerFingerprints(currentAnswers);
  return Array.from(
    new Set([
      ...Object.keys(baseAnswerFingerprints),
      ...Object.keys(currentFingerprints),
    ])
  )
    .filter(
      (key) =>
        (baseAnswerFingerprints[key] || '') !==
        (currentFingerprints[key] || '')
    )
    .sort(compareAnswerKeys);
}

function copyStepFingerprints(
  target: Record<string, string>,
  sourceAnswers: Record<string, string>,
  stepKey: StrategyReviewStepKey
): void {
  Object.keys(target)
    .filter((key) => answerStepKey(key) === stepKey)
    .forEach((key) => delete target[key]);
  Object.keys(sourceAnswers)
    .filter((key) => answerStepKey(key) === stepKey)
    .forEach((key) => {
      target[key] = contentFingerprint(sourceAnswers[key]);
    });
}

function answerFingerprints(
  answers: Record<string, string>
): Record<string, string> {
  return Object.keys(answers).reduce<Record<string, string>>(
    (fingerprints, key) => {
      fingerprints[key] = contentFingerprint(answers[key]);
      return fingerprints;
    },
    {}
  );
}

function stepFingerprints(
  answers: Record<string, string>,
  headings: Partial<Record<StrategyReviewStepKey, string>>
): Partial<Record<StrategyReviewStepKey, string>> {
  return STEP_KEYS.reduce<Partial<Record<StrategyReviewStepKey, string>>>(
    (fingerprints, stepKey) => {
      const section = buildSourceSection(stepKey, answers, headings);
      if (section) {
        fingerprints[stepKey] = contentFingerprint(section);
      }
      return fingerprints;
    },
    {}
  );
}

function pickAnswers(
  answers: Record<string, string>,
  keys: string[]
): Record<string, string> {
  return keys.reduce<Record<string, string>>((picked, key) => {
    if (key in answers) {
      picked[key] = answers[key];
    }
    return picked;
  }, {});
}

function findSectionRanges(html: string): StrategyReviewSectionRange[] {
  const headingRegex = /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi;
  const headings: Array<{
    stepKey: StrategyReviewStepKey;
    stepNumber: number;
    start: number;
  }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const stepKey = headingStepKey(match[1]);
    if (!stepKey || headings.some((heading) => heading.stepKey === stepKey)) {
      continue;
    }
    headings.push({
      stepKey,
      stepNumber: Number(stepKey.substring(1)),
      start: match.index,
    });
  }

  headings.sort((left, right) => left.start - right.start);
  return headings.map((heading, index) => {
    const end = headings[index + 1]?.start ?? html.length;
    return {
      ...heading,
      end,
      html: html.slice(heading.start, end).trim(),
    };
  });
}

function headingStepKey(value: string): StrategyReviewStepKey | null {
  const normalized = strategyReviewPlainText(value)
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  for (const stepKey of STEP_KEYS) {
    if (
      STEP_HEADING_ALIASES[stepKey].some(
        (alias) => normalized === alias || normalized.includes(alias)
      )
    ) {
      return stepKey;
    }
  }
  return null;
}

function answerStepKey(key: string): StrategyReviewStepKey | null {
  const match = /^S([1-4])(?:-|$)/i.exec(key);
  return match ? (`S${match[1]}` as StrategyReviewStepKey) : null;
}

function compareAnswerKeys(left: string, right: string): number {
  const leftMatch = /^S(\d+)(?:-(.*))?$/i.exec(left);
  const rightMatch = /^S(\d+)(?:-(.*))?$/i.exec(right);
  const leftStep = Number(leftMatch?.[1] || Number.MAX_SAFE_INTEGER);
  const rightStep = Number(rightMatch?.[1] || Number.MAX_SAFE_INTEGER);
  if (leftStep !== rightStep) {
    return leftStep - rightStep;
  }
  return String(leftMatch?.[2] || '').localeCompare(
    String(rightMatch?.[2] || ''),
    undefined,
    { numeric: true, sensitivity: 'base' }
  );
}

function comparableHtml(value: string): string {
  const media = Array.from(
    String(value || '').matchAll(
      /<(?:img|a|video|audio|iframe)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi
    )
  )
    .map((match) => match[1])
    .join(' ');

  return `${strategyReviewPlainText(value)} ${media}`
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function contentFingerprint(value: string): string {
  return hashString(comparableHtml(value));
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function plainHeading(value: string | undefined): string {
  return strategyReviewPlainText(value || '');
}

function stripLeadingStepHeading(html: string): string {
  return String(html || '').replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, '');
}

function hasMeaningfulContent(value: string): boolean {
  return (
    /<(?:img|video|audio|iframe|table)\b/i.test(value || '') ||
    strategyReviewPlainText(value || '').length > 0
  );
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}
