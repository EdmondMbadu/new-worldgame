import { createHash } from 'node:crypto';
import {
  BriefSource,
  eligibleSource,
  normalizeSourceUrl,
  renderBriefSources,
} from './brief-sources';

export const BRIEF_MAX_RESEARCH_PACKS = 18;
export const BRIEF_WEEKLY_AI_BUDGET_USD = 4.25;
export const BRIEF_PACK_RESERVATION_USD = 0.22;
export const BRIEF_HISTORY_WINDOW_MS = 8 * 7 * 24 * 60 * 60 * 1000;

export type BriefTopicId =
  | 'climate_energy'
  | 'food_agriculture'
  | 'water_oceans'
  | 'health_wellbeing'
  | 'education_skills'
  | 'poverty_housing_finance'
  | 'cities_infrastructure'
  | 'jobs_entrepreneurship'
  | 'equality_inclusion'
  | 'peace_governance'
  | 'biodiversity_land'
  | 'circular_economy'
  | 'culture_community'
  | 'technology_partnerships';

type TopicDefinition = {
  id: BriefTopicId;
  label: string;
  sdgs: number[];
  terms: string[];
};

const TOPICS: TopicDefinition[] = [
  { id: 'climate_energy', label: 'Climate and clean energy', sdgs: [7, 13], terms: ['climate', 'carbon', 'emission', 'emissions', 'renewable', 'solar', 'wind', 'energy', 'decarbonization', 'decarbonize', 'decarbonizing', 'atmosphere', 'resilience', 'adaptation', 'heat', 'electricity', 'glacier', 'glaciers', 'polar', 'sea level', 'extreme weather'] },
  { id: 'food_agriculture', label: 'Food systems and agriculture', sdgs: [2], terms: ['food', 'farm', 'farmer', 'farmers', 'agriculture', 'agricultural', 'crop', 'nutrition', 'hunger', 'soil', 'irrigation', 'livestock', 'supply chain', 'food waste', 'protein', 'alternative protein', 'plant based'] },
  { id: 'water_oceans', label: 'Water, sanitation and oceans', sdgs: [6, 14], terms: ['water', 'sanitation', 'wastewater', 'ocean', 'marine', 'fish', 'coastal', 'river', 'drinking water', 'sewage', 'aquatic'] },
  { id: 'health_wellbeing', label: 'Health and wellbeing', sdgs: [3], terms: ['health', 'healthy', 'healthcare', 'medical', 'patient', 'disease', 'infection', 'infections', 'mental health', 'wellbeing', 'hospital', 'caregiver', 'public health', 'maternal', 'mother', 'mothers', 'babies', 'childbirth', 'handwashing', 'disability', 'aging', 'older adults', 'elderly', 'senior care'] },
  { id: 'education_skills', label: 'Education and skills', sdgs: [4], terms: ['education', 'school', 'student', 'teacher', 'learning', 'curriculum', 'literacy', 'training', 'university', 'college', 'youth', 'youth skills'] },
  { id: 'poverty_housing_finance', label: 'Poverty, housing and financial inclusion', sdgs: [1, 10], terms: ['poverty', 'housing', 'homeless', 'homebuyer', 'mortgage', 'financial inclusion', 'income inequality', 'low income', 'affordable housing', 'social protection', 'wealth', 'wealth gap', 'economic inclusion', 'inclusive economy', 'inclusive economies'] },
  { id: 'cities_infrastructure', label: 'Sustainable cities and infrastructure', sdgs: [9, 11], terms: ['city', 'urban', 'transport', 'mobility', 'infrastructure', 'building', 'construction', 'transit', 'public space', 'smart city', 'waste management'] },
  { id: 'jobs_entrepreneurship', label: 'Jobs, livelihoods and entrepreneurship', sdgs: [8], terms: ['job', 'jobs', 'employment', 'worker', 'workforce', 'entrepreneur', 'entrepreneurship', 'livelihood', 'economic opportunity', 'small business', 'business idea', 'pitch deck', 'startup', 'labor', 'career'] },
  { id: 'equality_inclusion', label: 'Equality, gender and social inclusion', sdgs: [5, 10], terms: ['gender', 'women', 'girl', 'equality', 'inequality', 'inequity', 'inequities', 'inclusion', 'inclusive', 'marginalized', 'refugee', 'immigrant', 'indigenous', 'accessibility', 'racial justice'] },
  { id: 'peace_governance', label: 'Peace, justice and governance', sdgs: [16], terms: ['peace', 'justice', 'governance', 'democracy', 'civic', 'conflict', 'violence', 'legal', 'policy', 'human rights', 'institution', 'institutions', 'corruption', 'transparency', 'accountability', 'public services'] },
  { id: 'biodiversity_land', label: 'Biodiversity and land', sdgs: [15], terms: ['biodiversity', 'forest', 'forestry', 'tree', 'trees', 'wildlife', 'ecosystem', 'land restoration', 'conservation', 'species', 'habitat', 'deforestation', 'nature'] },
  { id: 'circular_economy', label: 'Circular economy, waste and pollution', sdgs: [12], terms: ['waste', 'recycling', 'recycle', 'plastic', 'pollution', 'circular economy', 'reuse', 'compost', 'landfill', 'incinerator', 'electronic waste', 'e-waste', 'sustainable beauty', 'cosmetics'] },
  { id: 'culture_community', label: 'Culture, heritage and community life', sdgs: [], terms: ['culture', 'cultural', 'culinary', 'cuisine', 'heritage', 'arts', 'artist', 'music', 'tradition', 'traditions', 'museum', 'creative', 'tourism', 'recipe'] },
  { id: 'technology_partnerships', label: 'Technology and cross-sector partnerships', sdgs: [9, 17], terms: ['technology', 'digital', 'artificial intelligence', ' ai ', 'data', 'platform', 'internet', 'partnership', 'coalition', 'collaboration', 'innovation', 'funding gap', 'sdg finance'] },
];

