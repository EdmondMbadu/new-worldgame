import {
  getDefaultQuestionLocales,
  PLAYGROUND_QUESTION_KEYS,
  PLAYGROUND_QUESTION_KEYS_FLAT,
  questionRecordToGroups,
  resolveQuestionTemplate,
} from './playground-question-schema';

describe('playground question schema', () => {
  it('preserves the existing five sections and stable answer keys', () => {
    expect(PLAYGROUND_QUESTION_KEYS.map((keys) => keys.length)).toEqual([4, 2, 5, 14, 1]);
    expect(PLAYGROUND_QUESTION_KEYS_FLAT.length).toBe(26);
    expect(PLAYGROUND_QUESTION_KEYS_FLAT[0]).toBe('S1-A');
    expect(PLAYGROUND_QUESTION_KEYS_FLAT[25]).toBe('S5');
  });

  it('returns independent copies of the exact standard prompts', () => {
    const first = getDefaultQuestionLocales();
    const second = getDefaultQuestionLocales();
    first.en['S1-A'] = 'changed';
    expect(second.en['S1-A']).toContain('What is the problem you have chosen');
    expect(questionRecordToGroups(second.en).map((group) => group.length)).toEqual([4, 2, 5, 14, 1]);
  });

  it('uses standard prompts when no custom template exists', () => {
    const resolved = resolveQuestionTemplate('page-1', null);
    expect(resolved.mode).toBe('standard');
    expect(resolved.locales.en['S2-A']).toContain('preferred or ideal state');
  });

  it('merges only non-empty custom wording and preserves all keys', () => {
    const resolved = resolveQuestionTemplate('page-1', {
      mode: 'custom',
      revision: 3,
      locales: { en: { 'S1-A': 'A challenge-specific question', 'S1-B': '   ' } },
    });
    expect(resolved.locales.en['S1-A']).toBe('A challenge-specific question');
    expect(resolved.locales.en['S1-B']).toContain('symptoms');
    expect(Object.keys(resolved.locales.en).length).toBe(26);
  });
});
