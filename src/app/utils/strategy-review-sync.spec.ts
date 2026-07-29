import {
  acknowledgeConflictStep,
  buildStrategyReviewFromSteps,
  createStrategyReviewSyncMetadata,
  findStrategyReviewSection,
  reconcileStrategyReview,
  resolveStrategyReviewConflict,
  strategyReviewPlainText,
  strategyReviewSourceAnswers,
  strategyReviewStepsHash,
} from './strategy-review-sync';

describe('Strategy Review reconciliation', () => {
  const headings = {
    S1: '<h1>Problem State</h1>',
    S2: '<h1>Preferred State</h1>',
    S3: '<h1>Plan</h1>',
    S4: '<h1>Implementation</h1>',
  };

  const originalStatus = {
    'S1-A': '<p>Original problem</p>',
    'S2-A': '<p>Original preferred state</p>',
    'S3-A': '<p>Original plan</p>',
    'S4-A': '<p>Original implementation</p>',
    S5: '<p>Legacy Step 5 material must not be compiled.</p>',
  };

  it('creates a new draft from Steps 1–4 and excludes Step 5', () => {
    const result = reconcileStrategyReview(
      originalStatus,
      '',
      undefined,
      headings
    );

    expect(result.state).toBe('auto-updated');
    expect(result.conflicts).toEqual([]);
    expect(result.draftHtml).toContain('Original problem');
    expect(result.draftHtml).toContain('Original implementation');
    expect(result.draftHtml).not.toContain('Legacy Step 5');
  });

  it('silently updates a source section when draft-only writing is in another section', () => {
    const originalDraft = buildStrategyReviewFromSteps(
      originalStatus,
      headings
    );
    const editedDraft = originalDraft.replace(
      '<p>Original plan</p>',
      '<p>Original plan</p><p>A review-only observation.</p>'
    );
    const changedStatus = {
      ...originalStatus,
      'S4-A': '<p>Updated implementation</p>',
    };

    const result = reconcileStrategyReview(
      changedStatus,
      editedDraft,
      createStrategyReviewSyncMetadata(originalStatus, 'generated'),
      headings
    );

    expect(result.state).toBe('auto-updated');
    expect(result.conflicts).toEqual([]);
    expect(result.draftHtml).toContain('A review-only observation.');
    expect(result.draftHtml).toContain('Updated implementation');
  });

  it('asks for a decision when the same step changed in both places', () => {
    const originalDraft = buildStrategyReviewFromSteps(
      originalStatus,
      headings
    );
    const editedDraft = originalDraft.replace(
      '<p>Original plan</p>',
      '<p>Begin with five pilot cities.</p>'
    );
    const changedStatus = {
      ...originalStatus,
      'S3-A': '<p>Launch globally.</p>',
    };

    const result = reconcileStrategyReview(
      changedStatus,
      editedDraft,
      createStrategyReviewSyncMetadata(originalStatus, 'generated'),
      headings
    );

    expect(result.state).toBe('attention');
    expect(result.conflicts.length).toBe(1);
    expect(result.conflicts[0].stepKey).toBe('S3');
    expect(result.conflicts[0].changedAnswerKeys).toEqual(['S3-A']);
  });

  it('inserts a newly answered step in the correct document order', () => {
    const sparseStatus = {
      'S1-A': '<p>Problem</p>',
      'S3-A': '<p>Plan</p>',
    };
    const originalDraft = buildStrategyReviewFromSteps(
      sparseStatus,
      headings
    );
    const changedStatus = {
      ...sparseStatus,
      'S2-A': '<p>New preferred state</p>',
    };

    const result = reconcileStrategyReview(
      changedStatus,
      originalDraft,
      createStrategyReviewSyncMetadata(sparseStatus, 'generated'),
      headings
    );

    expect(result.state).toBe('auto-updated');
    expect(result.draftHtml.indexOf('Preferred State')).toBeGreaterThan(
      result.draftHtml.indexOf('Problem State')
    );
    expect(result.draftHtml.indexOf('Preferred State')).toBeLessThan(
      result.draftHtml.indexOf('<h1>Plan</h1>')
    );
  });

  it('removes a deleted source section only when that draft section was untouched', () => {
    const originalDraft = buildStrategyReviewFromSteps(
      originalStatus,
      headings
    );
    const changedStatus = { ...originalStatus };
    delete (changedStatus as Partial<typeof originalStatus>)['S4-A'];

    const result = reconcileStrategyReview(
      changedStatus,
      originalDraft,
      createStrategyReviewSyncMetadata(originalStatus, 'generated'),
      headings
    );

    expect(result.state).toBe('auto-updated');
    expect(result.draftHtml).not.toContain('Original implementation');
  });

  it('does not silently remove a deleted source section that contains draft edits', () => {
    const originalDraft = buildStrategyReviewFromSteps(
      originalStatus,
      headings
    );
    const editedDraft = originalDraft.replace(
      '<p>Original implementation</p>',
      '<p>Implementation rewritten in Strategy Review.</p>'
    );
    const changedStatus = { ...originalStatus };
    delete (changedStatus as Partial<typeof originalStatus>)['S4-A'];

    const result = reconcileStrategyReview(
      changedStatus,
      editedDraft,
      createStrategyReviewSyncMetadata(originalStatus, 'generated'),
      headings
    );

    expect(result.state).toBe('attention');
    expect(result.conflicts[0].stepKey).toBe('S4');
    expect(result.conflicts[0].removedAnswerKeys).toEqual(['S4-A']);
    expect(result.draftHtml).toContain(
      'Implementation rewritten in Strategy Review.'
    );
  });

  it('combines a conflict without changing the source answers', () => {
    const originalDraft = buildStrategyReviewFromSteps(
      originalStatus,
      headings
    );
    const editedDraft = originalDraft.replace(
      '<p>Original plan</p>',
      '<p>Begin with five pilot cities.</p>'
    );
    const changedStatus = {
      ...originalStatus,
      'S3-A': '<p>Launch globally.</p>',
    };
    const result = reconcileStrategyReview(
      changedStatus,
      editedDraft,
      createStrategyReviewSyncMetadata(originalStatus, 'generated'),
      headings
    );
    const combined = resolveStrategyReviewConflict(
      result.draftHtml,
      result.conflicts[0],
      'combine'
    );

    expect(combined).toContain('Begin with five pilot cities.');
    expect(combined).toContain('Launch globally.');
    expect(changedStatus['S3-A']).toBe('<p>Launch globally.</p>');
  });

  it('acknowledges a kept draft section so the same source revision is not asked again', () => {
    const metadata = createStrategyReviewSyncMetadata(
      originalStatus,
      'generated'
    );
    const changedStatus = {
      ...originalStatus,
      'S3-A': '<p>Launch globally.</p>',
    };
    const acknowledged = acknowledgeConflictStep(
      metadata,
      changedStatus,
      'S3',
      'kept-review'
    );

    expect(acknowledged.baseAnswerFingerprints['S3-A']).toBeTruthy();
    expect(acknowledged.baseAnswerFingerprints['S3-A']).not.toBe(
      metadata.baseAnswerFingerprints['S3-A']
    );
  });

  it('resumes with only unresolved conflicts after one section decision is saved', () => {
    const originalDraft = buildStrategyReviewFromSteps(
      originalStatus,
      headings
    );
    const editedDraft = originalDraft
      .replace(
        '<p>Original plan</p>',
        '<p>Begin with five pilot cities.</p>'
      )
      .replace(
        '<p>Original implementation</p>',
        '<p>Implementation rewritten in Strategy Review.</p>'
      );
    const changedStatus = {
      ...originalStatus,
      'S3-A': '<p>Launch globally.</p>',
      'S4-A': '<p>Begin implementation next year.</p>',
    };
    const initial = reconcileStrategyReview(
      changedStatus,
      editedDraft,
      createStrategyReviewSyncMetadata(originalStatus, 'generated'),
      headings
    );
    const planConflict = initial.conflicts.find(
      (conflict) => conflict.stepKey === 'S3'
    )!;
    const partiallySavedDraft = resolveStrategyReviewConflict(
      initial.draftHtml,
      planConflict,
      'use-steps'
    );
    const partiallySavedMetadata = acknowledgeConflictStep(
      initial.nextMetadata,
      changedStatus,
      'S3',
      'replaced',
      headings
    );

    expect(partiallySavedMetadata.sourceSnapshotHash).toBe(
      strategyReviewStepsHash(strategyReviewSourceAnswers(changedStatus))
    );
    expect(partiallySavedMetadata.lastReviewedStepsHash).not.toBe(
      partiallySavedMetadata.sourceSnapshotHash!
    );
    expect(partiallySavedMetadata.pendingConflictStepKeys).toEqual(['S4']);

    const resumed = reconcileStrategyReview(
      changedStatus,
      partiallySavedDraft,
      partiallySavedMetadata,
      headings
    );

    expect(resumed.state).toBe('attention');
    expect(resumed.conflicts.map((conflict) => conflict.stepKey)).toEqual([
      'S4',
    ]);
    expect(resumed.draftHtml).toContain('Launch globally.');
  });

  it('requires a one-time review for a legacy draft that differs from source sections', () => {
    const legacyDraft =
      '<h1>Problem State</h1><p>Edited legacy problem.</p>';
    const result = reconcileStrategyReview(
      originalStatus,
      legacyDraft,
      undefined,
      headings
    );

    expect(result.state).toBe('attention');
    expect(result.legacy).toBeTrue();
    expect(result.conflicts.some((conflict) => conflict.stepKey === 'S1')).toBeTrue();
  });

  it('preserves rich media when comparing and resolving sections', () => {
    const status = {
      'S3-A': '<p>Plan</p><img src="https://example.com/plan.png">',
    };
    const draft = buildStrategyReviewFromSteps(status, headings);

    expect(
      strategyReviewPlainText(findStrategyReviewSection(draft, 'S3'))
    ).toContain('Plan');
    expect(findStrategyReviewSection(draft, 'S3')).toContain(
      'https://example.com/plan.png'
    );
  });
});
