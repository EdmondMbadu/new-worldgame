/** Pure wire contract shared by the report function, browser exports, and tests. */
export interface PolicyBriefContext {
  audience: string;
  jurisdiction: string;
  decision: string;
}

export interface PolicyBriefReference {
  id: string;
  title: string;
  url: string;
}

export const POLICY_BRIEF_SOURCE_LIMIT = 120000;
export type PolicyBriefScope = { mode: 'whole-strategy' | 'selected-component'; focus: string };
export interface PolicyBriefStepAnswer { id: string; question: string; answer: string }
export interface PolicyBriefComponent {
  id: string;
  title: string;
  sourceQuote: string;
  treatment: 'included' | 'deferred' | 'outside-scope';
  policyResponse: string;
  rationale: string;
  actionIndices: number[];
}
export interface PolicyBriefStrategy {
  scope: PolicyBriefScope;
  objective: string;
  components: PolicyBriefComponent[];
  dependencies: string[];
  conflicts: string[];
}
export interface PolicyBriefResearchFinding { id: string; text: string; sourceIds: string[] }

export interface PolicyBrief {
  version: 1 | 2;
  strategy?: PolicyBriefStrategy;
  sourceSnapshot?: { sha256: string; characters: number; generatorVersion: string };
  researchFindings?: PolicyBriefResearchFinding[];
  title: string;
  authors: string;
  audience: string;
  jurisdiction: string;
  decision: string;
  statusNote: string;
  keyMessages: string[];
  introduction: string;
  context: string;
  evidence: Array<{ finding: string; implication: string; sourceIds: string[]; supportingFindingIds?: string[] }>;
  options: Array<{
    kind: 'status-quo' | 'preferred' | 'alternative';
    name: string;
    approach: string;
    benefits: string;
    tradeoffs: string;
    feasibility: string;
    sourceIds: string[];
  }>;
  recommendations: Array<{ action: string; lead: string; timing: string; resources: string; measure: string }>;
  pathway: string[];
  nextSteps: string;
  uncertainties: string[];
  aboutAuthors: string;
  references: PolicyBriefReference[];
  generatedOn: string;
}

export const POLICY_BRIEF_INSTRUCTION = `Translate the team's whole strategy into a concise, evidence-informed policy brief. Preserve its goals and all major components, grouping related interventions into a coordinated policy package where appropriate. Only focus on one component when the report scope explicitly selects it. Explain which government or institutional decisions would advance each component, their implementation responsibilities, funding needs, dependencies and success measures. Lead with a descriptive title, three key messages, and a clear decision or coordinated set of decisions sought. Compare the status quo, the proposed policy approach, and a viable alternative fairly, including benefits, costs, equity, feasibility, and trade-offs at the same decision stage. Explain any phased or deferred components. Research current policy and credible evidence in the relevant jurisdictions. Do not assume one authority can implement a global strategy. Distinguish decision-makers, funders and delivery partners, and verified evidence from proposals, projections and assumptions. Missing evidence may justify assessment or a pilot; it must not silently narrow the strategy. Do not invent laws, statistics, costs, partners, quotes, or achieved results. Use plain, precise, nonpartisan language; aim for 900–1,500 words, allowing up to 2,200 for a complex package. If jurisdiction, decision-maker or authority is unresolved, label the result a working draft and identify what must be confirmed.`;

export const POLICY_BRIEF_REPORT = {
  id: 'policy-brief', title: 'Policy Brief', group: 'policy', badge: 'Policy & action',
  summary: 'Translate your whole strategy into a coordinated policy package, with evidence, responsibilities, and next steps.',
  instruction: POLICY_BRIEF_INSTRUCTION,
};

export function policyBriefPublicUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return '';
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || host === 'localhost' || host.endsWith('.local') ||
        /^[\d.]+$/.test(host) || host.includes(':') ||
        ((host === 'google.com' || host === 'www.google.com') && /^\/(search|url)/.test(url.pathname))) return '';
    return url.href;
  } catch { return ''; }
}

