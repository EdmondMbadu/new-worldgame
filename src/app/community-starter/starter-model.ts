import { PLAYGROUND_QUESTION_KEYS } from '../config/playground-question-schema';

export interface StarterField {
  id: string;
  key: string;
  label: string;
  question: string;
  hint: string;
  placeholder: string;
  core?: boolean;
}
export interface StarterStep {
  title: string;
  shortTitle: string;
  introduction: string;
  fields: StarterField[];
}

/** Semantic slots, not keyword extraction. A field has exactly one destination.
 * The initial problem and local context both contribute to S1-A. Nothing is
 * inferred about global scale, cost, causality, funding, or feasibility.
 */
export const STARTER_STEPS: StarterStep[] = [
  {
    title: 'Understand the problem', shortTitle: 'Understand',
    introduction: 'You know your community. Let’s start with what you’ve seen, and leave room for what we still need to learn.',
    fields: [
      { id: 'problem', key: 'S1-A', label: 'The problem', question: 'What problem would you like to work on?', hint: 'A rough idea is enough. Start in your own words.', placeholder: 'Families in our neighborhood struggle to find affordable fresh food.', core: true },
      { id: 'context', key: 'S1-A', label: 'Who and where', question: 'Who is affected, and where is this happening?', hint: 'Think of the people you have in mind. A neighborhood, school, organization, or wider community all count.', placeholder: 'The people affected include… in…', core: true },
      { id: 'symptoms', key: 'S1-B', label: 'What you’ve noticed', question: 'What have you noticed, and what seems to be getting in the way?', hint: 'Describe an observation or barrier. You don’t need to prove the root cause yet.', placeholder: 'We have noticed… People tell us… One barrier seems to be…', core: true },
      { id: 'scope', key: 'S1-C', label: 'Scale and evidence', question: 'What do you know about how widespread this is?', hint: 'Separate local observations from worldwide evidence. Include numbers and sources only if you have them; don’t guess.', placeholder: 'Locally, we have spoken with… A source on the wider problem is…' },
      { id: 'inaction', key: 'S1-D', label: 'If nothing changes', question: 'What might happen if nothing changes?', hint: 'Whose lives would be affected, and how? Describe a risk, not a certainty.', placeholder: 'Residents may continue to…' },
    ],
  },
  {
    title: 'Imagine success', shortTitle: 'Imagine',
    introduction: 'Before choosing a solution, picture the change you want people to experience.',
    fields: [
      { id: 'future', key: 'S2-A', label: 'The change you want', question: 'If this improved, what would everyday life look like?', hint: 'Describe the outcome for people, rather than a particular product or program.', placeholder: 'People would be able to… without…', core: true },
      { id: 'measure', key: 'S2-B', label: 'How you’ll know', question: 'What would tell you that things are getting better?', hint: 'Choose something you could observe, count, or ask people about. Targets can come later.', placeholder: 'We would track… and ask people whether…', core: true },
    ],
  },
  {
    title: 'Design a solution', shortTitle: 'Design',
    introduction: 'Explore a few ways forward, then choose an idea small enough to test. It can change as you learn.',
    fields: [
      { id: 'approach', key: 'S3-A', label: 'Your approach', question: 'What could help, and which idea would you try first?', hint: 'Consider a few alternatives if you can. Explain what your preferred approach would do and why you chose it.', placeholder: 'We could try… Another option is… I would start with… because…', core: true },
      { id: 'requirements', key: 'S3-B', label: 'How it would work', question: 'What would need to exist for this idea to work?', hint: 'This could be a service, a process, a technology, or a policy. Start simply.', placeholder: 'A way for residents to request help, a pickup schedule, and…', core: true },
      { id: 'resources', key: 'S3-C', label: 'People and resources', question: 'What people, resources, or community support would it need?', hint: 'Include what is already available and what you would need to find. Potential partners are not confirmed partners.', placeholder: 'We have… We would need… We could ask…', core: true },
      { id: 'business', key: 'S3-D', label: 'Business opportunity', question: 'Could a business help meet this need?', hint: 'Optional. Describe what it would offer and how it might sustain itself, or leave this open.', placeholder: 'A possible model could be…' },
      { id: 'circular', key: 'S3-E', label: 'A fairer, regenerative approach', question: 'How could the design reduce waste, restore resources, or share benefits more fairly?', hint: 'Describe a specific design choice. Avoid claiming benefits you have not checked.', placeholder: 'We could reuse… We would involve…' },
    ],
  },
  {
    title: 'Make a plan', shortTitle: 'Plan',
    introduction: 'You don’t need a complete rollout today. Choose a first test that will teach you something useful.',
    fields: [
      { id: 'firstAction', key: 'S4-N', label: 'Your first move', question: 'What is one useful action you can take with what you have now?', hint: 'Make it concrete: an action, who could do it, and when. A small conversation or test is a real start.', placeholder: 'This week, I will speak with five residents about…', core: true },
      { id: 'delivery', key: 'S4-D', label: 'Who and where', question: 'Who could help run the first test, and where would you try it?', hint: 'Name a possible lead, test location, and any partner you would need to approach. Say what is still unconfirmed.', placeholder: 'I could coordinate a test at… We would first ask…', core: true },
      { id: 'pilotCost', key: 'S4-A', label: 'A test budget', question: 'What might the first test cost?', hint: 'A rough estimate is fine if labeled as an estimate. If you don’t know, leave this open and gather quotes later.', placeholder: 'Our initial estimate is… for… We still need a quote for…' },
      { id: 'scaleCost', key: 'S4-B', label: 'Cost at scale', question: 'What might it cost to expand beyond the first test?', hint: 'Separate an early test budget from the cost of serving a whole community.', placeholder: 'At a larger scale, we would need to budget for…' },
      { id: 'funding', key: 'S4-C', label: 'Finding resources', question: 'Where could the resources or funding come from?', hint: 'Distinguish what you have from sources you might approach.', placeholder: 'Available now… Possible sources to approach…' },
      { id: 'timeline', key: 'S4-E', label: 'A longer plan', question: 'What would the next 6–12 months involve?', hint: 'List milestones, responsibilities, and timing. Keep your immediate first action separate.', placeholder: 'Months 1–2… Led by… Months 3–6…' },
      { id: 'operation', key: 'S4-F', label: 'The solution in practice', question: 'What would a normal day look like once the solution is running?', hint: 'Walk through the experience from the community’s point of view.', placeholder: 'A resident would… The team would…' },
      { id: 'localImpact', key: 'S4-G', label: 'Community effects', question: 'What local effects do you expect, and what would you need to verify?', hint: 'Consider health, jobs, the economy, and social life. Label expectations as hypotheses.', placeholder: 'We expect… We would test that by…' },
      { id: 'globalImpact', key: 'S4-H', label: 'Wider effects', question: 'If adapted more widely, what effects might this approach have?', hint: 'This is a scenario, not evidence of global impact. Consider conditions and tradeoffs.', placeholder: 'In other places, this might… provided that…' },
      { id: 'goalLink', key: 'S4-I', label: 'Connecting action to outcome', question: 'How would the approach produce the change you imagined?', hint: 'Explain the link between the activity and your preferred outcome. What assumptions need testing?', placeholder: 'Doing… should help… because… We need to check…' },
      { id: 'environment', key: 'S4-J', label: 'Environmental effects', question: 'What environmental benefits or harms should you examine?', hint: 'Include possible tradeoffs, rather than assuming the idea has only benefits.', placeholder: 'It could reduce… but might increase…' },
      { id: 'fundingFit', key: 'S4-K', label: 'Funding fit', question: 'Which potential funders fit this idea best, and why?', hint: 'A potential source is not a funding commitment. Check eligibility and current requirements.', placeholder: 'We would investigate… because their priorities may fit…' },
      { id: 'equity', key: 'S4-L', label: 'Equity and inclusion', question: 'Who might be left out, and how would you include them?', hint: 'Consider access, affordability, decision-making, and whose voices shape the test.', placeholder: 'To include… we would…' },
      { id: 'tenThousand', key: 'S4-M', label: 'A $10,000 scenario', question: 'If you had $10,000, what would you prioritize?', hint: 'This is a planning exercise, not an available grant.', placeholder: 'We would allocate… to… because…' },
    ],
  },
];

