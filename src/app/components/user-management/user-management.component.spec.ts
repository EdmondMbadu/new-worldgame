import { UserManagementComponent } from './user-management.component';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';

describe('UserManagementComponent', () => {
  let component: UserManagementComponent;

  beforeEach(() => {
    component = new UserManagementComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      { parseDateMMDDYYYY: (value: string) => Date.parse(value) } as any,
      {} as any,
      {} as any
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('likely bot filtering', () => {
    const pendingCheckoutUser = (overrides: Partial<User> = {}) =>
      ({
        email: 'borrowed-address@example.com',
        firstName: 'Mbcl',
        lastName: 'Xiuzy',
        role: 'schoolAdmin',
        status: 'pendingPayment',
        tempSolutionstarted: '0',
        tempSolutionSubmitted: '0',
        ...overrides,
      } as User);

    it('excludes an unconfirmed provisional checkout even when its name is short', () => {
      expect(component.isLikelyBot(pendingCheckoutUser())).toBeTrue();
    });

    it('keeps a verified provisional checkout in the real-user count', () => {
      expect(
        component.isLikelyBot(pendingCheckoutUser({ verified: true }))
      ).toBeFalse();
    });

    it('keeps a provisional checkout once it is linked to a school', () => {
      expect(
        component.isLikelyBot(
          pendingCheckoutUser({ schoolId: 'completed-school-checkout' })
        )
      ).toBeFalse();
    });

    it('keeps quiet unverified users who are not abandoned checkout profiles', () => {
      expect(
        component.isLikelyBot(
          pendingCheckoutUser({
            firstName: 'Taylor',
            lastName: 'Morgan',
            role: 'individual',
            status: '',
          })
        )
      ).toBeFalse();
    });

    it('uses actual solution ownership as activity even when counters are stale', () => {
      const user = pendingCheckoutUser({ email: 'maker@example.com' });
      (component as any).userSolutionsByEmail.set('maker@example.com', [
        { solutionId: 'active-solution' } as Solution,
      ]);

      expect(component.isLikelyBot(user)).toBeFalse();
    });

    it('lets verified users override the fallback name heuristic', () => {
      expect(
        component.isLikelyBot(
          pendingCheckoutUser({
            firstName: 'VEVEHrDRvPSiVYDAzRyJk',
            lastName: 'DmzZMhRahLBqNObVLNzp',
            verified: true,
          })
        )
      ).toBeFalse();
    });
  });

  it('builds a video-script prompt from Strategy Review content without people or email fields', () => {
    component.allUsers = [
      {
        email: 'author@example.com',
        firstName: 'Private',
        lastName: 'Author',
        dateJoined: '01/01/2026',
      } as User,
    ];
    component.everySolution = [
      {
        solutionId: 'clean-water',
        title: 'Clean Water Access',
        description: 'Private Author is developing neighborhood water hubs.',
        solutionArea: 'Public health',
        strategyReview:
          '<h2>Preferred future</h2><p>Reliable water for every household.</p><p>Contact author@example.com for details.</p>',
        authorEmail: 'author@example.com',
        authorName: 'Private Author',
        participants: { 'author@example.com': 'Private Author' },
        lastSubstantiveEditAt: new Date(Date.now() - 60_000).toISOString(),
      } as Solution,
    ];

    component.generateWeeklyVideoScriptPrompt();

    expect(component.weeklyVideoScriptPrompt).toContain('Clean Water Access');
    expect(component.weeklyVideoScriptPrompt).toContain(
      'Reliable water for every household.'
    );
    expect(component.weeklyVideoScriptPrompt).toContain(
      '[team member omitted] is developing neighborhood water hubs.'
    );
    expect(component.weeklyVideoScriptPrompt).toContain('[email omitted]');
    expect(component.weeklyVideoScriptPrompt).not.toContain('Private Author');
    expect(component.weeklyVideoScriptPrompt).not.toContain(
      'author@example.com'
    );
    expect(component.weeklyVideoScriptPrompt).not.toContain('<h2>');
  });

  it('validates and normalizes labeled intelligence brief links', () => {
    component.aiInsightsAdditionalLinks = [
      { label: 'Read the report', url: '' },
    ];
    expect(component.aiInsightsAdditionalLinksValidationError()).toBe(
      'Each link needs a URL.'
    );

    component.aiInsightsAdditionalLinks = [
      { label: ' Read the report ', url: 'https://example.com/report' },
      { label: 'Duplicate', url: 'https://example.com/report' },
    ];
    expect(component.aiInsightsAdditionalLinksValidationError()).toBe(
      'Remove duplicate link URLs before saving.'
    );

    component.aiInsightsAdditionalLinks = [
      { label: ' Read the report ', url: 'https://example.com/report' },
    ];
    expect(component.aiInsightsAdditionalLinksValidationError()).toBe('');
    expect(component.hasUnsavedAIInsightsAdditionalLinks()).toBeTrue();
    expect(
      (component as any).normalizeAIInsightsAdditionalLinks(
        component.aiInsightsAdditionalLinks
      )
    ).toEqual([
      { label: 'Read the report', url: 'https://example.com/report' },
    ]);
  });
  it('requires a solution before requesting a source preview', async () => {
    await component.previewAIInsightsBrief();
    expect(component.briefPreviewError).toContain('Select a solution');
    expect(component.briefPreviewBusy).toBeFalse();
  });

  it('does not persist a video link when metadata verification fails', async () => {
    component.aiInsightsVideoSummaryUrl = 'https://newworld-game.org/nwg-news?v=missing';
    spyOn(component, 'previewBriefVideo').and.returnValue(Promise.resolve(false));
    const persist = spyOn<any>(component, 'persistAIInsightsVideoSummaryUrl');
    await component.saveAIInsightsVideoSummaryUrl();
    expect(persist).not.toHaveBeenCalled();
  });

  it('keeps the saved URL unchanged while previewing a draft', async () => {
    component.aiInsightsSavedVideoSummaryUrl = 'https://newworld-game.org/nwg-news?v=saved';
    component.aiInsightsVideoSummaryUrl = 'https://newworld-game.org/nwg-news?v=draft';
    await component.previewBriefVideo();
    expect(component.aiInsightsSavedVideoSummaryUrl).toContain('v=saved');
    expect(component.hasUnsavedAIInsightsVideoUrl()).toBeTrue();
  });

});