/** Reject incomplete or malformed model output rather than exporting an impressive-looking partial brief. */
export function parsePolicyBrief(value: unknown): PolicyBrief {
  const raw: any = typeof value === 'string'
    ? JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
    : value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid policy brief object.');
  if (raw.version !== undefined && raw.version !== 1 && raw.version !== 2) throw new Error('Unsupported policy brief version.');
  const text = (input: unknown, name: string, max = 2400, optional = false): string => {
    if (typeof input !== 'string' || (!optional && !input.trim()) || input.length > max) {
      throw new Error(`Invalid policy brief field: ${name}; expected ${optional ? '0' : '1'}–${max} characters, received ${typeof input === 'string' ? input.length : 'a non-string'}. Shorten this field without losing its meaning.`);
    }
    // Search-grounded models also use [R1, R2]; normalize these before validation and export.
    return input.trim().replace(/\[R\d+[^\]]*\]/g, (citation) => {
      if (!/^\[R\d+(?:\s*[,;]\s*R?\d+)*\]$/.test(citation)) throw new Error('Malformed policy brief citation. Use [R1] [R2].');
      return (citation.match(/\d+/g) || []).map((id) => `[R${id}]`).join(' ');
    });
  };
  const array = <T>(input: unknown, name: string, min: number, max: number, parse: (v: any) => T): T[] => {
    if (!Array.isArray(input) || input.length < min || input.length > max) throw new Error(`Invalid policy brief list: ${name}; expected ${min}–${max} entries, received ${Array.isArray(input) ? input.length : 'a non-array'}.`);
    return input.map(parse);
  };
  const strings = (input: unknown, name: string, min: number, max: number, length: number) =>
    array(input, name, min, max, (v) => text(v, name, length));
  // An option may contain no external claims. Missing optional citations are equivalent
  // to an empty array; evidence citations and explicitly malformed values stay strict.
  const sourceIds = (input: unknown) => strings(input === undefined && raw.version === 2 ? [] : input, 'sourceIds', 0, 16, 8);
  const references = array<PolicyBriefReference>(raw.references, 'references', 2, 16, (v) => {
    const url = policyBriefPublicUrl(v?.url);
    if (!url || !/^R\d+$/.test(v?.id)) throw new Error('Invalid policy brief reference.');
    return { id: v.id, title: text(v.title, 'reference title', 400), url };
  });
  const ids = new Set(references.map((r) => r.id));
  if (ids.size !== references.length) throw new Error('Duplicate policy brief references.');
  const aboutAuthors = text(raw.aboutAuthors, 'aboutAuthors', 700);
  // Older saved briefs kept the server-supplied names only in the closing attribution.
  const legacyAuthors = aboutAuthors.match(/^Prepared by ([\s\S]+?)\. Based on a strategy developed through Global Solutions Lab\b/)?.[1];
  const brief: PolicyBrief = {
    version: raw.version === 2 ? 2 : 1,
    title: text(raw.title, 'title', 160),
    authors: text(raw.authors ?? legacyAuthors ?? 'Solution team (authorship to confirm)', 'authors', 400),
    audience: text(raw.audience, 'audience', 300),
    jurisdiction: text(raw.jurisdiction, 'jurisdiction', 300),
    decision: text(raw.decision, 'decision', raw.version === 2 ? 1200 : 650),
    statusNote: text(raw.statusNote ?? '', 'statusNote', 450, true),
    keyMessages: strings(raw.keyMessages, 'keyMessages', 3, 3, 550),
    introduction: text(raw.introduction, 'introduction', 1600),
    context: text(raw.context, 'context', 2200),
    evidence: array(raw.evidence, 'evidence', 2, 8, (v) => ({
      finding: text(v?.finding, 'finding', 900),
      implication: text(v?.implication, 'implication', 550),
      sourceIds: strings(v?.sourceIds, 'evidence sourceIds', 1, 16, 8),
      ...(raw.version === 2 ? { supportingFindingIds: strings(v?.supportingFindingIds, 'supporting finding IDs', 1, 12, 8).map((id) => {
        if (!/^F[1-9]\d?$/.test(id)) throw new Error('Invalid supporting finding ID.');
        return id;
      }) } : {}),
    })),
    options: array(raw.options, 'options', 3, 3, (v) => {
      if (!['status-quo', 'preferred', 'alternative'].includes(v?.kind)) throw new Error('Invalid policy option kind.');
      return {
        kind: v.kind, name: text(v.name, 'option name', 160), approach: text(v.approach, 'approach', raw.version === 2 ? 900 : 600),
        benefits: text(v.benefits, 'benefits', raw.version === 2 ? 750 : 550), tradeoffs: text(v.tradeoffs, 'tradeoffs', raw.version === 2 ? 900 : 650),
        feasibility: text(v.feasibility, 'feasibility', raw.version === 2 ? 900 : 650), sourceIds: sourceIds(v.sourceIds),
      };
    }),
    recommendations: array(raw.recommendations, 'recommendations', 3, 8, (v) => ({
      action: text(v?.action, 'action', 650), lead: text(v?.lead, 'lead', 300),
      timing: text(v?.timing, 'timing', 240), resources: text(v?.resources, 'resources', 500),
      measure: text(v?.measure, 'measure', 450),
    })),
    pathway: strings(raw.pathway, 'pathway', 3, 3, 160),
    nextSteps: text(raw.nextSteps, 'nextSteps', 900),
    uncertainties: strings(raw.uncertainties, 'uncertainties', 1, 8, 500),
    aboutAuthors,
    references,
    generatedOn: text(raw.generatedOn, 'generatedOn', 10),
  };
  if (brief.version === 2) {
    if (/^(to (?:be )?confirm(?:ed)?|tbd|unknown|not specified)[.!]?$/i.test(brief.decision)) {
      throw new Error('Describe a proposed decision or coordinated next actions; do not leave the decision as a placeholder. Unconfirmed decision-makers belong in the audience and working-draft note.');
    }
    const strategy = raw.strategy;
    if (!strategy || !['whole-strategy', 'selected-component'].includes(strategy.scope?.mode)) throw new Error('Invalid policy brief scope.');
    const mode = strategy.scope.mode as PolicyBriefScope['mode'];
    const focus = text(strategy.scope.focus, 'scope focus', 500, mode === 'whole-strategy');
    if (mode === 'whole-strategy' && focus) throw new Error('A whole-strategy brief cannot have a component focus.');
    brief.strategy = {
      scope: { mode, focus }, objective: text(strategy.objective, 'strategy objective', 700),
      components: array<PolicyBriefComponent>(strategy.components, 'strategy components', 1, 30, (v) => {
        if (!/^C[1-9]\d?$/.test(v?.id)) throw new Error('Invalid strategy component ID.');
        if (!['included', 'deferred', 'outside-scope'].includes(v?.treatment)) throw new Error('Invalid component treatment.');
        if (mode === 'whole-strategy' && v.treatment === 'outside-scope') throw new Error('A whole-strategy brief must address every component or explain its deferral.');
        const actionIndices = array<number>(v.actionIndices, 'component action links', v.treatment === 'included' ? 1 : 0, 8, (n) => {
          if (!Number.isInteger(n) || n < 1 || n > brief.recommendations.length) throw new Error('Invalid component recommendation link.');
          return n;
        });
        if (new Set(actionIndices).size !== actionIndices.length) throw new Error('Duplicate component recommendation link.');
        return { id: v.id, title: text(v.title, 'component title', 180), sourceQuote: text(v.sourceQuote, 'component source quote', 700),
          treatment: v.treatment, policyResponse: text(v.policyResponse, 'component policy response', 850),
          rationale: text(v.rationale, 'component rationale', 500, v.treatment === 'included'), actionIndices };
      }),
      dependencies: strings(strategy.dependencies, 'implementation dependencies', 1, 8, 500),
      conflicts: strings(strategy.conflicts, 'source conflicts', 0, 8, 500),
    };
    if (new Set(brief.strategy.components.map((c) => c.id)).size !== brief.strategy.components.length) throw new Error('Duplicate strategy component.');
    if (!brief.strategy.components.some((c) => c.treatment === 'included')) throw new Error('The brief must advance at least one strategy component.');
    if (!raw.sourceSnapshot || !/^[a-f0-9]{64}$/.test(raw.sourceSnapshot.sha256) ||
        !Number.isInteger(raw.sourceSnapshot.characters) || raw.sourceSnapshot.characters < 1 || raw.sourceSnapshot.characters > POLICY_BRIEF_SOURCE_LIMIT ||
        raw.sourceSnapshot.generatorVersion !== 'strategy-policy-v2') throw new Error('Invalid policy brief source snapshot.');
    brief.sourceSnapshot = { sha256: raw.sourceSnapshot.sha256, characters: raw.sourceSnapshot.characters, generatorVersion: raw.sourceSnapshot.generatorVersion };
    const usedFindings = new Set(brief.evidence.flatMap((e) => e.supportingFindingIds || []));
    const findings = array<PolicyBriefResearchFinding>(raw.researchFindings, 'research findings', 1, 32, (v) => {
      if (!/^F[1-9]\d?$/.test(v?.id)) throw new Error('Invalid research finding ID.');
      return { id: v.id, text: text(v.text, 'research finding text', 3500), sourceIds: strings(v.sourceIds, 'research finding sources', 1, 16, 8) };
    });
    if (new Set(findings.map((f) => f.id)).size !== findings.length) throw new Error('Duplicate research finding ID.');
    brief.researchFindings = findings.filter((f) => usedFindings.has(f.id));
    for (const item of brief.evidence) {
      const supporting = item.supportingFindingIds!.map((id) => findings.find((f) => f.id === id));
      if (supporting.some((f) => !f)) throw new Error('Evidence cites an unknown research finding.');
      const allowed = new Set(supporting.flatMap((f) => f!.sourceIds));
      if (item.sourceIds.some((id) => !allowed.has(id))) throw new Error('Evidence citations do not match the supporting research findings.');
    }
  }
  if (new Set(brief.options.map((o) => o.kind)).size !== 3) throw new Error('A policy brief needs three distinct option types.');
  if (brief.version === 2 && brief.options.map((o) => o.kind).join(',') !== 'status-quo,preferred,alternative') throw new Error('Order the policy options as status quo, preferred, alternative.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(brief.generatedOn)) throw new Error('Invalid policy brief date.');
  const cited = new Set<string>();
  brief.researchFindings?.forEach((f) => f.sourceIds.forEach((id) => cited.add(id)));
  for (const item of [...brief.evidence, ...brief.options]) item.sourceIds.forEach((id) => cited.add(id));
  const narrative = policyBriefToText({ ...brief, references: [] });
  for (const match of narrative.matchAll(/\[(R\d+)\]/g)) cited.add(match[1]);
  if ([...cited].some((id) => !ids.has(id))) throw new Error('The brief cites an unknown source.');
  if (cited.size < 2) throw new Error('The brief needs at least two distinct cited sources.');
  // References are a bibliography of sources actually used, not a padding list.
  brief.references = brief.references.filter((r) => cited.has(r.id));
  return brief;
}