const TOPIC_BY_ID = new Map(TOPICS.map(topic => [topic.id, topic]));
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'also', 'among', 'because', 'being', 'between',
  'could', 'from', 'have', 'into', 'more', 'most', 'other', 'over', 'project', 'solution',
  'some', 'such', 'their', 'there', 'these', 'they', 'this', 'through', 'using', 'very',
  'want', 'where', 'which', 'while', 'with', 'would', 'your', 'help', 'people', 'world',
  'global', 'create', 'make', 'need', 'needs', 'work', 'working', 'community', 'communities',
  'nbsp', 'that', 'what', 'aren', 'will', 'than', 'then', 'when', 'were', 'been',
]);

type RegionDefinition = { id: string; label: string; terms: string[] };
const REGIONS: RegionDefinition[] = [
  { id: 'north_america', label: 'North America', terms: ['united states', ' usa ', ' u.s.', 'canada', 'mexico', 'philadelphia', 'california', 'new york', 'florida', 'texas', 'chicago', 'boston', 'washington dc'] },
  { id: 'latin_america_caribbean', label: 'Latin America and the Caribbean', terms: ['latin america', 'caribbean', 'brazil', 'colombia', 'argentina', 'chile', 'peru', 'ecuador', 'guatemala', 'haiti', 'jamaica'] },
  { id: 'europe_central_asia', label: 'Europe and Central Asia', terms: ['europe', 'european union', 'united kingdom', 'france', 'germany', 'italy', 'spain', 'netherlands', 'ukraine', 'kazakhstan'] },
  { id: 'sub_saharan_africa', label: 'Sub-Saharan Africa', terms: ['sub-saharan', 'africa', 'ghana', 'nigeria', 'kenya', 'uganda', 'rwanda', 'ethiopia', 'senegal', 'south africa', 'congo', 'tanzania'] },
  { id: 'middle_east_north_africa', label: 'Middle East and North Africa', terms: ['middle east', 'north africa', 'egypt', 'morocco', 'tunisia', 'jordan', 'lebanon', 'israel', 'palestine', 'turkiye', 'turkey'] },
  { id: 'south_asia', label: 'South Asia', terms: ['south asia', 'india', 'pakistan', 'bangladesh', 'nepal', 'sri lanka', 'afghanistan', 'bhutan'] },
  { id: 'east_asia_pacific', label: 'East Asia and the Pacific', terms: ['east asia', 'southeast asia', 'pacific', 'china', 'japan', 'korea', 'indonesia', 'philippines', 'vietnam', 'thailand', 'australia', 'new zealand'] },
];

export type BriefSolutionProfile = {
  primaryTopic: BriefTopicId;
  secondaryTopic?: BriefTopicId;
  topicLabel: string;
  regionId: string;
  regionLabel: string;
  location: string;
  keywords: string[];
  confidence: number;
  signals: string[];
};

export type BriefPackDefinition = {
  id: string;
  label: string;
  topic: BriefTopicId;
  regionId: string;
  editionKey: string;
  recipientCount: number;
  context: string;
};

export type BriefRecipientInput = {
  userEmail: string;
  solutionId: string;
  solutionTitle: string;
  solutionDescription?: string;
  solutionArea?: string;
  sdgs?: string[];
  location?: string;
  briefSelectionSource?: 'user_selected' | 'fallback';
};