export const STARTER_FIELDS = STARTER_STEPS.flatMap(step => step.fields);
export const STARTER_STORAGE_KEY = 'gsl.community-starter.v1';
export const MAX_ANSWER_LENGTH = 4000;

export interface StarterDraft {
  version: 1;
  id: string;
  started: boolean;
  step: number;
  activeField: string;
  answers: Record<string, string>;
  skipped: string[];
  updatedAt: number;
  exported?: { solutionId: string; ownerUid: string };
}

export function newStarterDraft(): StarterDraft {
  return {
    version: 1, id: crypto.randomUUID(), started: false, step: 0,
    activeField: 'context', answers: {}, skipped: [], updatedAt: Date.now(),
  };
}

/** Explicit unknowns are preserved in the local draft, but never represented
 * as completed answers in the legacy question form. */
export function hasAnswer(raw: unknown): raw is string {
  return typeof raw === 'string' && !!raw.trim() &&
    !/^(?:i\s+(?:do\s+not|don['’]?t)\s+know(?:\s+yet)?|not\s+sure(?:\s+yet)?|unknown|tbd|to\s+(?:research|learn)|n\/?a|not\s+applicable|[?….-]+)[.!?\s]*$/i.test(raw.trim());
}

export function readStarterDraft(raw: string | null): StarterDraft | null {
  if (!raw || raw.length > 150000) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || typeof value.id !== 'string' || !/^[a-zA-Z0-9_-]{16,64}$/.test(value.id) ||
      !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers)) return null;
    const answers: Record<string, string> = {};
    for (const field of STARTER_FIELDS) {
      const answer = value.answers[field.id];
      if (typeof answer === 'string') answers[field.id] = answer.slice(0, MAX_ANSWER_LENGTH);
    }
    const field = STARTER_FIELDS.find(f => f.id === value.activeField);
    const draft: StarterDraft = {
      version: 1, id: value.id, answers,
      started: value.started === true && hasAnswer(answers['problem']),
      step: Number.isInteger(value.step) ? Math.max(0, Math.min(3, value.step)) : 0,
      activeField: value.activeField === '' ? '' : field?.id || 'context',
      skipped: Array.isArray(value.skipped) ? value.skipped.filter((id: unknown) => STARTER_FIELDS.some(f => f.id === id)) : [],
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : 0,
    };
    if (typeof value.exported?.solutionId === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value.exported.solutionId) &&
      typeof value.exported.ownerUid === 'string' && value.exported.ownerUid.length <= 128) draft.exported = value.exported;
    return draft;
  } catch { return null; }
}

