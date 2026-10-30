import { PLAYGROUND_QUESTION_KEYS } from '../config/playground-question-schema';
import { STARTER_FIELDS, STARTER_STEPS, MAX_ANSWER_LENGTH, hasAnswer, mapStarterToPlayground, newStarterDraft, readStarterDraft, starterText } from './starter-model';

describe('Community starter semantic mapping', () => {
  it('covers every existing core question, without changing the fifth review stage', () => {
    const keys = [...new Set(STARTER_FIELDS.map(f => f.key))].sort();
    expect(keys).toEqual([...PLAYGROUND_QUESTION_KEYS.slice(0, 4).flat()].sort());
    expect(keys.length).toBe(25);
    expect(STARTER_STEPS.length).toBe(4);
  });

  it('maps a short first pass without inventing scale, costs, funding, or impact', () => {
    const draft = newStarterDraft();
    draft.answers = {
      problem: 'Fresh food is hard to reach.', context: 'Older residents in our neighborhood.',
      symptoms: 'Two bus rides to the grocery store.', future: 'Food close to home.',
      measure: 'Survey residents about access.', approach: 'Test a weekly pickup service.',
      firstAction: 'Interview five neighbors this week.',
    };
    const result = mapStarterToPlayground(draft);
    expect(Object.keys(result.status)).toEqual(['S1-A', 'S1-B', 'S2-A', 'S2-B', 'S3-A', 'S4-N']);
    expect(result.status['S1-A']).toContain('Older residents');
    expect(result.evidence['S1-A']).toEqual(['problem', 'context']);
    expect(result.status['S1-C']).toBeUndefined();
    expect(result.status['S4-A']).toBeUndefined();
    expect(result.status['S4-H']).toBeUndefined();
    expect(result.status['S5']).toBeUndefined();
    expect(result.missingKeys.length).toBe(19);
  });

  it('does not route content by keywords inside an answer', () => {
    const draft = newStarterDraft();
    draft.answers['problem'] = 'A $10,000 budget and global climate impacts are questions we have.';
    const result = mapStarterToPlayground(draft);
    expect(Object.keys(result.status)).toEqual(['S1-A']);
  });

  it('maps every optional answer to its own intended destination', () => {
    for (const field of STARTER_FIELDS) {
      const draft = newStarterDraft();
      draft.answers[field.id] = `Explicit input for ${field.id}`;
      const result = mapStarterToPlayground(draft);
      expect(Object.keys(result.status)).withContext(field.id).toEqual([field.key]);
      expect(result.evidence[field.key]).toEqual([field.id]);
    }
  });

  it('keeps unknowns out of completed question answers', () => {
    for (const text of ['', '  ', 'Unknown', "I don't know", 'I don’t know yet.', 'Not sure yet', 'TBD', 'To research', 'N/A', '???']) {
      expect(hasAnswer(text)).withContext(text).toBeFalse();
    }
    expect(hasAnswer('I don’t know the exact cost, but transport may be about $50.')).toBeTrue();
    const draft = newStarterDraft();
    draft.answers['pilotCost'] = "I don't know";
    expect(mapStarterToPlayground(draft).status['S4-A']).toBeUndefined();
    expect(draft.answers['pilotCost']).toBe("I don't know");
  });

  it('escapes user HTML at the rich-text handoff boundary', () => {
    const draft = newStarterDraft();
    draft.answers['problem'] = '<img src=x onerror="alert(1)"> & <script>bad()</script>\nSecond line';
    const html = mapStarterToPlayground(draft).status['S1-A'];
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
    expect(html).toContain('<br>Second line');
  });

  it('restores a draft including the current step, open prompt, and skipped questions', () => {
    const draft = newStarterDraft();
    Object.assign(draft, { started: true, step: 2, activeField: 'resources', skipped: ['requirements'] });
    draft.answers = { problem: 'A local issue.', approach: 'A possible approach.' };
    expect(readStarterDraft(JSON.stringify(draft))).toEqual(draft);
    draft.activeField = '';
    expect(readStarterDraft(JSON.stringify(draft))?.activeField).toBe('');
  });

  it('rejects corrupted, foreign-version, oversized, and invalid-identity drafts', () => {
    const draft = newStarterDraft();
    for (const raw of ['{', 'null', '[]', JSON.stringify({ ...draft, version: 2 }), JSON.stringify({ ...draft, id: '../solutions/victim' }), ' '.repeat(150001)]) {
      expect(readStarterDraft(raw)).withContext(raw.slice(0, 50)).toBeNull();
    }
  });

  it('ignores foreign fields and normalizes restored bounds', () => {
    const raw = { ...newStarterDraft(), step: 999, activeField: 'other', answers: { problem: 'x'.repeat(9000), arbitrary: '<script>', scope: 23 }, skipped: ['scope', 'other'] };
    const draft = readStarterDraft(JSON.stringify(raw))!;
    expect(draft.step).toBe(3);
    expect(draft.activeField).toBe('context');
    expect(draft.answers['problem'].length).toBe(MAX_ANSWER_LENGTH);
    expect(draft.answers['arbitrary']).toBeUndefined();
    expect(draft.answers['scope']).toBeUndefined();
    expect(draft.skipped).toEqual(['scope']);
  });

  it('downloads actual author notes without filling unanswered sections', () => {
    const draft = newStarterDraft();
    draft.answers = { problem: 'Unsafe crossing', firstAction: 'Count crossing times with volunteers.' };
    const text = starterText(draft);
    expect(text).toContain('Unsafe crossing');
    expect(text).toContain('Count crossing times');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('A test budget');
  });
});
