import {
  BriefSource, DAY_MS, evidenceInPage, fetchSourcePage, pageProblem, selectBriefSources,
} from './brief-sources';

type BackupSource = Pick<BriefSource, 'kind' | 'title' | 'url' | 'publisher' | 'relevance' | 'evidence'> &
  Partial<Pick<BriefSource, 'date' | 'eligibility' | 'nextAction'>> & {
    pageMarker: string;
    unavailable?: (now: number) => boolean;
  };

// Broadly applicable reading and funding leads for bulk recipients whose topic
// pack comes up short. Keep claims and dates tied to the named publisher.
const backupSources: BackupSource[] = [
  {
    kind: 'funding',
    title: 'Emergent Ventures grants',
    url: 'https://mercatus.tfaforms.net/5099527',
    publisher: 'Mercatus Center',
    relevance: 'A potential fit for an unusual project that could improve lives at scale.',
    evidence: 'We encourage applications from all ages and all parts of the world',
    pageMarker: 'To be eligible for an EV grant, all applicants must be 13 years of age or older',
    eligibility: 'Applicants ages 13 and older may apply worldwide. The funder accepts AI use for proofreading only.',
    nextAction: 'Review the official application',
  },
  {
    kind: 'funding',
    title: 'The Awesome Foundation microgrants',
    url: 'https://www.awesomefoundation.org/en/faq',
    publisher: 'The Awesome Foundation',
    relevance: 'A small grant can help you test a community project. Look for a local or thematic chapter that fits your work.',
    evidence: 'Anyone is eligible for a grant — individuals, groups, and organizations alike.',
    pageMarker: 'Most chapters show a strong preference for projects that contribute to their own communities',
    eligibility: 'Individuals, groups and organizations can apply. Chapter preferences and funding cycles vary.',
    nextAction: 'Find a chapter and check its criteria',
  },
  {
    kind: 'funding',
    title: 'The Pollination Project Daily Grants',
    url: 'https://thepollinationproject.org/apply/',
    publisher: 'The Pollination Project',
    relevance: 'Seed funding may help volunteer teams move a small charitable project from planning to implementation.',
    evidence: 'We fund individuals, informally organized groups, and early-stage nonprofits based anywhere in the world',
    pageMarker: 'They will re-open on January 1st, 2027',
    eligibility: 'Open to early-stage, volunteer-led charitable work worldwide. Check the funder’s project and organization budget limits.',
    nextAction: 'Review eligibility and check the application window',
    unavailable: now => now >= Date.parse('2026-12-01T04:59:00Z') && now < Date.parse('2027-01-01T05:00:00Z'),
  },
  {
    kind: 'news',
    title: 'Delivering as One: Small Investments, Greater Possibilities for Mali',
    url: 'https://www.jointsdgfund.org/article/delivering-one-small-investments-greater-possibilities-mali',
    publisher: 'Joint SDG Fund',
    relevance: 'See how teams in Mali are using small investments to build evidence for larger projects in health, energy, agriculture and education.',
    evidence: 'solar power now helps health workers keep essential services running, including emergency care and vaccine storage',
    pageMarker: 'Published on October 29, 2026',
    date: '2026-10-29',
  },
  {
    kind: 'news',
    title: 'Beyond Financing: How the Joint SDG Fund Is Helping the UN Work Differently in Colombia',
    url: 'https://www.jointsdgfund.org/article/beyond-financing-how-joint-sdg-fund-helping-un-work-differently-colombia',
    publisher: 'Joint SDG Fund',
    relevance: 'A look at how teams can build partnerships and pilot ideas that local organizations can scale, with examples from food systems, finance and digital inclusion.',
    evidence: 'A facility is also a laboratory. It pilots a solution, builds evidence, and hands the result to local or sectoral actors who can scale it.',
    pageMarker: 'Published on November 2, 2026',
    date: '2026-11-02',
  },
  {
    kind: 'news',
    title: 'UNDP and Tanzania support 49 community-led environmental projects',
    url: 'https://www.undp.org/tanzania/press-releases/undp-and-government-tanzania-commit-tzs-52-billion-support-49-community-led-environmental-projects',
    publisher: 'UNDP',
    relevance: 'This example shows how locally led conservation projects can work with public and funding partners to expand their reach.',
    evidence: 'grants to spearhead community-led environmental conservation and sustainable development initiatives',
    pageMarker: 'November 6, 2026',
    date: '2026-11-06',
  },
];

export async function loadWeeklyBriefFallback(now = Date.now(), fetchPage = fetchSourcePage): Promise<BriefSource[]> {
  const candidates = backupSources.filter(source =>
    !source.unavailable?.(now) && (!source.date || now - Date.parse(source.date) <= 90 * DAY_MS)
  );
  const checked = await Promise.all(candidates.map(async (candidate): Promise<BriefSource | null> => {
    try {
      const page = await fetchPage(candidate.url);
      if (pageProblem(page) || !evidenceInPage(candidate.pageMarker, page.text, 12) ||
          !evidenceInPage(candidate.evidence, page.text)) return null;
      if (candidate.kind === 'funding' &&
          /\b(?:applications? (?:are |is |have |has )?(?:now )?closed|no longer accepting applications)\b/i.test(page.text)) return null;

      const { unavailable, pageMarker, ...source } = candidate;
      return {
        ...source,
        url: page.url,
        date: candidate.date || '',
        deadline: '',
        eligibility: candidate.eligibility || '',
        nextAction: candidate.nextAction || 'Read the article',
        checkedAt: now,
        score: 90,
        status: 'verified' as const,
        reason: 'Publisher and supporting evidence checked for this edition',
      };
    } catch {
      return null;
    }
  }));
  return checked.filter((source): source is BriefSource => !!source);
}

export function hasWeeklyBriefFallback(sources: BriefSource[], now = Date.now()): boolean {
  return Boolean(selectBriefSources(sources, 'funding', now).length && selectBriefSources(sources, 'news', now).length);
}