export type AssignedBriefRecipient<T extends BriefRecipientInput> = T & {
  briefEditionKey: string;
  briefPackId: string;
  briefProfile: BriefSolutionProfile;
};

export type BriefEditionPlan<T extends BriefRecipientInput> = {
  editionKey: string;
  packs: Record<string, BriefPackDefinition>;
  recipients: AssignedBriefRecipient<T>[];
};

export type BriefHistoryItem = { url: string; sentAt: number; kind: 'news' | 'funding' };

export type PersonalizedBriefContent = {
  fundersHtml: string;
  newsHtml: string;
  validFundersCount: number;
  validNewsCount: number;
  selectedUrls: BriefHistoryItem[];
  quality: {
    packId: string;
    profileConfidence: number;
    newSourceRatio: number;
    matchedKeywords: string[];
  };
};

const normalize = (value: unknown): string => ` ${String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const containsTerm = (normalizedText: string, term: string): boolean => {
  const needle = normalize(term).trim();
  return !!needle && normalizedText.includes(` ${needle} `);
};

function sdgNumbers(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap(value => {
    const match = String(value || '').match(/(?:sdg\s*)?(\d{1,2})/i);
    const number = match ? Number(match[1]) : NaN;
    return Number.isInteger(number) && number >= 1 && number <= 17 ? [number] : [];
  });
}

function keywordList(title: string, area: string, description: string): string[] {
  const weighted = `${title} ${title} ${area} ${area} ${description}`;
  const counts = new Map<string, number>();
  normalize(weighted).trim().split(' ').forEach(token => {
    if (token.length < 4 || STOP_WORDS.has(token) || /^\d+$/.test(token)) return;
    counts.set(token, (counts.get(token) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 14).map(([token]) => token);
}

export function buildBriefSolutionProfile(input: BriefRecipientInput): BriefSolutionProfile {
  const title = String(input.solutionTitle || '').trim();
  const area = String(input.solutionArea || '').trim();
  const description = String(input.solutionDescription || '').trim();
  const titleText = normalize(title);
  const areaText = normalize(area);
  const descriptionText = normalize(description);
  const sdgs = sdgNumbers(input.sdgs);
  const scores = TOPICS.map(topic => {
    let score = topic.sdgs.filter(sdg => sdgs.includes(sdg)).length * 7;
    for (const term of topic.terms) {
      const needle = normalize(term).trim();
      if (!needle) continue;
      if (containsTerm(titleText, needle)) score += 6;
      if (containsTerm(areaText, needle)) score += 4;
      if (containsTerm(descriptionText, needle)) score += 2;
    }
    return { topic, score };
  }).sort((a, b) => b.score - a.score || a.topic.id.localeCompare(b.topic.id));
  const primary = scores[0]?.score ? scores[0] : { topic: TOPIC_BY_ID.get('technology_partnerships')!, score: 0 };
  const secondary = scores[1]?.score >= Math.max(4, primary.score * 0.45) ? scores[1] : undefined;
  const location = String(input.location || '').trim().slice(0, 160);
  const geographicText = normalize(`${location} ${description.slice(0, 1400)}`);
  const region = REGIONS.map(candidate => ({
    candidate,
    score: candidate.terms.reduce((total, term) => total + (containsTerm(geographicText, term) ? 1 : 0), 0),
  })).sort((a, b) => b.score - a.score)[0];
  const regionId = region?.score ? region.candidate.id : 'global';
  const regionLabel = region?.score ? region.candidate.label : 'Global or location not specified';
  const signals = [
    ...sdgs.slice(0, 4).map(number => `SDG ${number}`),
    ...(area ? [area.slice(0, 100)] : []),
    ...(location ? [location] : []),
  ];
  const confidence = Math.max(0.25, Math.min(1, (primary.score + (description.length >= 80 ? 5 : 0) + (sdgs.length ? 4 : 0)) / 22));
  return {
    primaryTopic: primary.topic.id,
    ...(secondary ? { secondaryTopic: secondary.topic.id } : {}),
    topicLabel: primary.topic.label,
    regionId,
    regionLabel,
    location,
    keywords: keywordList(title, area, description),
    confidence: Number(confidence.toFixed(2)),
    signals,
  };
}

function representativeContext<T extends BriefRecipientInput>(recipients: Array<{ recipient: T; profile: BriefSolutionProfile }>): string {
  const keywordCounts = new Map<string, number>();
  recipients.forEach(({ profile }) => profile.keywords.forEach(keyword => keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1)));
  const common = [...keywordCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 18).map(([word]) => word);
  const examples = recipients.slice().sort((a, b) => b.profile.confidence - a.profile.confidence).slice(0, 5).map(({ recipient }) => {
    const summary = String(recipient.solutionDescription || '').replace(/\s+/g, ' ').trim().slice(0, 260);
    return `- ${String(recipient.solutionTitle || 'Untitled').slice(0, 120)}${summary ? `: ${summary}` : ''}`;
  });
  return `Common solution terms: ${common.join(', ') || 'cross-sector social impact'}.\nRepresentative solution needs:\n${examples.join('\n')}`;
}

export function buildBriefEditionPlan<T extends BriefRecipientInput>(
  recipients: T[],
  editionKey: string,
  maxPacks = BRIEF_MAX_RESEARCH_PACKS
): BriefEditionPlan<T> {
  const profiled = recipients.map(recipient => ({ recipient, profile: buildBriefSolutionProfile(recipient) }));
  const activeTopics = [...new Set(profiled.map(item => item.profile.primaryTopic))].sort();
  const basePackIds = new Map(activeTopics.map(topic => [topic, `topic_${topic}_global`]));
  const regionalCounts = new Map<string, number>();
  profiled.forEach(({ profile, recipient }) => {
    if (profile.regionId === 'global') return;
    const key = `topic_${profile.primaryTopic}_region_${profile.regionId}`;
    const weight = recipient.briefSelectionSource === 'user_selected' ? 3 : 1;
    regionalCounts.set(key, (regionalCounts.get(key) || 0) + weight);
  });
  const availableRegionalSlots = Math.max(0, maxPacks - basePackIds.size);
  const selectedRegional = new Set(
    [...regionalCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, availableRegionalSlots).map(([key]) => key)
  );
  const assignments = profiled.map(item => {
    const regionalKey = `topic_${item.profile.primaryTopic}_region_${item.profile.regionId}`;
    const packId = item.profile.regionId !== 'global' && selectedRegional.has(regionalKey)
      ? regionalKey
      : basePackIds.get(item.profile.primaryTopic)!;
    return { ...item, packId };
  });
  const packs: Record<string, BriefPackDefinition> = {};
  const grouped = new Map<string, typeof assignments>();
  assignments.forEach(item => {
    if (!grouped.has(item.packId)) grouped.set(item.packId, []);
    grouped.get(item.packId)!.push(item);
  });
  grouped.forEach((items, id) => {
    const first = items[0].profile;
    const topic = TOPIC_BY_ID.get(first.primaryTopic)!;
    const regionId = id.includes('_region_') ? first.regionId : 'global';
    const regionLabel = regionId === 'global' ? 'global and broadly accessible opportunities' : first.regionLabel;
    packs[id] = {
      id,
      label: `${topic.label} — ${regionLabel}`,
      topic: topic.id,
      regionId,
      editionKey,
      recipientCount: items.length,
      context: JSON.stringify({
        edition: editionKey,
        researchCohort: topic.label,
        geography: regionLabel,
        focusTerms: topic.terms,
        instructions: 'Build a diverse evidence pool, not generic advice. Funding must be from an official program page and must either explicitly serve this geography or be genuinely global. Prefer specific research, programs, and organizations that address the representative needs.',
        representativeNeeds: representativeContext(items),
      }),
    };
  });
  return {
    editionKey,
    packs,
    recipients: assignments.map(({ recipient, profile, packId }) => ({
      ...recipient,
      briefEditionKey: editionKey,
      briefPackId: packId,
      briefProfile: profile,
    })),
  };
}

function hashNumber(value: string): number {
  return parseInt(createHash('sha256').update(value).digest('hex').slice(0, 8), 16);
}

function sourceMatchesRegion(source: BriefSource, profile: BriefSolutionProfile): boolean {
  if (profile.regionId === 'global' || source.kind !== 'funding') return true;
  const text = normalize([source.title, source.relevance, source.eligibility, source.evidence].join(' '));
  const region = REGIONS.find(item => item.id === profile.regionId);
  const locationTerms = normalize(profile.location).trim().split(' ').filter(token => token.length >= 4);
  const explicit = [...(region?.terms || []), ...locationTerms, 'global', 'worldwide', 'international', 'all countries', 'any country'];
  return explicit.some(term => containsTerm(text, term));
}

function personalizedSelection(
  sources: BriefSource[],
  kind: 'news' | 'funding',
  profile: BriefSolutionProfile,
  solutionTitle: string,
  recent: Set<string>,
  seed: string
): BriefSource[] {
  const topic = TOPIC_BY_ID.get(profile.primaryTopic)!;
  const scored = sources.filter(source => source.kind === kind && eligibleSource(source) && sourceMatchesRegion(source, profile)).map(source => {
    const text = normalize([source.title, source.publisher, source.relevance, source.evidence, source.eligibility].join(' '));
    const matchedKeywords = profile.keywords.filter(keyword => containsTerm(text, keyword)).slice(0, 4);
    const matchedTopic = topic.terms.filter(term => containsTerm(text, term)).slice(0, 3);
    const topicalScore = matchedKeywords.length * 7 + matchedTopic.length * 3;
    const url = normalizeSourceUrl(source.url);
    const seenPenalty = recent.has(url) ? 45 : 0;
    const jitter = hashNumber(`${seed}:${url}`) % 9;
    return { source, url, matchedKeywords, matchedTopic, score: source.score + topicalScore + jitter - seenPenalty, seen: recent.has(url) };
  }).filter(item => item.matchedKeywords.length > 0 || item.matchedTopic.length > 0);
  scored.sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
  const chosen: typeof scored = [];
  const hosts = new Set<string>();
  const add = (item: typeof scored[number]) => {
    let host = '';
    try { host = new URL(item.url).hostname.replace(/^www\./, ''); } catch { return; }
    if (!item.url || hosts.has(host) || chosen.some(existing => existing.url === item.url)) return;
    hosts.add(host); chosen.push(item);
  };
  scored.filter(item => !item.seen).forEach(item => { if (chosen.length < 4) add(item); });
  scored.filter(item => item.seen).forEach(item => { if (chosen.length < 3) add(item); });
  return chosen.map((item, index) => {
    const matches = [...new Set([...item.matchedKeywords, ...item.matchedTopic])].slice(0, 3);
    const focus = matches.length ? matches.join(', ') : topic.label.toLowerCase();
    const geography = profile.regionId !== 'global' ? ` in or accessible to ${profile.regionLabel}` : '';
    const prefix = kind === 'funding' ? 'Potential fit—confirm final applicant eligibility.' : 'Why this is relevant.';
    return {
      ...item.source,
      score: Math.max(75, 100 - index),
      relevance: `${prefix} It addresses ${focus}${geography}, which overlaps with “${solutionTitle}”. ${item.source.relevance}`.slice(0, 700),
    };
  });
}

export function personalizeBriefContent(
  sources: BriefSource[],
  profile: BriefSolutionProfile,
  solutionTitle: string,
  packId: string,
  recipientSeed: string,
  history: BriefHistoryItem[] = [],
  now = Date.now()
): PersonalizedBriefContent {
  const recent = new Set(history.filter(item => item.sentAt >= now - BRIEF_HISTORY_WINDOW_MS).map(item => normalizeSourceUrl(item.url)));
  const funding = personalizedSelection(sources, 'funding', profile, solutionTitle, recent, `${recipientSeed}:funding`);
  const news = personalizedSelection(sources, 'news', profile, solutionTitle, recent, `${recipientSeed}:news`);
  const selectedUrls: BriefHistoryItem[] = [...funding, ...news].map(source => ({ url: normalizeSourceUrl(source.url), sentAt: now, kind: source.kind }));
  const newCount = selectedUrls.filter(item => !recent.has(item.url)).length;
  const selectedText = normalize([...funding, ...news].map(source => `${source.title} ${source.relevance}`).join(' '));
  const matchedKeywords = profile.keywords.filter(keyword => containsTerm(selectedText, keyword)).slice(0, 8);
  return {
    fundersHtml: renderBriefSources(funding, 'funding'),
    newsHtml: renderBriefSources(news, 'news'),
    validFundersCount: funding.length,
    validNewsCount: news.length,
    selectedUrls,
    quality: {
      packId,
      profileConfidence: profile.confidence,
      newSourceRatio: selectedUrls.length ? Number((newCount / selectedUrls.length).toFixed(2)) : 1,
      matchedKeywords,
    },
  };
}

export function briefRecipientHistoryId(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 40);
}

export function mergeBriefHistory(existing: BriefHistoryItem[], additions: BriefHistoryItem[], now = Date.now()): BriefHistoryItem[] {
  const byUrl = new Map<string, BriefHistoryItem>();
  [...existing, ...additions].forEach(item => {
    const url = normalizeSourceUrl(item.url);
    if (!url || item.sentAt < now - BRIEF_HISTORY_WINDOW_MS) return;
    const prior = byUrl.get(url);
    if (!prior || item.sentAt > prior.sentAt) byUrl.set(url, { ...item, url });
  });
  return [...byUrl.values()].sort((a, b) => b.sentAt - a.sentAt).slice(0, 80);
}
