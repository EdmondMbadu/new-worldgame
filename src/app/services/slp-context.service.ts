import { Injectable } from '@angular/core';
import { Solution } from '../models/solution';
import { map, Observable, of } from 'rxjs';
import { SolutionService } from './solution.service';

export type SlpLane = 'publish' | 'fund' | 'partner';

export interface SlpLocationContext {
  city?: string;
  country?: string;
  source?: 'profile' | 'manual' | 'guest' | 'none';
}

export interface SlpLinkItem {
  label: string;
  icon?: string;
  detail?: string;
  route?: any[] | string;
  queryParams?: Record<string, string>;
  href?: string;
  external?: boolean;
}

export interface SlpNavItem extends SlpLinkItem {
  lane?: SlpLane;
  state?: 'complete' | 'active' | 'idle';
}

export interface SlpStat {
  label: string;
  value: string;
  detail: string;
}

export interface SlpActionCard {
  label: string;
  title: string;
  description: string;
  fitScore: number;
  icon: string;
  meta: string[];
  cta: string;
  badge?: string;
  route?: any[] | string;
  queryParams?: Record<string, string>;
  href?: string;
  external?: boolean;
}

export interface SlpChecklistItem {
  label: string;
  detail: string;
  complete: boolean;
}

export interface SlpIntentCard {
  label: string;
  description: string;
  icon: string;
  lane?: SlpLane;
  route?: any[] | string;
}

export interface SlpTier {
  label: string;
  subtitle: string;
  active: boolean;
}

export interface SlpScopeOption {
  label: string;
  active: boolean;
}

export interface SlpShellViewModel {
  phase: string;
  solutionTitle: string;
  solutionSummary: string;
  stageLabel: string;
  primaryLaneLabel: string;
  intro: string;
  statusText: string;
  image?: string;
  hasSolution: boolean;
  sideNav: SlpNavItem[];
  quickLinks: SlpLinkItem[];
  topLinks: SlpLinkItem[];
  footerLinks: SlpLinkItem[];
  summaryCta: string;
  summaryRoute?: any[] | string;
  summaryQueryParams?: Record<string, string>;
  previewCta: string;
  previewRoute?: any[] | string;
  previewQueryParams?: Record<string, string>;
}

export interface SlpPublishViewModel {
  shell: SlpShellViewModel;
  solutionTitle: string;
  solutionSummary: string;
  heroTitle: string;
  heroDescription: string;
  stats: SlpStat[];
  facts: Array<{ label: string; value: string }>;
  intents: SlpIntentCard[];
  categoryLine: string;
  sortLabel: string;
  resources: SlpActionCard[];
  quickActions: SlpLinkItem[];
  checklist: SlpChecklistItem[];
  editorialNote: string;
  nextStep: string;
}

export interface SlpFundViewModel {
  shell: SlpShellViewModel;
  heroTitle: string;
  heroDescription: string;
  stats: SlpStat[];
  tiers: SlpTier[];
  resources: SlpActionCard[];
  postureTitle: string;
  postureDescription: string;
  askFramework: string[];
  nextMove: string;
}

export interface SlpPartnerViewModel {
  shell: SlpShellViewModel;
  heroTitle: string;
  heroDescription: string;
  stats: SlpStat[];
  scopes: SlpScopeOption[];
  collaborationCards: SlpActionCard[];
  quickActions: SlpLinkItem[];
  insightStats: SlpStat[];
  outreachTitle: string;
  outreachTemplate: string[];
  guidanceNote: string;
}

interface SlpBaseContext {
  solutionId?: string;
  hasSolution: boolean;
  solutionTitle: string;
  solutionSummary: string;
  authorName: string;
  focusArea: string;
  stageLabel: string;
  participantCount: number;
  documentCount: number;
  evaluationCount: number;
  discussionCount: number;
  readyAssetCount: number;
  readinessScore: number;
  primaryLane: SlpLane;
  primaryLaneLabel: string;
  laneReason: string;
  image?: string;
  routes: {
    launch: any[] | string;
    publish: any[] | string;
    fund: any[] | string;
    partner: any[] | string;
    dashboard: any[] | string;
    details: any[] | string;
    documents: any[] | string;
    discussion: any[] | string;
    meeting: any[] | string;
    join: any[] | string;
    publicView: any[] | string;
    externalView: any[] | string;
    library: any[] | string;
    contact: any[] | string;
    pricing: any[] | string;
  };
  shell: SlpShellViewModel;
  nextStep: string;
}

interface SlpPublicationCatalogEntry {
  label: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  cta: string;
  baseScore: number;
  region: 'global' | 'north-america' | 'europe' | 'africa' | 'india' | 'asia-pacific';
  badge: string;
  tags: string[];
  meta: string[];
}

interface SlpFundingCatalogEntry {
  label: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  cta: string;
  baseScore: number;
  region: 'global' | 'north-america' | 'europe' | 'africa' | 'india' | 'asia-pacific';
  badge: string;
  tags: string[];
  meta: string[];
}