export function policyBriefScopeLabel(scope: PolicyBriefScope): string {
  return scope.mode === 'whole-strategy' ? 'Whole strategy — coordinated policy package' : `Selected component — ${scope.focus}`;
}

export function policyBriefComponentText(component: PolicyBriefComponent): string {
  const treatment = { included: 'Included', deferred: 'Phased or deferred', 'outside-scope': 'Outside the selected scope' }[component.treatment];
  const actions = component.actionIndices.length ? `Action${component.actionIndices.length > 1 ? 's' : ''} ${component.actionIndices.join(', ')}` : '';
  const label = component.treatment === 'included' ? actions : `${treatment}${actions ? `; ${actions}` : ''}`;
  return `${component.title} (${label})\n${component.policyResponse}${component.rationale ? `\nReason: ${component.rationale}` : ''}`;
}

export function policyBriefToText(b: PolicyBrief): string {
  const citations = (ids: string[]) => ids.map((id) => `[${id}]`).join(' ');
  return [
    b.title, `Policy Brief | ${b.generatedOn}`, `Prepared by: ${b.authors}`, `For: ${b.audience}`, `Jurisdiction: ${b.jurisdiction}`,
    b.statusNote, 'Decision requested:', b.decision,
    ...(b.strategy ? ['Scope and relationship to the strategy:', policyBriefScopeLabel(b.strategy.scope), b.strategy.objective] : []),
    'Key messages:', ...b.keyMessages.map((m) => `• ${m}`),
    'Introduction:', b.introduction, 'Context and importance of the problem:', b.context,
    'Evidence and policy implications:', ...b.evidence.map((e) => `${e.finding} ${citations(e.sourceIds)}\nPolicy implication: ${e.implication}`),
    'Policy options:', ...b.options.map((o) => `${o.name}:\n${o.approach}\nBenefits: ${o.benefits}\nTrade-offs: ${o.tradeoffs}\nFeasibility: ${o.feasibility} ${citations(o.sourceIds)}`),
    'Policy recommendations:', ...b.recommendations.map((r, i) => `${i + 1}. ${r.action}\nLead: ${r.lead}\nProposed timing: ${r.timing}\nResources: ${r.resources}\nSuccess measure: ${r.measure}`),
    'Proposed pathway to impact:', b.pathway.join(' → '),
    'Conclusion and next steps:', b.nextSteps,
    'Evidence gaps and conditions:', ...b.uncertainties.map((u) => `• ${u}`),
    ...(b.strategy ? ['How the strategy is advanced:', ...b.strategy.components.map(policyBriefComponentText),
      'Implementation dependencies:', ...b.strategy.dependencies,
      ...(b.strategy.conflicts.length ? ['Source differences to resolve:', ...b.strategy.conflicts] : [])] : []),
    'About the authors:', b.aboutAuthors,
    'References:', ...b.references.map((r) => `[${r.id}] ${r.title}\n${r.url}`),
    `Sources accessed ${b.generatedOn}.`,
  ].filter(Boolean).join('\n\n');
}
