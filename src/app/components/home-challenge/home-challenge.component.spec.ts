import { HomeChallengeComponent } from './home-challenge.component';
import { of } from 'rxjs';

describe('HomeChallengeComponent', () => {
  const pageId2025 = '1eKg1Mn15M8yRmRIScw5';
  const pageId2026 = 'sJBETWwiB3IZ9kDvjDCv';
  const pageSlug2026 = 'entp-601-2026';

  function createComponent(resolveChallengePage: jasmine.Spy) {
    const route = {
      snapshot: {
        paramMap: {
          get: () => pageSlug2026,
        },
      },
    };
    const router = {
      url: `/home-challenge/${pageSlug2026}`,
      navigate: jasmine.createSpy('navigate'),
    };
    const challenge = {
      resolveChallengePage,
    };
    const questionTemplates = {
      watchForChallenge: () => of({
        challengePageId: pageId2026,
        mode: 'standard',
        revision: 0,
        locales: { en: {}, fr: {} },
      }),
      createEditorDraft: () => ({ en: {}, fr: {} }),
    };

    const component = new (HomeChallengeComponent as any)(
      route,
      { currentUser: {} },
      router,
      {},
      {},
      {},
      {},
      challenge,
      {},
      {},
      {},
      {},
      questionTemplates
    ) as HomeChallengeComponent;

    return { component, router };
  }

  it('rejects a stale history ID and resolves the visible slug', async () => {
    const resolveChallengePage = jasmine
      .createSpy('resolveChallengePage')
      .and.callFake(async (value: string) => {
        if (value === pageId2025) {
          return {
            id: pageId2025,
            data: {
              heading: 'Summer 2025',
            },
            loadedByCustomUrl: false,
          };
        }

        return {
          id: pageId2026,
          data: {
            customUrl: pageSlug2026,
            heading: 'Summer 2026',
          },
          loadedByCustomUrl: true,
        };
      });
    const { component } = createComponent(resolveChallengePage);
    const processChallengePageData = spyOn<any>(
      component,
      'processChallengePageData'
    );
    spyOn<any>(component, 'rememberResolvedChallengePage');

    await component.loadChallengePage(pageSlug2026, pageId2025);

    expect(resolveChallengePage.calls.allArgs()).toEqual([
      [pageId2025],
      [pageSlug2026],
    ]);
    expect(component.challengePageId).toBe(pageId2026);
    expect(processChallengePageData).toHaveBeenCalledWith(
      jasmine.objectContaining({
        customUrl: pageSlug2026,
        heading: 'Summer 2026',
      }),
      true,
      jasmine.any(Number)
    );
  });

  it('uses a valid history ID without repeating the slug query', async () => {
    const resolveChallengePage = jasmine
      .createSpy('resolveChallengePage')
      .and.resolveTo({
        id: pageId2026,
        data: {
          customUrl: pageSlug2026,
          heading: 'Summer 2026',
        },
        loadedByCustomUrl: false,
      });
    const { component } = createComponent(resolveChallengePage);
    const processChallengePageData = spyOn<any>(
      component,
      'processChallengePageData'
    );
    spyOn<any>(component, 'rememberResolvedChallengePage');

    await component.loadChallengePage(pageSlug2026, pageId2026);

    expect(resolveChallengePage).toHaveBeenCalledOnceWith(pageId2026);
    expect(component.challengePageId).toBe(pageId2026);
    expect(processChallengePageData).toHaveBeenCalledWith(
      jasmine.objectContaining({
        customUrl: pageSlug2026,
        heading: 'Summer 2026',
      }),
      true,
      jasmine.any(Number)
    );
  });

  it('keeps only links explicitly assigned to the active challenge space', () => {
    const { component } = createComponent(jasmine.createSpy('resolveChallengePage'));
    component.challengePageId = pageId2026;
    const fetchChallenges = spyOn(component, 'fetchChallenges');

    (component as any).applyPageChallenges([
      { id: 'expected-1', challengePageId: pageId2026 },
      { id: 'wrong-page', challengePageId: pageId2025 },
      { id: 'unassigned' },
    ]);

    expect(component.pageChallengeCards).toEqual([
      jasmine.objectContaining({ id: 'expected-1', challengePageId: pageId2026 }),
    ]);
    expect(fetchChallenges).toHaveBeenCalledWith(
      [jasmine.objectContaining({ id: 'expected-1' })],
      jasmine.any(Number),
      pageId2026
    );
  });

  it('authoritatively clears a previously populated grid for an empty space', () => {
    const { component } = createComponent(jasmine.createSpy('resolveChallengePage'));
    component.challengePageId = pageId2026;
    component.pageChallengeCards = [
      { id: 'stale-solution', challengePageId: pageId2025 },
    ];
    component.titles = ['Stale solution'];
    component.ids = ['stale-solution'];

    (component as any).applyPageChallenges([]);

    expect(component.pageChallengeCards).toEqual([]);
    expect(component.titles).toEqual([]);
    expect(component.ids).toEqual([]);
  });

  it('ignores a hydration result from an older page load', () => {
    const { component } = createComponent(jasmine.createSpy('resolveChallengePage'));
    component.challengePageId = pageId2026;
    const currentLoadToken = (component as any).pageLoadToken;
    const fetchChallenges = spyOn(component, 'fetchChallenges');

    (component as any).applyPageChallenges(
      [{ id: 'old-result', challengePageId: pageId2025 }],
      currentLoadToken - 1,
      pageId2025
    );

    expect(component.pageChallengeCards).toEqual([]);
    expect(fetchChallenges).not.toHaveBeenCalled();
  });
});
