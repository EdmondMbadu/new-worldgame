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
  route?: any[] | string;
  queryParams?: Record<string, string>;
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

  getFundViewModel(solutionId?: string): Observable<SlpFundViewModel> {
    return this.getBaseContext(solutionId).pipe(
      map((context) => {
        const activeTier = this.getFundingTier(context);

        return {
          shell: context.shell,
          heroTitle: context.hasSolution
            ? `Build a funding case around ${context.solutionTitle}.`
            : 'Translate the solution into a focused funding case.',
          heroDescription: context.hasSolution
            ? `This lane uses the actual maturity of ${context.solutionTitle} to point you toward the next internal actions that make the funding story stronger.`
            : 'Use this lane to prepare the materials and team signal needed before seeking funding.',
          stats: [
            {
              label: 'Funding readiness',
              value: `${context.readinessScore}%`,
              detail: 'Based on story, evidence, team signal, and assets already in the workspace.',
            },
            {
              label: 'Evidence items',
              value: this.formatCount(context.documentCount + context.evaluationCount),
              detail: 'Documents plus evaluation signals that support the ask.',
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
          resources: [
            {
              label: 'Ask narrative',
              title: 'Refine the funding story',
              description: `Use the solution detail page to make the problem, proposed intervention, and desired outcome legible to someone funding ${context.focusArea.toLowerCase()}.`,
              fitScore: this.buildFitScore(60, [
                context.solutionSummary.length > 80,
                context.evaluationCount > 0,
              ]),
              icon: 'request_quote',
              meta: [
                `Stage: ${context.stageLabel}`,
                'Best for clarifying the ask',
                `Lead focus: ${context.focusArea}`,
              ],
              cta: 'Open solution details',
              route: context.routes.details,
            },
            {
              label: 'Proof package',
              title: 'Assemble evidence and attachments',
              description: 'Funding decisions move faster when the supporting files, drafts, and proof points are easy to inspect in one place.',
              fitScore: this.buildFitScore(56, [
                context.documentCount > 0,
                !!context.image,
                context.evaluationCount > 0,
              ]),
              icon: 'inventory',
              meta: [
                `${context.documentCount} documents`,
                `${context.evaluationCount} evaluation signals`,
                'Best for diligence readiness',
              ],
              cta: 'Open document room',
              route: context.routes.documents,
            },
            {
              label: 'Capacity signal',
              title: 'Strengthen the team profile',
              description: 'If the project still needs operators, advisors, or researchers, use the dashboard invite tools before widening the funding ask.',
              fitScore: this.buildFitScore(52, [
                context.participantCount > 2,
                context.readyAssetCount > 3,
              ]),
              icon: 'groups',
              meta: [
                `${context.participantCount} active participants`,
                'Invite contributors directly from the dashboard',
                'Best for execution confidence',
              ],
              cta: 'Open invite flow',
              route: context.routes.dashboard,
              queryParams: { openInvite: 'true' },
            },
          ],
          postureTitle: `${activeTier.label} is the right first funding posture`,
          postureDescription:
            activeTier.label === 'Tier 1'
              ? 'The project still benefits most from smaller, faster validation dollars. Tighten the story, gather proof, and avoid overreaching too early.'
              : activeTier.label === 'Tier 2'
                ? 'The solution has enough shape to support program-level asks, but it still needs a crisp evidence trail and a focused execution narrative.'
                : 'The workspace signals a mature solution. The next task is packaging the evidence and partners clearly enough for larger strategic conversations.',
          askFramework: [
            `Problem: ${context.solutionSummary}`,
            `Why now: ${context.stageLabel} with ${context.readyAssetCount} launch signals already visible in the workspace.`,
            `Use of funds: grow the team, strengthen evidence, and move ${context.solutionTitle} toward implementation.`,
          ],
          nextMove: context.nextStep,
        };
      })
    );
  }

  getPartnerViewModel(solutionId?: string): Observable<SlpPartnerViewModel> {
    return this.getBaseContext(solutionId).pipe(
      map((context) => {
        const activeScope = this.getPartnerScope(context);

        return {
          shell: context.shell,
          heroTitle: context.hasSolution
            ? `Coordinate partners around ${context.solutionTitle}.`
            : 'Use the partner lane to turn a solution into a collaborative execution path.',
          heroDescription: context.hasSolution
            ? `This lane is now tied directly to the actual discussion room, meeting room, join page, and invite flow for ${context.solutionTitle}.`
            : 'Use the partner lane to connect the right people, rooms, and outreach steps around a solution.',
          stats: [
            {
              label: 'Active collaborators',
              value: this.formatCount(context.participantCount),
              detail: 'People already visible in the solution workspace.',
            },
            {
              label: 'Conversation routes',
              value: this.formatCount(3),
              detail: 'Discussion, meeting, and invite flow are ready to use.',
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
          collaborationCards: [
            {
              label: 'Discussion room',
              title: 'Capture partner questions in context',
              description: 'Use the full discussion room to collect feedback, requests, and commitments without losing the thread of the solution work.',
              fitScore: this.buildFitScore(58, [
                context.discussionCount > 0,
                context.participantCount > 1,
              ]),
              icon: 'forum',
              meta: [
                `${context.discussionCount} current discussion signals`,
                'Best for async partner coordination',
                `Focus: ${context.focusArea}`,
              ],
              cta: 'Open discussion',
              route: context.routes.discussion,
            },
            {
              label: 'Meeting room',
              title: 'Hold the live coordination call',
              description: 'Bring collaborators into the meeting room tied to this exact solution when the conversation needs synchronous momentum.',
              fitScore: this.buildFitScore(55, [
                context.participantCount > 1,
                context.readyAssetCount > 2,
              ]),
              icon: 'videocam',
              meta: [
                `${context.participantCount} active participants`,
                'Best for live alignment',
                'Use when decisions need real-time discussion',
              ],
              cta: 'Open meeting room',
              route: context.routes.meeting,
            },
            {
              label: 'Invite flow',
              title: 'Add the next collaborator',
              description: 'Open the dashboard invite flow for this solution and add a missing role without leaving the launch sequence.',
              fitScore: this.buildFitScore(61, [
                context.participantCount < 4,
                context.readyAssetCount > 2,
              ]),
              icon: 'person_add',
              meta: [
                'Directly opens the workspace invite state',
                'Best for filling gaps fast',
                context.participantCount < 2 ? 'Priority: grow the core team' : 'Priority: add strategic roles',
              ],
              cta: 'Open invite flow',
              route: context.routes.dashboard,
              queryParams: { openInvite: 'true' },
            },
            {
              label: 'Public join page',
              title: 'Share the collaboration entry point',
              description: 'Use the join page when a partner or contributor needs a direct route into the solution rather than a general platform link.',
              fitScore: this.buildFitScore(57, [
                context.hasSolution,
                context.solutionSummary.length > 80,
              ]),
              icon: 'share',
              meta: [
                'Public route for collaborators',
                `Stage: ${context.stageLabel}`,
                'Best for external intake',
              ],
              cta: 'Open join page',
              route: context.routes.join,
            },
          ],
          quickActions: [
            { label: 'Workspace home', icon: 'dashboard', route: context.routes.dashboard },
            { label: 'Public preview', icon: 'preview', route: context.routes.publicView },
            { label: 'Invite collaborators', icon: 'group_add', route: context.routes.dashboard, queryParams: { openInvite: 'true' } },
          ],
          insightStats: [
            {
              label: 'Ready touchpoints',
              value: this.formatCount(context.readyAssetCount),
              detail: 'Signals a prospective partner can inspect immediately.',
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
            `We already have ${context.participantCount || 1} active contributor${context.participantCount === 1 ? '' : 's'} and ${context.readyAssetCount} launch signal${context.readyAssetCount === 1 ? '' : 's'} in the workspace, and we are looking for a partner who can strengthen the next step.`,
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
        launch: '/slp',
        publish: '/slp',
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
      launch: ['/slp', solutionId],
      publish: ['/slp', solutionId],
      fund: ['/slp', solutionId, 'fund'],
      partner: ['/slp', solutionId, 'partner'],
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