interface SlpPartnerCatalogEntry {
  label: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  cta: string;
  baseScore: number;
  region: 'global' | 'north-america' | 'europe' | 'africa' | 'india' | 'asia-pacific';
  badge: string;
  tags: string[];
  meta: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SlpContextService {
  constructor(private solutionService: SolutionService) {}

  getPublishViewModel(
    solutionId?: string,
    location: SlpLocationContext = {}
  ): Observable<SlpPublishViewModel> {
    return this.getBaseContext(solutionId).pipe(
      map((context) => {
        const hasLocation = this.hasLocation(location);
        const locationLabel = this.formatLocation(location);
        const resources = this.buildPublishResources(context, location);

        const checklist: SlpChecklistItem[] = [
          {
            label: 'Core summary is present',
            detail: 'A concise explanation exists for what the solution is and why it matters.',
            complete: context.solutionSummary.length > 80,
          },
          {
            label: 'Visual or file support exists',
            detail: 'At least one image or supporting document is available for launch packaging.',
            complete: !!context.image || context.documentCount > 0,
          },
          {
            label: 'Team signal is visible',
            detail: 'The project has more than one active participant, which strengthens external trust.',
            complete: context.participantCount > 1,
          },
          {
            label: 'Feedback loop exists',
            detail: 'The solution has discussion or evaluation activity to shape the final outward story.',
            complete: context.evaluationCount > 0 || context.discussionCount > 0,
          },
        ];

        return {
          shell: context.shell,
          solutionTitle: context.solutionTitle,
          solutionSummary: context.solutionSummary,
          heroTitle: context.hasSolution
            ? `Match ${context.solutionTitle} to real publication channels.`
            : 'Match your solution to real publication channels.',
          heroDescription: context.hasSolution
            ? hasLocation
              ? `These recommendations are ranked from the actual solution data for ${context.solutionTitle} and tuned for ${locationLabel}. We blend location-aware discovery lanes with actual publication platforms that fit the solution’s theme and maturity.`
              : `These recommendations are ranked from the actual solution data for ${context.solutionTitle}. Add city and country to bring local and regional publication channels into the mix.`
            : 'This publish lane maps a solution to publication channels, discovery routes, and story surfaces.',
          stats: [
            {
              label: 'Matched places',
              value: this.formatCount(resources.length),
              detail: hasLocation
                ? `Ranked with local and regional weighting for ${locationLabel}.`
                : 'Add city and country to surface nearby publication routes.',
            },
            {
              label: 'Location target',
              value: hasLocation ? this.truncate(locationLabel, 18) : 'Pending',
              detail: hasLocation
                ? `Source: ${location.source === 'profile' ? 'profile' : location.source === 'manual' ? 'saved here' : 'this browser'}`
                : 'No city/country set yet.',
            },
            {
              label: 'Launch readiness',
              value: `${context.readinessScore}%`,
              detail: context.laneReason,
            },
          ],
          facts: [
            { label: 'Focus', value: context.focusArea },
            { label: 'Stage', value: context.stageLabel },
            {
              label: 'Location',
              value: hasLocation ? locationLabel : 'Add city + country',
            },
            {
              label: 'Publication mix',
              value: hasLocation ? 'Local + regional + global' : 'Regional + global',
            },
          ],
          intents: this.buildIntents(context),
          categoryLine: context.hasSolution
            ? hasLocation
              ? `Showing ${resources.length} publication options tuned for ${locationLabel}`
              : `Showing ${resources.length} publication options for ${context.focusArea}`
            : 'Showing publication options for your next solution',
          sortLabel: hasLocation ? 'Best fit + local relevance' : 'Best fit first',
          resources,
          quickActions: this.buildPublishQuickActions(context),
          checklist,
          editorialNote: context.hasSolution
            ? hasLocation
              ? `Start with one high-fit local or regional channel in ${locationLabel}, then widen to global platforms once the story lands cleanly.`
              : `Start with one high-fit channel, then add city and country so the list can surface stronger local and regional publication targets.`
            : 'A good launch sequence starts with one clear audience, one credible surface, and one proof-backed story.',
          nextStep: context.nextStep,
        };
      })
    );
  }

  getFundViewModel(
    solutionId?: string,
    location: SlpLocationContext = {}
  ): Observable<SlpFundViewModel> {
    return this.getBaseContext(solutionId).pipe(
      map((context) => {
        const activeTier = this.getFundingTier(context);
        const fundingResources = this.buildFundingResources(context, location);
        const locationLabel = this.formatLocation(location);
        const hasLocation = this.hasLocation(location);

        return {
          shell: context.shell,
          heroTitle: context.hasSolution
            ? `Find real funding routes for ${context.solutionTitle}.`
            : 'Find real funding routes for this solution.',
          heroDescription: context.hasSolution
            ? hasLocation
              ? `These funding matches use the actual solution profile plus ${locationLabel} to balance local discovery, regional funding ecosystems, and global capital sources.`
              : `These funding matches use the actual solution profile. Add city and country to improve local and regional funding relevance.`
            : 'Use this lane to map a solution to concrete funding paths.',
          stats: [
            {
              label: 'Funding matches',
              value: this.formatCount(fundingResources.length),
              detail: hasLocation
                ? `Ranked with local and regional weighting for ${locationLabel}.`
                : 'Add location to improve local and regional funding relevance.',
            },
            {
              label: 'Funding readiness',
              value: `${context.readinessScore}%`,
              detail: 'Based on story, evidence, team signal, and assets already in the workspace.',
            },
            {
              label: 'Suggested lane',
              value: activeTier.label,
              detail: activeTier.subtitle,
            },
          ],
          tiers: [
            { label: 'Tier 1', subtitle: 'Micro-grants and pilot support', active: activeTier.label === 'Tier 1' },
            { label: 'Tier 2', subtitle: 'Mid-scale program funding', active: activeTier.label === 'Tier 2' },
            { label: 'Tier 3', subtitle: 'Institutional and strategic capital', active: activeTier.label === 'Tier 3' },
          ],
          resources: fundingResources,
          postureTitle: `${activeTier.label} is the right first funding posture`,
          postureDescription:
            activeTier.label === 'Tier 1'
              ? 'Start with faster and lighter capital sources that help validate the story without overengineering the ask.'
              : activeTier.label === 'Tier 2'
                ? 'The solution can support program-level asks if the proof, scope, and use-of-funds narrative remain tight.'
                : 'The solution profile is mature enough to justify strategic funding conversations with larger institutional backers.',
          askFramework: [
            `Problem: ${context.solutionSummary}`,
            `Why now: ${context.stageLabel} with ${context.readyAssetCount} launch signals already visible in the workspace.`,
            hasLocation
              ? `Where to start: prioritize funders that already support work in or around ${locationLabel}.`
              : `Where to start: begin with high-fit global funders, then add city and country to localize the list.`,
          ],
          nextMove: context.nextStep,
        };
      })
    );
  }

  getPartnerViewModel(
    solutionId?: string,
    location: SlpLocationContext = {}
  ): Observable<SlpPartnerViewModel> {
    return this.getBaseContext(solutionId).pipe(
      map((context) => {
        const activeScope = this.getPartnerScope(context);
        const partnerResources = this.buildPartnerResources(context, location);
        const hasLocation = this.hasLocation(location);
        const locationLabel = this.formatLocation(location);

        return {
          shell: context.shell,
          heroTitle: context.hasSolution
            ? `Find real partner ecosystems for ${context.solutionTitle}.`
            : 'Find real partner ecosystems for this solution.',
          heroDescription: context.hasSolution
            ? hasLocation
              ? `These partner targets blend the solution profile with ${locationLabel} so you can start with the strongest nearby or regionally relevant ecosystems and then widen outward.`
              : `These partner targets are ranked from the solution profile. Add city and country to improve local and regional ecosystem relevance.`
            : 'Use the partner lane to map a solution to real collaboration ecosystems.',
          stats: [
            {
              label: 'Partner targets',
              value: this.formatCount(partnerResources.length),
              detail: hasLocation
                ? `Ranked with local and regional weighting for ${locationLabel}.`
                : 'Add location to improve nearby ecosystem matching.',
            },
            {
              label: 'Active collaborators',
              value: this.formatCount(context.participantCount),
              detail: 'People already visible in the solution workspace.',
            },
            {
              label: 'Coordination score',
              value: `${Math.min(98, context.readinessScore + (context.participantCount > 2 ? 6 : 0))}%`,
              detail: 'Higher when the solution has team signal, evidence, and activity.',
            },
          ],
          scopes: [
            { label: 'Global', active: activeScope === 'Global' },
            { label: 'Regional', active: activeScope === 'Regional' },
            { label: 'Local', active: activeScope === 'Local' },
          ],
          collaborationCards: partnerResources,
          quickActions: [
            { label: 'Workspace home', icon: 'dashboard', route: context.routes.dashboard },
            { label: 'Public preview', icon: 'preview', route: context.routes.publicView },
            { label: 'Invite collaborators', icon: 'group_add', route: context.routes.dashboard, queryParams: { openInvite: 'true' } },
          ],
          insightStats: [
            {
              label: 'Ready touchpoints',
              value: this.formatCount(context.readyAssetCount),
              detail: hasLocation
                ? `Start with ecosystems that already operate in or near ${locationLabel}.`
                : 'Add location to improve local and regional partner targeting.',
            },
            {
              label: 'Feedback activity',
              value: this.formatCount(context.discussionCount + context.evaluationCount),
              detail: 'Discussion and evaluation signals already attached to the solution.',
            },
          ],
          outreachTitle: 'Partner outreach draft',
          outreachTemplate: [
            `Hello, I’m reaching out about "${context.solutionTitle}", a ${context.stageLabel.toLowerCase()} initiative focused on ${context.focusArea.toLowerCase()}.`,
            hasLocation
              ? `We are currently building from ${locationLabel} and looking for a partner who can strengthen the next step with aligned reach, expertise, or implementation capacity.`
              : `We are looking for a partner who can strengthen the next step with aligned reach, expertise, or implementation capacity.`,
            `Would you be open to a short conversation to explore where ${context.solutionTitle} could align with your current priorities?`,
            `Best regards,\n${context.authorName}`,
          ],
          guidanceNote:
            'The right partner is the one who increases execution capacity or trust for this exact solution, not the one with the biggest logo.',
        };
      })
    );
  }

  private getBaseContext(solutionId?: string): Observable<SlpBaseContext> {
    if (!solutionId) {
      return of(this.buildBaseContext(undefined, solutionId));
    }

    return this.solutionService.getSolutionForNonAuthenticatedUser(solutionId).pipe(
      map((solutions: any) =>
        this.buildBaseContext(solutions?.[0] as Solution | undefined, solutionId)
      )
    );
  }

  private buildBaseContext(solution: Solution | undefined, requestedId?: string): SlpBaseContext {
    const cleanDescription = this.cleanText(solution?.description);
    const solutionId = solution?.solutionId || requestedId;
    const hasSolution = !!solutionId && !!solution;
    const solutionTitle = solution?.title?.trim() || 'Untitled solution';
    const focusArea =
      solution?.solutionArea?.trim() ||
      solution?.recruitmentProfile?.focusArea?.trim() ||
      (solution?.sdgs?.length ? solution.sdgs.join(', ') : '') ||
      'Cross-disciplinary systems challenge';
    const participantCount = this.countEntries(solution?.participants);
    const documentCount = solution?.documents?.length ?? 0;
    const evaluationCount = this.getEvaluationCount(solution);
    const discussionCount =
      (solution?.discussion?.length ?? 0) + (solution?.comments?.length ?? 0);
    const readyAssetCount = [
      !!solution?.title?.trim(),
      cleanDescription.length > 0,
      !!solution?.image,
      documentCount > 0,
      participantCount > 0,
      evaluationCount > 0,
      !!solution?.recruitmentProfile,
    ].filter(Boolean).length;
    const stageLabel = this.getStageLabel(
      cleanDescription,
      documentCount,
      evaluationCount,
      participantCount
    );
    const readinessScore = this.getReadinessScore(
      cleanDescription,
      !!solution?.image,
      documentCount,
      evaluationCount,
      participantCount,
      !!solution?.recruitmentProfile
    );
    const primaryLane = this.getPrimaryLane(
      cleanDescription,
      documentCount,
      evaluationCount,
      discussionCount,
      participantCount,
      solution?.solutionArea,
      solution?.title
    );
    const primaryLaneLabel = this.toLaneLabel(primaryLane);
    const solutionSummary =
      cleanDescription ||
      `Use the ${primaryLaneLabel.toLowerCase()} lane to turn ${solutionTitle} into a clearer, stronger launch sequence.`;
    const authorName =
      solution?.authorName?.trim() ||
      solution?.recruitmentProfile?.teamLabel?.trim() ||
      'The NewWorld Game team';
    const routes = this.buildRoutes(solutionId);
    const laneReason = this.getLaneReason(primaryLane, stageLabel, solutionSummary);
    const nextStep = this.getNextStep(
      cleanDescription,
      documentCount,
      participantCount,
      evaluationCount,
      solutionTitle
    );

    return {
      solutionId,
      hasSolution,
      solutionTitle,
      solutionSummary,
      authorName,
      focusArea,
      stageLabel,
      participantCount,
      documentCount,
      evaluationCount,
      discussionCount,
      readyAssetCount,
      readinessScore,
      primaryLane,
      primaryLaneLabel,
      laneReason,
      image: solution?.image,
      routes,
      nextStep,
      shell: {
        phase: primaryLaneLabel,
        solutionTitle,
        solutionSummary: this.truncate(solutionSummary, 155),
        stageLabel,
        primaryLaneLabel,
        intro: hasSolution
          ? `A live launch cockpit for ${solutionTitle}, using the actual solution workspace as the source of truth.`
          : 'A launch cockpit for turning promising work into a stronger public, funding, and partner pathway.',
        statusText: hasSolution
          ? `${solutionTitle} is currently in ${stageLabel.toLowerCase()} and is strongest in the ${primaryLaneLabel.toLowerCase()} lane.`
          : 'Open a specific solution to unlock live launch links and tailored recommendations.',
        image: solution?.image,
        hasSolution,
        sideNav: this.buildSideNav(solutionId),
        quickLinks: hasSolution
          ? [
              { label: 'Workspace home', icon: 'dashboard', route: routes.dashboard },
              { label: 'Public preview', icon: 'preview', route: routes.publicView },
              { label: 'Join page', icon: 'share', route: routes.join },
            ]
          : [
              { label: 'Solution Library', icon: 'menu_book', route: routes.library },
              { label: 'Plans', icon: 'payments', route: routes.pricing },
              { label: 'Support', icon: 'help_outline', route: routes.contact },
            ],
        topLinks: hasSolution
          ? [
              { label: 'Details', route: routes.details },
              { label: 'Documents', route: routes.documents },
              { label: 'Discussion', route: routes.discussion },
            ]
          : [
              { label: 'Explorer', route: routes.library },
              { label: 'Programs', route: routes.pricing },
              { label: 'Support', route: routes.contact },
            ],
        footerLinks: [
          { label: 'Programs', route: routes.pricing },
          { label: 'Privacy', route: '/privacy' },
          { label: 'Contact', route: routes.contact },
        ],
        summaryCta: hasSolution ? 'Open workspace' : 'Browse solution library',
        summaryRoute: hasSolution ? routes.dashboard : routes.library,
        previewCta: hasSolution ? 'Open public preview' : 'Explore launch examples',
        previewRoute: hasSolution ? routes.publicView : routes.library,
      },
    };
  }

  private buildIntents(context: SlpBaseContext): SlpIntentCard[] {
    return [
      {
        label: 'Publish',
        description: 'Shape the public-facing story and launch surfaces.',
        icon: 'campaign',
        lane: 'publish',
        route: context.routes.publish,
      },
      {
        label: 'Fund',
        description: 'Prepare the ask, evidence, and execution signal.',
        icon: 'payments',
        lane: 'fund',
        route: context.routes.fund,
      },
      {
        label: 'Partner',
        description: 'Coordinate conversations, invites, and collaboration rooms.',
        icon: 'handshake',
        lane: 'partner',
        route: context.routes.partner,
      },
      {
        label: 'Public preview',
        description: 'See how the solution reads when shared externally.',
        icon: 'visibility',
        route: context.routes.publicView,
      },
    ];
  }

  private buildPublishQuickActions(context: SlpBaseContext): SlpLinkItem[] {
    const previewUrl = this.buildAbsoluteUrl(context.routes.externalView);
    const shareTitle = context.hasSolution
      ? `${context.solutionTitle} | Solution Launch`
      : 'Solution Launch on NewWorld Game';
    const shareSummary = this.truncate(context.solutionSummary, 180);
    const shareText = `${shareTitle} — ${shareSummary}`;

    return [
      {
        label: 'Post on X',
        icon: 'alternate_email',
        detail: 'Share a concise public post',
        href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(previewUrl)}`,
        external: true,
      },
      {
        label: 'Post on LinkedIn',
        icon: 'work',
        detail: 'Share the public preview professionally',
        href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(previewUrl)}`,
        external: true,
      },
      {
        label: 'Post on Facebook',
        icon: 'groups',
        detail: 'Share the solution preview publicly',
        href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(previewUrl)}`,
        external: true,
      },
      {
        label: 'Post on WhatsApp',
        icon: 'forum',
        detail: 'Send it directly into chats and groups',
        href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareTitle}\n${previewUrl}`)}`,
        external: true,
      },
    ];
  }

  private buildSideNav(solutionId?: string): SlpNavItem[] {
    const routes = this.buildRoutes(solutionId);
    return [
      { label: 'Celebrate', icon: 'check_circle', state: 'complete' },
      { label: 'Publish', icon: 'publish', lane: 'publish', route: routes.publish, state: 'active' },
      { label: 'Fund', icon: 'payments', lane: 'fund', route: routes.fund },
      { label: 'Partner', icon: 'handshake', lane: 'partner', route: routes.partner },
      { label: 'Archive', icon: 'inventory_2', route: routes.publicView },
    ];
  }

  private buildRoutes(solutionId?: string) {
    if (!solutionId) {
      return {
        launch: '/solution-launch',
        publish: '/solution-launch',
        fund: '/fund',
        partner: '/partner',
        dashboard: '/get-started',
        details: '/get-started',
        documents: '/blogs/solution-libraries',
        discussion: '/contact',
        meeting: '/contact',
        join: '/get-started',
        publicView: '/blogs/solution-libraries',
        externalView: '/blogs/solution-libraries',
        library: '/blogs/solution-libraries',
        contact: '/contact',
        pricing: '/plans',
      };
    }

    return {
      launch: ['/solution-launch', solutionId],
      publish: ['/solution-launch', solutionId],
      fund: ['/solution-launch', solutionId, 'fund'],
      partner: ['/solution-launch', solutionId, 'partner'],
      dashboard: ['/dashboard', solutionId],
      details: ['/solution-details', solutionId],
      documents: ['/document-files', solutionId],
      discussion: ['/full-discussion', solutionId],
      meeting: ['/meeting', solutionId],
      join: ['/join', solutionId],
      publicView: ['/solution-view', solutionId],
      externalView: ['/solution-view-external', solutionId],
      library: '/blogs/solution-libraries',
      contact: '/contact',
      pricing: '/plans',
    };
  }

  private buildAbsoluteUrl(route: any[] | string | undefined): string {
    const base = 'https://newworld-game.org';

    if (!route) {
      return base;
    }

    if (Array.isArray(route)) {
      const segments = route
        .map((segment) => String(segment).replace(/^\/+|\/+$/g, ''))
        .filter(Boolean);
      return `${base}/${segments.join('/')}`;
    }

    if (/^https?:\/\//i.test(route)) {
      return route;
    }

    return `${base}/${String(route).replace(/^\/+/, '')}`;
  }

  private cleanText(value?: string): string {
    return (value || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }
    return `${value.slice(0, maxLength - 1).trimEnd()}…`;
  }

  private countEntries(value: unknown): number {
    if (!value) {
      return 0;
    }
    if (Array.isArray(value)) {
      return value.length;
    }
    if (typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length;
    }
    return 0;
  }

  private getEvaluationCount(solution?: Solution): number {
    if (solution?.evaluationDetails?.length) {
      return solution.evaluationDetails.length;
    }
    const fromString = Number(solution?.numberofTimesEvaluated || 0);
    return Number.isFinite(fromString) ? fromString : 0;
  }

  private getStageLabel(
    description: string,
    documentCount: number,
    evaluationCount: number,
    participantCount: number
  ): string {
    if (evaluationCount > 0 && documentCount > 0) {
      return 'Validated concept';
    }
    if (documentCount > 0 || participantCount > 2) {
      return 'Active build';
    }
    if (description.length > 80) {
      return 'Framed concept';
    }
    return 'Early draft';
  }

  private getReadinessScore(
    description: string,
    hasImage: boolean,
    documentCount: number,
    evaluationCount: number,
    participantCount: number,
    hasRecruitmentProfile: boolean
  ): number {
    let score = 34;
    if (description.length > 40) score += 14;
    if (description.length > 140) score += 12;
    if (hasImage) score += 8;
    if (documentCount > 0) score += 10;
    if (documentCount > 2) score += 6;
    if (evaluationCount > 0) score += 7;
    if (participantCount > 1) score += 5;
    if (participantCount > 3) score += 4;
    if (hasRecruitmentProfile) score += 4;
    return Math.max(38, Math.min(97, score));
  }

  private getPrimaryLane(
    description: string,
    documentCount: number,
    evaluationCount: number,
    discussionCount: number,
    participantCount: number,
    solutionArea?: string,
    title?: string
  ): SlpLane {
    const text = `${description} ${solutionArea || ''} ${title || ''}`.toLowerCase();

    const publishScore =
      (description.length > 90 ? 3 : 0) +
      (documentCount > 0 ? 2 : 0) +
      (evaluationCount > 0 ? 1 : 0);
    const fundScore =
      (documentCount > 0 ? 2 : 0) +
      (participantCount > 1 ? 1 : 0) +
      (/(pilot|prototype|deploy|implementation|budget|fund|scale|grant)/.test(text) ? 2 : 0);
    const partnerScore =
      (participantCount > 2 ? 2 : 0) +
      (discussionCount > 0 ? 2 : 0) +
      (/(partner|team|community|school|network|collaborat)/.test(text) ? 2 : 0);

    if (partnerScore >= publishScore && partnerScore >= fundScore) {
      return 'partner';
    }
    if (fundScore >= publishScore) {
      return 'fund';
    }
    return 'publish';
  }

  private getLaneReason(lane: SlpLane, stageLabel: string, summary: string): string {
    if (lane === 'publish') {
      return `${stageLabel} with enough story signal to benefit from a public-facing polish pass.`;
    }
    if (lane === 'fund') {
      return `${stageLabel} with enough structure to justify a clearer funding narrative.`;
    }
    return `${stageLabel} with collaboration signals that benefit from stronger partner coordination.`;
  }

  private getNextStep(
    description: string,
    documentCount: number,
    participantCount: number,
    evaluationCount: number,
    solutionTitle: string
  ): string {
    if (description.length < 80) {
      return `Tighten the summary for ${solutionTitle} in Solution Details before widening the launch path.`;
    }
    if (documentCount === 0) {
      return `Add at least one supporting document or visual so ${solutionTitle} has evidence behind the pitch.`;
    }
    if (participantCount < 2) {
      return `Invite at least one more collaborator so ${solutionTitle} carries stronger execution signal.`;
    }
    if (evaluationCount === 0) {
      return `Collect one round of feedback or evaluation so the next outward-facing version of ${solutionTitle} is grounded in response.`;
    }
    return `Open the public preview for ${solutionTitle} and verify that the outside view matches the team’s intent.`;
  }

  private buildPublishResources(
    context: SlpBaseContext,
    location: SlpLocationContext
  ): SlpActionCard[] {
    const tags = this.getTopicTags(context);
    const region = this.getRegionForCountry(location.country);
    const locationLabel = this.formatLocation(location);
    const localCards = this.hasLocation(location)
      ? this.buildLocalDiscoveryCards(context, locationLabel)
      : [];

    const catalog = this.getPublicationCatalog();
    const scoredCatalog = catalog
      .map((entry) => {
        let score = entry.baseScore;
        score += entry.tags.filter((tag) => tags.has(tag)).length * 8;
        if (entry.region === region) {
          score += 12;
        } else if (entry.region === 'global') {
          score += 3;
        }
        if (context.documentCount > 0 && entry.tags.includes('research')) {
          score += 5;
        }
        if (context.participantCount > 1 && entry.tags.includes('community')) {
          score += 4;
        }

        return {
          label: entry.label,
          title: entry.title,
          description: this.interpolatePublishDescription(
            entry.description,
            context.focusArea,
            locationLabel
          ),
          fitScore: Math.min(98, score),
          icon: entry.icon,
          meta: [
            ...entry.meta,
            `Focus match: ${context.focusArea}`,
            this.hasLocation(location)
              ? `Geo signal: ${locationLabel}`
              : 'Add location for stronger local matching',
          ],
          cta: entry.cta,
          badge: entry.badge,
          href: entry.href,
          external: true,
        } as SlpActionCard;
      })
      .filter((entry) => entry.fitScore >= 60)
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, this.hasLocation(location) ? 5 : 6);

    return [...localCards, ...scoredCatalog].slice(0, 7);
  }

  private buildLocalDiscoveryCards(
    context: SlpBaseContext,
    locationLabel: string
  ): SlpActionCard[] {
    return [
      {
        label: 'Local media',
        title: `${locationLabel} news desks and opinion editors`,
        description: `Use a location-specific search to find actual local newspapers, city magazines, and public-interest editors that would cover ${context.focusArea.toLowerCase()}.`,
        fitScore: 92,
        icon: 'newspaper',
        meta: [
          'Local discovery lane',
          'Best for civic relevance and nearby visibility',
          `Search built for ${locationLabel}`,
        ],
        cta: 'Find local outlets',
        badge: 'Local discovery',
        href: this.buildSearchUrl(
          `${locationLabel} local newspaper opinion submit ${context.focusArea}`
        ),
        external: true,
      },
      {
        label: 'Universities and incubators',
        title: `${locationLabel} labs, incubators, and campus channels`,
        description: `Search for universities, research centers, and incubators in ${locationLabel} that regularly publish or feature applied solution work.`,
        fitScore: 89,
        icon: 'school',
        meta: [
          'Local discovery lane',
          'Best for institutional credibility',
          `Good fit for ${context.stageLabel.toLowerCase()} work`,
        ],
        cta: 'Find institutional channels',
        badge: 'Local discovery',
        href: this.buildSearchUrl(
          `${locationLabel} university innovation center news ${context.focusArea}`
        ),
        external: true,
      },
    ];
  }

  private getPublicationCatalog(): SlpPublicationCatalogEntry[] {
    return [
      {
        label: 'Explainer journalism',
        title: 'The Conversation',
        description:
          'A strong fit when the solution needs a plain-language expert explainer and a policy-aware audience.',
        icon: 'campaign',
        href: 'https://theconversation.com/',
        cta: 'Review publisher',
        baseScore: 70,
        region: 'global',
        badge: 'Editorial',
        tags: ['research', 'policy', 'education', 'health', 'climate', 'community'],
        meta: ['Audience: educated public', 'Format: explanatory article'],
      },
      {
        label: 'Professional reach',
        title: 'LinkedIn Articles',
        description:
          'Useful for turning the solution into a concise professional narrative that travels quickly through practitioner networks.',
        icon: 'work',
        href: 'https://www.linkedin.com/feed/',
        cta: 'Open platform',
        baseScore: 67,
        region: 'global',
        badge: 'Global',
        tags: ['startup', 'community', 'policy', 'general', 'tech'],
        meta: ['Audience: professionals', 'Format: article or post series'],
      },
      {
        label: 'Public storytelling',
        title: 'Medium',
        description:
          'A broad public publishing surface for clear narratives, progress updates, and reflective stories around the solution.',
        icon: 'edit_square',
        href: 'https://medium.com/',
        cta: 'Open platform',
        baseScore: 68,
        region: 'global',
        badge: 'Global',
        tags: ['general', 'community', 'startup', 'policy', 'climate', 'education'],
        meta: ['Audience: broad public', 'Format: long-form post'],
      },
      {
        label: 'Owned publication',
        title: 'Substack',
        description:
          'Best when the team wants an ongoing publication channel with subscribers, updates, and serialized progress.',
        icon: 'mail',
        href: 'https://substack.com/',
        cta: 'Open platform',
        baseScore: 66,
        region: 'global',
        badge: 'Global',
        tags: ['general', 'policy', 'community', 'startup', 'education'],
        meta: ['Audience: subscribers', 'Format: recurring publication'],
      },
      {
        label: 'Research network',
        title: 'ResearchGate',
        description:
          'Good for research-backed solutions that benefit from visibility among academics and evidence-oriented collaborators.',
        icon: 'hub',
        href: 'https://www.researchgate.net/',
        cta: 'Open platform',
        baseScore: 71,
        region: 'global',
        badge: 'Research',
        tags: ['research', 'climate', 'health', 'education', 'data'],
        meta: ['Audience: researchers', 'Format: publication profile and updates'],
      },
      {
        label: 'Open repository',
        title: 'Zenodo',
        description:
          'A good home for evidence packs, reports, datasets, and supporting assets that should stay citable and publicly accessible.',
        icon: 'inventory_2',
        href: 'https://zenodo.org/',
        cta: 'Open repository',
        baseScore: 74,
        region: 'global',
        badge: 'Research',
        tags: ['research', 'data', 'tech', 'climate', 'health', 'education'],
        meta: ['Audience: open research community', 'Format: repository record'],
      },
      {
        label: 'Open science',
        title: 'OSF',
        description:
          'Useful when the solution benefits from transparent working papers, methods, evidence logs, or open collaboration artifacts.',
        icon: 'science',
        href: 'https://osf.io/',
        cta: 'Open platform',
        baseScore: 72,
        region: 'global',
        badge: 'Research',
        tags: ['research', 'data', 'education', 'health'],
        meta: ['Audience: open science community', 'Format: project hub'],
      },
      {
        label: 'Policy and social science',
        title: 'SSRN',
        description:
          'A better fit for policy, governance, business, and social-impact work that needs an early paper or public draft.',
        icon: 'gavel',
        href: 'https://www.ssrn.com/',
        cta: 'Open platform',
        baseScore: 69,
        region: 'global',
        badge: 'Research',
        tags: ['policy', 'research', 'startup', 'education', 'community'],
        meta: ['Audience: policy and business readers', 'Format: preprint or paper'],
      },
      {
        label: 'Technical preprint',
        title: 'arXiv',
        description:
          'A strong route when the solution includes technical methods, models, AI, computation, or data-heavy experimentation.',
        icon: 'memory',
        href: 'https://arxiv.org/',
        cta: 'Open platform',
        baseScore: 73,
        region: 'global',
        badge: 'Research',
        tags: ['research', 'tech', 'data'],
        meta: ['Audience: technical researchers', 'Format: preprint'],
      },
      {
        label: 'Code-first publishing',
        title: 'GitHub',
        description:
          'Best when the publishable asset is a tool, prototype, documentation set, or transparent implementation package.',
        icon: 'code',
        href: 'https://github.com/',
        cta: 'Open platform',
        baseScore: 68,
        region: 'global',
        badge: 'Product',
        tags: ['tech', 'data', 'startup'],
        meta: ['Audience: builders and maintainers', 'Format: repo and documentation'],
      },
      {
        label: 'Developer audience',
        title: 'DEV Community',
        description:
          'A good outlet when the solution has a technical build story, implementation lessons, or open tooling value.',
        icon: 'terminal',
        href: 'https://dev.to/',
        cta: 'Open platform',
        baseScore: 67,
        region: 'global',
        badge: 'Product',
        tags: ['tech', 'startup', 'data'],
        meta: ['Audience: developer community', 'Format: technical article'],
      },
      {
        label: 'Launch audience',
        title: 'Product Hunt',
        description:
          'Useful when the solution is product-like and the team wants a public launch surface for early adopters and feedback.',
        icon: 'rocket_launch',
        href: 'https://www.producthunt.com/',
        cta: 'Open platform',
        baseScore: 66,
        region: 'global',
        badge: 'Product',
        tags: ['startup', 'tech', 'product'],
        meta: ['Audience: early adopters', 'Format: launch listing'],
      },
      {
        label: 'Regional tech media',
        title: 'Technical.ly',
        description:
          'A practical media target for North American tech, civic, and innovation stories with a strong local ecosystem angle.',
        icon: 'location_city',
        href: 'https://technical.ly/',
        cta: 'Open publisher',
        baseScore: 72,
        region: 'north-america',
        badge: 'Regional',
        tags: ['startup', 'tech', 'community', 'policy'],
        meta: ['Region: North America', 'Format: ecosystem and innovation coverage'],
      },
      {
        label: 'Regional startup media',
        title: 'EU-Startups',
        description:
          'A strong regional target for European startup, climate-tech, and innovation stories with market or deployment relevance.',
        icon: 'public',
        href: 'https://www.eu-startups.com/',
        cta: 'Open publisher',
        baseScore: 72,
        region: 'europe',
        badge: 'Regional',
        tags: ['startup', 'tech', 'climate'],
        meta: ['Region: Europe', 'Format: startup and innovation coverage'],
      },
      {
        label: 'Regional startup media',
        title: 'YourStory',
        description:
          'A strong target for India-based startup, social-impact, and entrepreneurship narratives that need broad reach.',
        icon: 'newspaper',
        href: 'https://yourstory.com/',
        cta: 'Open publisher',
        baseScore: 73,
        region: 'india',
        badge: 'Regional',
        tags: ['startup', 'community', 'tech', 'education'],
        meta: ['Region: India', 'Format: startup and founder coverage'],
      },
      {
        label: 'Regional innovation media',
        title: 'Disrupt Africa',
        description:
          'A strong route for Africa-based innovation, startup, and climate-tech stories that need regional relevance.',
        icon: 'language',
        href: 'https://disruptafrica.com/',
        cta: 'Open publisher',
        baseScore: 72,
        region: 'africa',
        badge: 'Regional',
        tags: ['startup', 'tech', 'climate', 'community'],
        meta: ['Region: Africa', 'Format: innovation and startup coverage'],
      },
      {
        label: 'Regional public-interest media',
        title: 'AllAfrica',
        description:
          'A useful publication surface for Africa-focused civic, health, climate, and development stories with broad public relevance.',
        icon: 'public',
        href: 'https://allafrica.com/',
        cta: 'Open publisher',
        baseScore: 70,
        region: 'africa',
        badge: 'Regional',
        tags: ['community', 'policy', 'health', 'climate'],
        meta: ['Region: Africa', 'Format: broad public-interest coverage'],
      },
      {
        label: 'Global development media',
        title: 'Devex',
        description:
          'A strong option for solutions tied to development, humanitarian work, global health, education, and public systems change.',
        icon: 'volunteer_activism',
        href: 'https://www.devex.com/',
        cta: 'Open publisher',
        baseScore: 70,
        region: 'global',
        badge: 'Editorial',
        tags: ['policy', 'community', 'health', 'education', 'climate'],
        meta: ['Audience: global development practitioners', 'Format: analysis and features'],
      },
    ];
  }

  private buildFundingResources(
    context: SlpBaseContext,
    location: SlpLocationContext
  ): SlpActionCard[] {
    const tags = this.getTopicTags(context);
    const region = this.getRegionForCountry(location.country);
    const locationLabel = this.formatLocation(location);
    const localCards = this.hasLocation(location)
      ? this.buildLocalFundingDiscoveryCards(context, locationLabel)
      : [];

    const resources = this.getFundingCatalog()
      .map((entry) => {
        let score = entry.baseScore;
        score += entry.tags.filter((tag) => tags.has(tag)).length * 8;
        if (entry.region === region) {
          score += 11;
        } else if (entry.region === 'global') {
          score += 3;
        }
        if (context.documentCount > 0 && entry.tags.includes('research')) {
          score += 4;
        }
        if (context.participantCount > 1 && entry.tags.includes('community')) {
          score += 4;
        }
        if (context.readyAssetCount > 4) {
          score += 3;
        }

        return {
          label: entry.label,
          title: entry.title,
          description: this.interpolateFundingDescription(
            entry.description,
            context,
            locationLabel
          ),
          fitScore: Math.min(98, score),
          icon: entry.icon,
          meta: [
            ...entry.meta,
            `Focus match: ${context.focusArea}`,
            this.hasLocation(location)
              ? `Geo signal: ${locationLabel}`
              : 'Add location for stronger regional matching',
          ],
          cta: entry.cta,
          badge: entry.badge,
          href: entry.href,
          external: true,
        } as SlpActionCard;
      })
      .filter((entry) => entry.fitScore >= 60)
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, this.hasLocation(location) ? 5 : 6);

    return [...localCards, ...resources].slice(0, 7);
  }

  private buildLocalFundingDiscoveryCards(
    context: SlpBaseContext,
    locationLabel: string
  ): SlpActionCard[] {
    return [
      {
        label: 'Local grants',
        title: `${locationLabel} grantmakers and innovation funds`,
        description: `Search for place-based grants, municipal innovation funds, economic development programs, and foundations in ${locationLabel} that align with ${context.focusArea.toLowerCase()}.`,
        fitScore: 91,
        icon: 'savings',
        meta: [
          'Local discovery lane',
          'Best for place-based momentum',
          `Search built for ${locationLabel}`,
        ],
        cta: 'Find local funders',
        badge: 'Local discovery',
        href: this.buildSearchUrl(
          `${locationLabel} innovation fund grant ${context.focusArea}`
        ),
        external: true,
      },
      {
        label: 'Accelerators',
        title: `${locationLabel} accelerators and incubators`,
        description: `Search for accelerators, incubators, and challenge programs in ${locationLabel} that can fund or de-risk the next stage of ${context.solutionTitle}.`,
        fitScore: 88,
        icon: 'rocket_launch',
        meta: [
          'Local discovery lane',
          'Best for capital plus support',
          `Good fit for ${context.stageLabel.toLowerCase()} work`,
        ],
        cta: 'Find nearby programs',
        badge: 'Local discovery',
        href: this.buildSearchUrl(
          `${locationLabel} accelerator incubator ${context.focusArea}`
        ),
        external: true,
      },
    ];
  }

  private getFundingCatalog(): SlpFundingCatalogEntry[] {
    return [
      {
        label: 'Challenge funding',
        title: 'MIT Solve',
        description:
          'A strong route for solutions that benefit from challenge-based funding, visibility, and a network of supporters around global problems.',
        icon: 'emoji_objects',
        href: 'https://solve.mit.edu/',
        cta: 'Review funder',
        baseScore: 74,
        region: 'global',
        badge: 'Global',
        tags: ['climate', 'health', 'education', 'community', 'tech', 'startup'],
        meta: ['Type: challenge funding', 'Value: funding plus network'],
      },
      {
        label: 'Research and health funding',
        title: 'Wellcome Grant Funding',
        description:
          'A stronger match for research-backed, health, wellbeing, data, or systems-oriented work that needs institutional grant routes.',
        icon: 'health_and_safety',
        href: 'https://wellcome.org/grant-funding',
        cta: 'Review funder',
        baseScore: 73,
        region: 'global',
        badge: 'Institutional',
        tags: ['health', 'research', 'data', 'community'],
        meta: ['Type: grants', 'Value: institutional research support'],
      },
      {
        label: 'Open-source and community funding',
        title: 'Open Collective',
        description:
          'A practical option for open, community, nonprofit, or public-interest work that can benefit from recurring supporter-based funding.',
        icon: 'groups',
        href: 'https://opencollective.com/',
        cta: 'Open platform',
        baseScore: 71,
        region: 'global',
        badge: 'Community',
        tags: ['community', 'tech', 'education', 'policy'],
        meta: ['Type: collective funding', 'Value: recurring community support'],
      },
      {
        label: 'Product and open-source funding',
        title: 'GitHub Sponsors',
        description:
          'Best for developer-facing, technical, tool-based, or open-source work that can attract sponsor-backed support.',
        icon: 'code',
        href: 'https://github.com/sponsors',
        cta: 'Open platform',
        baseScore: 70,
        region: 'global',
        badge: 'Product',
        tags: ['tech', 'data', 'startup'],
        meta: ['Type: sponsor funding', 'Value: technical community support'],
      },
      {
        label: 'Social impact investment',
        title: 'Acumen',
        description:
          'A better fit for social-impact work that needs patient capital, systems framing, and implementation credibility.',
        icon: 'diversity_3',
        href: 'https://acumen.org/',
        cta: 'Review organization',
        baseScore: 72,
        region: 'global',
        badge: 'Impact',
        tags: ['community', 'policy', 'education', 'health', 'climate'],
        meta: ['Type: impact investing', 'Value: long-horizon support'],
      },
      {
        label: 'Tech nonprofit funding',
        title: 'Fast Forward',
        description:
          'A stronger fit for nonprofit or public-interest technology teams that need both capital and accelerator-style support.',
        icon: 'speed',
        href: 'https://www.ffwd.org/',
        cta: 'Review organization',
        baseScore: 72,
        region: 'north-america',
        badge: 'Accelerator',
        tags: ['tech', 'community', 'education', 'health'],
        meta: ['Region: North America', 'Value: accelerator plus funding'],
      },
      {
        label: 'Fellowship and seed support',
        title: 'Echoing Green',
        description:
          'A strong route for early social innovators building ambitious solutions with clear public benefit and leadership potential.',
        icon: 'eco',
        href: 'https://echoinggreen.org/',
        cta: 'Review organization',
        baseScore: 71,
        region: 'global',
        badge: 'Impact',
        tags: ['community', 'policy', 'health', 'education', 'climate', 'startup'],
        meta: ['Type: fellowship and seed support', 'Value: early-stage founder backing'],
      },
      {
        label: 'Global challenge grants',
        title: 'Grand Challenges',
        description:
          'Best for research, science, health, and systems innovations that can fit challenge-based grant programs.',
        icon: 'science',
        href: 'https://grandchallenges.org/',
        cta: 'Review organization',
        baseScore: 73,
        region: 'global',
        badge: 'Research',
        tags: ['research', 'health', 'data', 'climate'],
        meta: ['Type: challenge grants', 'Value: mission-driven funding'],
      },
      {
        label: 'Regional startup capital',
        title: 'EU-Startups',
        description:
          'A useful route for Europe-based startup visibility and ecosystem discovery around funding and investor networks.',
        icon: 'public',
        href: 'https://www.eu-startups.com/',
        cta: 'Open platform',
        baseScore: 69,
        region: 'europe',
        badge: 'Regional',
        tags: ['startup', 'tech', 'climate'],
        meta: ['Region: Europe', 'Value: startup ecosystem visibility'],
      },
      {
        label: 'Regional startup ecosystem',
        title: 'YourStory',
        description:
          'A useful route for India-based startup and social-impact ecosystem visibility that can unlock investor and program attention.',
        icon: 'newspaper',
        href: 'https://yourstory.com/',
        cta: 'Open platform',
        baseScore: 70,
        region: 'india',
        badge: 'Regional',
        tags: ['startup', 'community', 'tech', 'education'],
        meta: ['Region: India', 'Value: founder and ecosystem visibility'],
      },
      {
        label: 'Regional innovation ecosystem',
        title: 'Disrupt Africa',
        description:
          'A strong route for Africa-based startup and innovation visibility that can lead to investor and accelerator discovery.',
        icon: 'language',
        href: 'https://disruptafrica.com/',
        cta: 'Open platform',
        baseScore: 70,
        region: 'africa',
        badge: 'Regional',
        tags: ['startup', 'tech', 'climate', 'community'],
        meta: ['Region: Africa', 'Value: startup ecosystem visibility'],
      },
    ];
  }

  private buildPartnerResources(
    context: SlpBaseContext,
    location: SlpLocationContext
  ): SlpActionCard[] {
    const tags = this.getTopicTags(context);
    const region = this.getRegionForCountry(location.country);
    const locationLabel = this.formatLocation(location);
    const localCards = this.hasLocation(location)
      ? this.buildLocalPartnerDiscoveryCards(context, locationLabel)
      : [];

    const resources = this.getPartnerCatalog()
      .map((entry) => {
        let score = entry.baseScore;
        score += entry.tags.filter((tag) => tags.has(tag)).length * 8;
        if (entry.region === region) {
          score += 11;
        } else if (entry.region === 'global') {
          score += 3;
        }
        if (context.participantCount > 1 && entry.tags.includes('community')) {
          score += 4;
        }
        if (context.readyAssetCount > 4) {
          score += 3;
        }

        return {
          label: entry.label,
          title: entry.title,
          description: this.interpolatePartnerDescription(
            entry.description,
            context,
            locationLabel
          ),
          fitScore: Math.min(98, score),
          icon: entry.icon,
          meta: [
            ...entry.meta,
            `Focus match: ${context.focusArea}`,
            this.hasLocation(location)
              ? `Geo signal: ${locationLabel}`
              : 'Add location for stronger ecosystem matching',
          ],
          cta: entry.cta,
          badge: entry.badge,
          href: entry.href,
          external: true,
        } as SlpActionCard;
      })
      .filter((entry) => entry.fitScore >= 60)
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, this.hasLocation(location) ? 5 : 6);

    return [...localCards, ...resources].slice(0, 7);
  }

  private buildLocalPartnerDiscoveryCards(
    context: SlpBaseContext,
    locationLabel: string
  ): SlpActionCard[] {
    return [
      {
        label: 'Local ecosystems',
        title: `${locationLabel} ecosystem builders and civic partners`,
        description: `Search for civic innovation groups, nonprofits, chambers, labs, and community networks in ${locationLabel} that could help implement or amplify ${context.solutionTitle}.`,
        fitScore: 91,
        icon: 'diversity_2',
        meta: [
          'Local discovery lane',
          'Best for implementation reach',
          `Search built for ${locationLabel}`,
        ],
        cta: 'Find local partners',
        badge: 'Local discovery',
        href: this.buildSearchUrl(
          `${locationLabel} nonprofit innovation network ${context.focusArea}`
        ),
        external: true,
      },
      {
        label: 'Institutions and labs',
        title: `${locationLabel} universities, labs, and implementation allies`,
        description: `Search for research centers, universities, accelerators, and field partners in ${locationLabel} that can add trust, expertise, or deployment capacity.`,
        fitScore: 88,
        icon: 'groups_3',
        meta: [
          'Local discovery lane',
          'Best for credibility and expertise',
          `Good fit for ${context.stageLabel.toLowerCase()} work`,
        ],
        cta: 'Find institutional partners',
        badge: 'Local discovery',
        href: this.buildSearchUrl(
          `${locationLabel} university lab incubator partner ${context.focusArea}`
        ),
        external: true,
      },
    ];
  }

  private getPartnerCatalog(): SlpPartnerCatalogEntry[] {
    return [
      {
        label: 'Impact ecosystem',
        title: 'Impact Hub',
        description:
          'A strong partner ecosystem when the solution needs entrepreneurial community, local chapter connections, and implementation-minded collaborators.',
        icon: 'hub',
        href: 'https://impacthub.net/',
        cta: 'Open network',
        baseScore: 74,
        region: 'global',
        badge: 'Global',
        tags: ['startup', 'community', 'climate', 'education', 'policy'],
        meta: ['Type: innovation network', 'Value: local and global community'],
      },
      {
        label: 'Climate ecosystem',
        title: 'Climatebase',
        description:
          'A strong route for climate-oriented talent, partner discovery, and ecosystem visibility around implementation and hiring.',
        icon: 'public',
        href: 'https://climatebase.org/',
        cta: 'Open network',
        baseScore: 75,
        region: 'global',
        badge: 'Climate',
        tags: ['climate', 'startup', 'tech', 'community'],
        meta: ['Type: climate ecosystem', 'Value: talent and partner discovery'],
      },
      {
        label: 'Responsible business network',
        title: 'B Lab / B Corp Community',
        description:
          'Useful when the solution needs values-aligned business partners, corporate pilots, or regenerative-economy ecosystem links.',
        icon: 'handshake',
        href: 'https://www.bcorporation.net/',
        cta: 'Open network',
        baseScore: 72,
        region: 'global',
        badge: 'Business',
        tags: ['startup', 'community', 'policy', 'climate'],
        meta: ['Type: business community', 'Value: mission-aligned companies'],
      },
      {
        label: 'Social innovation network',
        title: 'Ashoka',
        description:
          'A strong option for public-interest and systems-change solutions that need social-innovation partners and field credibility.',
        icon: 'diversity_3',
        href: 'https://www.ashoka.org/',
        cta: 'Open network',
        baseScore: 73,
        region: 'global',
        badge: 'Impact',
        tags: ['community', 'policy', 'education', 'health', 'climate'],
        meta: ['Type: social innovation network', 'Value: systems-change partnerships'],
      },
      {
        label: 'Professional impact community',
        title: 'Net Impact',
        description:
          'A useful route to students and professionals looking to work at the intersection of impact, business, and civic outcomes.',
        icon: 'groups',
        href: 'https://netimpact.org/',
        cta: 'Open network',
        baseScore: 70,
        region: 'north-america',
        badge: 'Regional',
        tags: ['community', 'education', 'startup', 'policy'],
        meta: ['Region: North America', 'Value: student and professional community'],
      },
      {
        label: 'Cause partnership network',
        title: '1% for the Planet',
        description:
          'A strong fit for environmental and climate-oriented work that can benefit from brand, nonprofit, and mission-aligned business partnerships.',
        icon: 'forest',
        href: 'https://www.onepercentfortheplanet.org/',
        cta: 'Open network',
        baseScore: 73,
        region: 'global',
        badge: 'Climate',
        tags: ['climate', 'community', 'startup'],
        meta: ['Type: environmental partner network', 'Value: aligned business relationships'],
      },
      {
        label: 'Design and challenge community',
        title: 'OpenIDEO',
        description:
          'A useful route when the solution benefits from design-minded collaborators, challenge communities, and structured co-creation.',
        icon: 'design_services',
        href: 'https://openideo.com/',
        cta: 'Open network',
        baseScore: 71,
        region: 'global',
        badge: 'Community',
        tags: ['community', 'policy', 'education', 'health', 'climate'],
        meta: ['Type: challenge and design community', 'Value: co-creation and visibility'],
      },
      {
        label: 'MIT ecosystem',
        title: 'MIT Solve',
        description:
          'A strong route when the solution would benefit from challenge communities, cross-sector partnerships, and credibility through a global innovation network.',
        icon: 'emoji_objects',
        href: 'https://solve.mit.edu/',
        cta: 'Open network',
        baseScore: 72,
        region: 'global',
        badge: 'Global',
        tags: ['climate', 'health', 'education', 'community', 'tech', 'startup'],
        meta: ['Type: challenge community', 'Value: cross-sector partner access'],
      },
    ];
  }

  private getTopicTags(context: SlpBaseContext): Set<string> {
    const text = `${context.solutionTitle} ${context.solutionSummary} ${context.focusArea}`.toLowerCase();
    const tags = new Set<string>(['general']);

    if (/(research|study|evidence|analysis|dataset|data|model|framework|report|paper)/.test(text)) {
      tags.add('research');
      tags.add('data');
    }
    if (/(ai|app|platform|software|tool|dashboard|api|digital|prototype|code)/.test(text)) {
      tags.add('tech');
      tags.add('startup');
    }
    if (/(policy|public|government|civic|community|ngo|nonprofit|equity|justice)/.test(text)) {
      tags.add('policy');
      tags.add('community');
    }
    if (/(climate|carbon|energy|water|environment|sustain)/.test(text)) {
      tags.add('climate');
    }
    if (/(education|school|student|learning|curriculum|campus)/.test(text)) {
      tags.add('education');
      tags.add('community');
    }
    if (/(health|medical|wellbeing|well-being|care)/.test(text)) {
      tags.add('health');
    }
    if (/(business|venture|market|startup|product|launch|pilot|deploy|implementation)/.test(text)) {
      tags.add('startup');
    }

    return tags;
  }

  private getRegionForCountry(country?: string): SlpPublicationCatalogEntry['region'] {
    const value = (country || '').trim().toLowerCase();
    if (!value) {
      return 'global';
    }
    if (
      ['united states', 'usa', 'us', 'canada', 'mexico'].includes(value)
    ) {
      return 'north-america';
    }
    if (value === 'india') {
      return 'india';
    }
    if (
      [
        'united kingdom',
        'uk',
        'ireland',
        'france',
        'germany',
        'netherlands',
        'belgium',
        'spain',
        'italy',
        'portugal',
        'sweden',
        'norway',
        'denmark',
        'finland',
        'switzerland',
        'austria',
        'poland',
        'greece',
        'romania',
        'czech republic',
        'hungary',
        'ukraine',
      ].includes(value)
    ) {
      return 'europe';
    }
    if (
      [
        'nigeria',
        'kenya',
        'ghana',
        'south africa',
        'uganda',
        'rwanda',
        'tanzania',
        'ethiopia',
        'zambia',
        'botswana',
        'namibia',
        'senegal',
        'ivory coast',
        'cote d’ivoire',
        'cote d\'ivoire',
        'cameroon',
        'morocco',
        'egypt',
      ].includes(value)
    ) {
      return 'africa';
    }
    if (
      [
        'singapore',
        'malaysia',
        'indonesia',
        'philippines',
        'thailand',
        'vietnam',
        'japan',
        'south korea',
        'australia',
        'new zealand',
      ].includes(value)
    ) {
      return 'asia-pacific';
    }
    return 'global';
  }

  private interpolatePublishDescription(
    description: string,
    focusArea: string,
    locationLabel?: string
  ): string {
    if (!locationLabel) {
      return description;
    }
    return `${description} This is especially useful when positioning work around ${focusArea.toLowerCase()} for audiences connected to ${locationLabel}.`;
  }

  private interpolateFundingDescription(
    description: string,
    context: SlpBaseContext,
    locationLabel?: string
  ): string {
    if (!locationLabel) {
      return `${description} It is currently a strong fit for ${context.stageLabel.toLowerCase()} work in ${context.focusArea.toLowerCase()}.`;
    }
    return `${description} It is especially relevant when building from ${locationLabel} around ${context.focusArea.toLowerCase()}.`;
  }

  private interpolatePartnerDescription(
    description: string,
    context: SlpBaseContext,
    locationLabel?: string
  ): string {
    if (!locationLabel) {
      return `${description} It is a stronger match when the solution needs aligned collaborators in ${context.focusArea.toLowerCase()}.`;
    }
    return `${description} It becomes even more relevant when building partnerships from ${locationLabel} around ${context.focusArea.toLowerCase()}.`;
  }

  private buildSearchUrl(query: string): string {
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  }

  private hasLocation(location: SlpLocationContext): boolean {
    return !!location.city?.trim() && !!location.country?.trim();
  }

  private formatLocation(location: SlpLocationContext): string {
    const city = location.city?.trim();
    const country = location.country?.trim();
    if (city && country) {
      return `${city}, ${country}`;
    }
    return country || city || '';
  }

  private buildFitScore(base: number, signals: boolean[]): number {
    const bonus = signals.filter(Boolean).length * 7;
    return Math.min(97, base + bonus);
  }

  private formatCount(count: number): string {
    return count.toString().padStart(2, '0');
  }

  private toLaneLabel(lane: SlpLane): string {
    if (lane === 'fund') {
      return 'Fund';
    }
    if (lane === 'partner') {
      return 'Partner';
    }
    return 'Publish';
  }

  private getFundingTier(context: SlpBaseContext): SlpTier {
    if (context.readinessScore >= 86 && context.documentCount > 1 && context.participantCount > 2) {
      return { label: 'Tier 3', subtitle: 'Institutional and strategic capital', active: true };
    }
    if (context.readinessScore >= 72 && (context.documentCount > 0 || context.evaluationCount > 0)) {
      return { label: 'Tier 2', subtitle: 'Mid-scale program funding', active: true };
    }
    return { label: 'Tier 1', subtitle: 'Micro-grants and pilot support', active: true };
  }

  private getPartnerScope(context: SlpBaseContext): 'Global' | 'Regional' | 'Local' {
    const lowerFocus = context.focusArea.toLowerCase();
    if (lowerFocus.includes('global') || lowerFocus.includes('sdg') || context.participantCount > 3) {
      return 'Global';
    }
    if (context.participantCount > 1 || context.documentCount > 0) {
      return 'Regional';
    }
    return 'Local';
  }
}
