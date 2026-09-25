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

export interface PolicyBrief {
  version: 1;
  title: string;
  authors: string;
  audience: string;
  jurisdiction: string;
  decision: string;
  statusNote: string;
  keyMessages: string[];
  introduction: string;
  context: string;
  evidence: Array<{ finding: string; implication: string; sourceIds: string[] }>;
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

export const POLICY_BRIEF_INSTRUCTION = `Turn this solution into a concise, evidence-informed policy brief for a specific government or institutional decision-maker. Lead with a descriptive title, three key messages, and one concrete decision sought. Explain the problem, its roots, urgency, and the consequences of inaction. Research current policy and credible evidence in the relevant jurisdiction. Compare the status quo, the proposed policy approach, and a viable alternative fairly, including benefits, costs, equity, feasibility, and trade-offs. Recommend specific actions with a responsible institution, proposed timing, resource implications, and success measures. Include a simple proposed pathway to impact, immediate next steps, key evidence gaps, author attribution, and linked references. Distinguish verified evidence from the team's proposals, projections, and assumptions. Do not invent laws, statistics, costs, partners, quotes, or achieved results. Use plain, precise, nonpartisan language; keep the main brief around 900–1,200 words. If the jurisdiction or decision-maker cannot be established, clearly label the result a working draft and identify what must be confirmed.`;

export const POLICY_BRIEF_REPORT = {
  id: 'policy-brief', title: 'Policy Brief', group: 'policy', badge: 'Policy & action',
  summary: 'An evidence-informed brief with policy options, recommendations, and next steps.',
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
  const sourceIds = (input: unknown) => strings(input, 'sourceIds', 0, 16, 8);
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
    version: 1,
    title: text(raw.title, 'title', 160),
    authors: text(raw.authors ?? legacyAuthors ?? 'Solution team (authorship to confirm)', 'authors', 400),
    audience: text(raw.audience, 'audience', 300),
    jurisdiction: text(raw.jurisdiction, 'jurisdiction', 300),
    decision: text(raw.decision, 'decision', 650),
    statusNote: text(raw.statusNote ?? '', 'statusNote', 450, true),
    keyMessages: strings(raw.keyMessages, 'keyMessages', 3, 3, 550),
    introduction: text(raw.introduction, 'introduction', 1600),
    context: text(raw.context, 'context', 2200),
    evidence: array(raw.evidence, 'evidence', 2, 4, (v) => ({
      finding: text(v?.finding, 'finding', 900),
      implication: text(v?.implication, 'implication', 550),
      sourceIds: strings(v?.sourceIds, 'evidence sourceIds', 1, 16, 8),
    })),
    options: array(raw.options, 'options', 3, 3, (v) => {
      if (!['status-quo', 'preferred', 'alternative'].includes(v?.kind)) throw new Error('Invalid policy option kind.');
      return {
        kind: v.kind, name: text(v.name, 'option name', 160), approach: text(v.approach, 'approach', 600),
        benefits: text(v.benefits, 'benefits', 550), tradeoffs: text(v.tradeoffs, 'tradeoffs', 650),
        feasibility: text(v.feasibility, 'feasibility', 650), sourceIds: sourceIds(v.sourceIds),
      };
    }),
    recommendations: array(raw.recommendations, 'recommendations', 3, 4, (v) => ({
      action: text(v?.action, 'action', 650), lead: text(v?.lead, 'lead', 300),
      timing: text(v?.timing, 'timing', 240), resources: text(v?.resources, 'resources', 500),
      measure: text(v?.measure, 'measure', 450),
    })),
    pathway: strings(raw.pathway, 'pathway', 3, 3, 160),
    nextSteps: text(raw.nextSteps, 'nextSteps', 900),
    uncertainties: strings(raw.uncertainties, 'uncertainties', 1, 4, 500),
    aboutAuthors,
    references,
    generatedOn: text(raw.generatedOn, 'generatedOn', 10),
  };
  if (new Set(brief.options.map((o) => o.kind)).size !== 3) throw new Error('A policy brief needs three distinct option types.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(brief.generatedOn)) throw new Error('Invalid policy brief date.');
  const cited = new Set<string>();
  for (const item of [...brief.evidence, ...brief.options]) item.sourceIds.forEach((id) => cited.add(id));
  const narrative = JSON.stringify({ ...brief, references: [] });
  for (const match of narrative.matchAll(/\[(R\d+)\]/g)) cited.add(match[1]);
  if ([...cited].some((id) => !ids.has(id))) throw new Error('The brief cites an unknown source.');
  if (cited.size < 2) throw new Error('The brief needs at least two distinct cited sources.');
  // References are a bibliography of sources actually used, not a padding list.
  brief.references = brief.references.filter((r) => cited.has(r.id));
  return brief;
}

export function policyBriefToText(b: PolicyBrief): string {
  const citations = (ids: string[]) => ids.map((id) => `[${id}]`).join(' ');
  return [
    b.title, `Policy Brief | ${b.generatedOn}`, `Prepared by: ${b.authors}`, `For: ${b.audience}`, `Jurisdiction: ${b.jurisdiction}`,
    b.statusNote, 'Decision requested:', b.decision,
    'Key messages:', ...b.keyMessages.map((m) => `• ${m}`),
    'Introduction:', b.introduction, 'Context and importance of the problem:', b.context,
    'Evidence and policy implications:', ...b.evidence.map((e) => `${e.finding} ${citations(e.sourceIds)}\nPolicy implication: ${e.implication}`),
    'Policy options:', ...b.options.map((o) => `${o.name}:\n${o.approach}\nBenefits: ${o.benefits}\nTrade-offs: ${o.tradeoffs}\nFeasibility: ${o.feasibility} ${citations(o.sourceIds)}`),
    'Policy recommendations:', ...b.recommendations.map((r, i) => `${i + 1}. ${r.action}\nLead: ${r.lead}\nProposed timing: ${r.timing}\nResources: ${r.resources}\nSuccess measure: ${r.measure}`),
    'Proposed pathway to impact:', b.pathway.join(' → '),
    'Conclusion and next steps:', b.nextSteps,
    'Evidence gaps and conditions:', ...b.uncertainties.map((u) => `• ${u}`),
    'About the authors:', b.aboutAuthors,
    'References:', ...b.references.map((r) => `[${r.id}] ${r.title}\n${r.url}`),
    `Sources accessed ${b.generatedOn}.`,
  ].filter(Boolean).join('\n\n');
}
