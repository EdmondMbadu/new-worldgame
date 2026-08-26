export type CampaignGoal = 'awareness' | 'partners' | 'funding' | 'volunteers';

export interface CampaignGenerationSettings {
  brief: string;
  goal: CampaignGoal;
  tone: string;
  focusAreas: string[];
}

export interface CampaignGenerationContext {
  title: string;
  description: string;
  strategyReview: string;
  stepAnswers: Record<string, string>;
  sdgs: string[];
  teamNames: string[];
  imageUrl: string;
  sourceWarning: string;
}

export interface CampaignPlanSection {
  title: string;
  body: string;
  bullets: string[];
}

export interface CampaignPlan {
  metaDescription: string;
  hero: {
    eyebrow: string;
    headline: string;
    summary: string;
    ctaLabel: string;
  };
  problem: CampaignPlanSection;
  vision: CampaignPlanSection;
  solution: CampaignPlanSection;
  impact: CampaignPlanSection;
  implementation: CampaignPlanSection;
  team: CampaignPlanSection;
}

const SECTION_KEYS: Array<keyof Pick<
  CampaignPlan,
  'problem' | 'vision' | 'solution' | 'impact' | 'implementation' | 'team'
>> = ['problem', 'vision', 'solution', 'impact', 'implementation', 'team'];

