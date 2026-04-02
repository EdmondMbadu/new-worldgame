import { Injectable } from '@angular/core';
import { Solution } from '../models/solution';
import { map, Observable, of } from 'rxjs';
import { SolutionService } from './solution.service';

export type SlpLane = 'publish' | 'fund' | 'partner';

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
  route?: any[] | string;
  queryParams?: Record<string, string>;
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

@Injectable({
  providedIn: 'root',
})
export class SlpContextService {
  constructor(private solutionService: SolutionService) {}

  getPublishViewModel(solutionId?: string): Observable<SlpPublishViewModel> {
    return this.getBaseContext(solutionId).pipe(
      map((context) => {
        const resources: SlpActionCard[] = [
          {
            label: 'Public-facing surface',
            title: 'Open the live solution view',
            description: context.hasSolution
              ? `Review how "${context.solutionTitle}" reads from the outside before you circulate it further.`
              : 'Use the public solution view as the first publishing surface once the core story is ready.',
            fitScore: this.buildFitScore(62, [
              context.hasSolution,
              context.solutionSummary.length > 120,
              !!context.image,
              context.documentCount > 0,
            ]),
            icon: 'public',
            meta: [
              `Stage: ${context.stageLabel}`,
              `${context.readyAssetCount} launch assets`,
              'Best for first external review',
            ],
            cta: 'Open public view',
            route: context.routes.publicView,
          },
          {
            label: 'Story and evidence',
            title: 'Tighten the launch narrative',
            description: context.hasSolution
              ? `Use the solution workspace to sharpen the framing around ${context.focusArea.toLowerCase()} and prepare a cleaner public brief.`
              : 'Refine the title, problem statement, and public-facing summary before launch.',
            fitScore: this.buildFitScore(58, [
              context.solutionSummary.length > 80,
              context.documentCount > 0,
              context.evaluationCount > 0,
            ]),
            icon: 'edit_note',
            meta: [
              `Focus: ${context.focusArea}`,
              `${context.evaluationCount} feedback signals`,
              'Best for credibility and clarity',
            ],
            cta: 'Edit solution details',
            route: context.routes.details,
          },
          {
            label: 'Asset room',
            title: 'Verify the supporting files',
            description: context.hasSolution
              ? 'Make sure the document room contains the evidence, visuals, and support material needed to back the story.'
              : 'Collect visuals and supporting files in one place before launch.',
            fitScore: this.buildFitScore(54, [
              context.documentCount > 0,
              !!context.image,
              context.solutionSummary.length > 120,
            ]),
            icon: 'folder_open',
            meta: [
              `${context.documentCount} documents attached`,
              !!context.image ? 'Hero image ready' : 'Add a cover image',
              'Best for asset QA',
            ],
            cta: 'Open documents',
            route: context.routes.documents,
          },
        ];

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
            ? `Launch ${context.solutionTitle} with a sharper public story.`
            : 'Turn a promising solution into a launch-ready public narrative.',
          heroDescription: context.hasSolution
            ? `Everything in this publish lane is now anchored to the actual solution data for ${context.solutionTitle}. The page updates live as the workspace changes, and every CTA routes back into the right place for this solution.`
            : 'This publish lane helps you shape the story, the proof, and the first public-facing surfaces for a solution.',
          stats: [
            {
              label: 'Ready assets',
              value: this.formatCount(context.readyAssetCount),
              detail: 'Signals already present in the solution workspace.',
            },
            {
              label: 'Team signal',
              value: this.formatCount(context.participantCount),
              detail: 'Active participants contributing to launch credibility.',
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
            { label: 'Primary lane', value: context.primaryLaneLabel },
            {
              label: 'Live source',
              value: context.hasSolution ? 'Realtime solution workspace' : 'Generic SLP mode',
            },
          ],
          intents: this.buildIntents(context),
          categoryLine: context.hasSolution
            ? `Showing launch surfaces for ${context.focusArea}`
            : 'Showing launch surfaces for your next solution',
          sortLabel: 'Most actionable first',
          resources,
          checklist,
          editorialNote: context.hasSolution
            ? `The strongest first move for ${context.solutionTitle} is the one that makes the story legible and verifiable. Publish only after the outside view matches the internal intent.`
            : 'A good launch sequence starts with clarity, then proof, then reach.',
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