export function escapeStarterHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export interface StarterMapping {
  status: Record<string, string>;
  evidence: Record<string, string[]>;
  missingKeys: string[];
}

export function mapStarterToPlayground(draft: StarterDraft): StarterMapping {
  const status: Record<string, string> = {};
  const evidence: Record<string, string[]> = {};
  for (const field of STARTER_FIELDS) {
    const answer = draft.answers[field.id];
    if (!hasAnswer(answer)) continue;
    const safe = escapeStarterHtml(answer.trim().slice(0, MAX_ANSWER_LENGTH)).replace(/\r?\n/g, '<br>');
    status[field.key] = (status[field.key] || '') + `<p><strong>${escapeStarterHtml(field.label)}:</strong> ${safe}</p>`;
    (evidence[field.key] ||= []).push(field.id);
  }
  // S5 / Strategy Review is intentionally never generated or marked complete.
  const keys = PLAYGROUND_QUESTION_KEYS.slice(0, 4).flat();
  return { status, evidence, missingKeys: keys.filter(key => !status[key]) };
}

export function starterTitle(draft: StarterDraft): string {
  const text = (draft.answers['problem'] || 'Community solution').trim().replace(/\s+/g, ' ');
  return text.length <= 100 ? text : text.slice(0, 97) + '…';
}

export function starterText(draft: StarterDraft): string {
  return [starterTitle(draft), 'Community solution · Starting draft', '', ...STARTER_STEPS.flatMap((step, i) => [
    `${i + 1}. ${step.title}`, ...step.fields.filter(f => hasAnswer(draft.answers[f.id])).map(f => `${f.label}\n${draft.answers[f.id].trim()}\n`), '',
  ]), 'This is an early draft based on the author’s input. Unanswered questions remain open; observations and estimates need verification.'].join('\n');
}