const text = (value: unknown, max: number): string =>
  String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const list = (value: unknown, maxItems = 5, maxLength = 180): string[] =>
  (Array.isArray(value) ? value : [])
    .map((item) => text(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);

export const richTextToPlainText = (value: unknown, max = 12000): string =>
  String(value || '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<\/?(?:p|div|section|article|h[1-6]|li|br|tr|blockquote)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);

export const normalizeCampaignGoal = (value: unknown): CampaignGoal => {
  const normalized = text(value, 40).toLowerCase();
  return ['awareness', 'partners', 'funding', 'volunteers'].includes(normalized)
    ? (normalized as CampaignGoal)
    : 'awareness';
};

export const buildDefaultCampaignBrief = (
  title: string,
  description: string,
  strategyReview: string
): string => {
  const solutionTitle = text(title, 120) || 'this solution';
  const summary = text(description, 240);
  const hasStrategy = richTextToPlainText(strategyReview, 200).length > 0;
  return text(
    `Create a clear, credible campaign website for ${solutionTitle}. Explain why the problem matters, show the preferred future, describe how the solution works, and make the expected impact and next steps easy to understand. Use an optimistic, evidence-led voice and finish with one simple invitation to share or support the work.${
      summary ? ` Context: ${summary}` : ''
    }${hasStrategy ? ' Treat the completed Strategy Review as the primary source.' : ''}`,
    1200
  );
};

export const buildCampaignGenerationPrompt = (
  context: CampaignGenerationContext,
  settings: CampaignGenerationSettings
): string => {
  const answerLines = Object.keys(context.stepAnswers)
    .sort()
    .map((key) => `${key}: ${richTextToPlainText(context.stepAnswers[key], 1800)}`)
    .filter((line) => line.length > 5)
    .join('\n');
  const source = [
    `TITLE: ${text(context.title, 180)}`,
    `DESCRIPTION: ${text(context.description, 1200)}`,
    `STRATEGY REVIEW (PRIMARY SOURCE):\n${richTextToPlainText(context.strategyReview, 10000)}`,
    `STEP 1–4 ANSWERS (FALLBACK AND DETAIL):\n${answerLines}`,
    `SDGS: ${context.sdgs.map((item) => text(item, 80)).filter(Boolean).join(', ')}`,
    `TEAM: ${context.teamNames.map((item) => text(item, 100)).filter(Boolean).join(', ')}`,
  ].join('\n\n');

  return `You are an editorial website strategist for Global Solutions Lab. Turn the supplied solution material into concise campaign copy.

NON-NEGOTIABLE RULES:
- Use only facts present in SOURCE MATERIAL. Never invent statistics, results, partners, locations, funding, quotations, or claims.
- Strategy Review is authoritative. Use Step 1–4 answers only to clarify or fill gaps.
- If evidence is missing, use careful qualitative language. Do not expose missing-data notes in the copy.
- Keep the page focused: awareness first, one primary call to action, six short sections at most.
- Return valid JSON only, with no markdown fences or commentary.

CREATIVE DIRECTION:
Brief: ${text(settings.brief, 1200)}
Primary goal: ${settings.goal}
Tone: ${text(settings.tone, 100)}
Emphasize: ${settings.focusAreas.map((item) => text(item, 80)).filter(Boolean).join(', ')}

OUTPUT SHAPE:
{
  "metaDescription": "max 220 characters",
  "hero": {
    "eyebrow": "max 50 characters",
    "headline": "max 90 characters",
    "summary": "max 260 characters",
    "ctaLabel": "max 35 characters"
  },
  "problem": { "title": "", "body": "max 650 characters", "bullets": [] },
  "vision": { "title": "", "body": "max 650 characters", "bullets": [] },
  "solution": { "title": "", "body": "max 750 characters", "bullets": ["max 5"] },
  "impact": { "title": "", "body": "max 650 characters", "bullets": ["max 5"] },
  "implementation": { "title": "", "body": "max 650 characters", "bullets": ["max 5"] },
  "team": { "title": "", "body": "max 450 characters", "bullets": [] }
}

SOURCE MATERIAL:
${source}`;
};

export const extractCampaignPlanJson = (value: string): unknown => {
  const cleaned = String(value || '')
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('The campaign response did not contain JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
};

export const normalizeCampaignPlan = (
  value: unknown,
  fallbackTitle: string,
  fallbackDescription: string,
  goal: CampaignGoal
): CampaignPlan => {
  const incoming = value && typeof value === 'object' ? (value as Record<string, any>) : {};
  const hero = incoming['hero'] && typeof incoming['hero'] === 'object'
    ? incoming['hero'] as Record<string, unknown>
    : {};
  const ctaFallback: Record<CampaignGoal, string> = {
    awareness: 'Share this solution',
    partners: 'Connect with the team',
    funding: 'Support this work',
    volunteers: 'Get involved',
  };
  const plan: CampaignPlan = {
    metaDescription: text(incoming['metaDescription'] || fallbackDescription, 220),
    hero: {
      eyebrow: text(hero['eyebrow'] || 'A Global Solutions Lab initiative', 50),
      headline: text(hero['headline'] || fallbackTitle || 'A solution worth sharing', 90),
      summary: text(hero['summary'] || fallbackDescription, 260),
      ctaLabel: text(hero['ctaLabel'] || ctaFallback[goal], 35),
    },
    problem: emptySection(),
    vision: emptySection(),
    solution: emptySection(),
    impact: emptySection(),
    implementation: emptySection(),
    team: emptySection(),
  };
  SECTION_KEYS.forEach((key) => {
    const section = incoming[key] && typeof incoming[key] === 'object'
      ? incoming[key] as Record<string, unknown>
      : {};
    plan[key] = {
      title: text(section['title'], 90),
      body: text(section['body'], key === 'solution' ? 750 : 650),
      bullets: list(section['bullets']),
    };
  });
  if (!plan.hero.summary) plan.hero.summary = 'Discover the strategy, the people, and the path forward.';
  return plan;
};

const emptySection = (): CampaignPlanSection => ({ title: '', body: '', bullets: [] });

const escapeHtml = (value: unknown): string =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const paragraphs = (value: string): string =>
  text(value, 2000)
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');

const sectionMarkup = (id: string, section: CampaignPlanSection, index: number): string => {
  if (!section.title && !section.body && !section.bullets.length) return '';
  const bullets = section.bullets.length
    ? `<ul>${section.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '';
  return `<section class="campaign-section" id="${escapeHtml(id)}">
    <div class="section-number">0${index}</div>
    <div class="section-copy">
      <h2>${escapeHtml(section.title || 'The path forward')}</h2>
      ${paragraphs(section.body)}
      ${bullets}
    </div>
  </section>`;
};

export const renderGeneratedCampaignHtml = (
  plan: CampaignPlan,
  options: {
    title: string;
    slug: string;
    goal: CampaignGoal;
    imageUrl?: string;
    sdgs?: string[];
  }
): string => {
  const campaignUrl = `/campaigns/${encodeURIComponent(options.slug)}`;
  const ctaHash = options.goal === 'awareness' ? 'share' : 'connect';
  const image = /^https:\/\//i.test(options.imageUrl || '')
    ? `<figure class="hero-image"><img src="${escapeHtml(options.imageUrl)}" alt="${escapeHtml(options.title)}"></figure>`
    : '';
  const sdgs = (options.sdgs || []).map((item) => text(item, 80)).filter(Boolean).slice(0, 6);
  const sdgMarkup = sdgs.length
    ? `<div class="sdgs"><span>Aligned with</span>${sdgs.map((item) => `<strong>${escapeHtml(item)}</strong>`).join('')}</div>`
    : '';
  const sections = SECTION_KEYS
    .map((key, index) => sectionMarkup(key, plan[key], index + 1))
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(options.title)}</title>
  <meta name="description" content="${escapeHtml(plan.metaDescription)}">
  <style>
    :root{--ink:#10211b;--green:#0b5b43;--green-2:#087c5b;--mint:#dff7ed;--cream:#f7f4ec;--line:#dce3df;--white:#fff;--muted:#68756f}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--cream);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65}
    a{color:inherit}.campaign-nav{display:flex;justify-content:space-between;align-items:center;gap:20px;width:min(1180px,calc(100% - 40px));margin:auto;padding:24px 0;font-size:13px;font-weight:800;letter-spacing:.04em}.campaign-nav span:last-child{color:var(--green-2)}
    .hero{min-height:76vh;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);align-items:center;gap:64px;width:min(1180px,calc(100% - 40px));margin:auto;padding:64px 0 90px}.hero-copy{max-width:720px}.eyebrow{margin:0 0 18px;color:var(--green-2);font-size:12px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.hero h1{margin:0;font-family:Georgia,"Times New Roman",serif;font-size:clamp(48px,7vw,92px);font-weight:500;letter-spacing:-.055em;line-height:.98}.hero-summary{max-width:650px;margin:26px 0 0;color:var(--muted);font-size:clamp(18px,2vw,23px);line-height:1.65}.cta{display:inline-flex;align-items:center;gap:10px;margin-top:32px;padding:14px 20px;border-radius:999px;color:#fff;background:var(--green);font-weight:850;text-decoration:none}.cta:hover{background:#074b38}.hero-image{aspect-ratio:4/5;margin:0;overflow:hidden;border-radius:28px;background:var(--green)}.hero-image img{width:100%;height:100%;object-fit:cover}
    .campaign-body{background:#fff;border-radius:36px 36px 0 0}.campaign-section{display:grid;grid-template-columns:90px minmax(0,760px);gap:30px;width:min(980px,calc(100% - 40px));margin:auto;padding:90px 0;border-bottom:1px solid var(--line)}.section-number{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;color:var(--green);background:var(--mint);font-size:12px;font-weight:900}.section-copy h2{margin:0 0 22px;font-family:Georgia,"Times New Roman",serif;font-size:clamp(36px,5vw,60px);font-weight:500;letter-spacing:-.04em;line-height:1.05}.section-copy p{margin:0 0 18px;color:#3e4c46;font-size:18px}.section-copy ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:26px 0 0;padding:0;list-style:none}.section-copy li{padding:18px;border:1px solid var(--line);border-radius:16px;background:#fbfcfb;font-weight:650}
    .sdgs{display:flex;flex-wrap:wrap;align-items:center;gap:9px;width:min(980px,calc(100% - 40px));margin:auto;padding:46px 0}.sdgs span{margin-right:8px;color:var(--muted);font-size:12px;font-weight:850;text-transform:uppercase;letter-spacing:.12em}.sdgs strong{padding:7px 11px;border-radius:999px;background:var(--mint);color:var(--green);font-size:12px}
    .closing{padding:100px 20px;text-align:center;background:var(--green);color:#fff}.closing p{margin:0 0 10px;color:#aee8d3;font-size:12px;font-weight:900;letter-spacing:.17em;text-transform:uppercase}.closing h2{max-width:800px;margin:0 auto;font-family:Georgia,"Times New Roman",serif;font-size:clamp(42px,6vw,72px);font-weight:500;letter-spacing:-.045em;line-height:1.04}.closing .cta{color:var(--ink);background:#fff}
    footer{padding:28px 20px;color:#cbe6dc;background:#073d2e;text-align:center;font-size:12px}
    @media(max-width:820px){.hero{min-height:0;grid-template-columns:1fr;gap:36px;padding:40px 0 64px}.hero-image{aspect-ratio:16/10}.campaign-section{grid-template-columns:1fr;gap:18px;padding:64px 0}.section-copy ul{grid-template-columns:1fr}.section-number{width:40px;height:40px}.campaign-nav{padding:18px 0}}
  </style>
</head>
<body>
  <nav class="campaign-nav"><span>Global Solutions Lab</span><span>Solution campaign</span></nav>
  <header class="hero">
    <div class="hero-copy">
      <p class="eyebrow">${escapeHtml(plan.hero.eyebrow)}</p>
      <h1>${escapeHtml(plan.hero.headline)}</h1>
      <p class="hero-summary">${escapeHtml(plan.hero.summary)}</p>
      <a class="cta" href="${campaignUrl}#${ctaHash}" target="_top">${escapeHtml(plan.hero.ctaLabel)} <span aria-hidden="true">→</span></a>
    </div>
    ${image}
  </header>
  <main class="campaign-body">${sections}${sdgMarkup}</main>
  <section class="closing"><p>Help this solution travel further</p><h2>${escapeHtml(plan.hero.ctaLabel)}</h2><a class="cta" href="${campaignUrl}#${ctaHash}" target="_top">Continue <span aria-hidden="true">→</span></a></section>
  <footer>Published with Global Solutions Lab</footer>
</body>
</html>`;
};

const numericTokens = (value: string): string[] =>
  String(value || '').match(/\b\d[\d,.]*(?:%|\+)?/g) || [];

export const findUnsupportedNumericClaims = (
  plan: CampaignPlan,
  sourceText: string
): string[] => {
  const serialized = JSON.stringify(plan);
  const sourceNumbers = new Set(numericTokens(sourceText).map((item) => item.replace(/,/g, '')));
  return Array.from(new Set(numericTokens(serialized).map((item) => item.replace(/,/g, ''))))
    .filter((item) => !sourceNumbers.has(item));
};
