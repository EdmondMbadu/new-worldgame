import { of, Subject } from 'rxjs';
import { PlaygroundStepsComponent } from './playground-steps.component';
import fixture from '../../../../functions/test/fixtures/policy-brief.json';

describe('Policy brief report integration', () => {
  let component: PlaygroundStepsComponent;
  let updates: Subject<any>;
  let set: jasmine.Spy;

  beforeEach(() => {
    spyOn(PlaygroundStepsComponent.prototype as any, 'initializeLanguageSupport').and.stub();
    updates = new Subject();
    set = jasmine.createSpy('set').and.resolveTo();
    component = new PlaygroundStepsComponent(
      { currentUser: { uid: 'author' } } as any,
      { snapshot: { paramMap: { get: () => 'solution' }, queryParamMap: { get: () => null } } } as any,
      { getSolution: () => of(undefined) } as any,
      {} as any, {} as any, {} as any, {} as any,
      { createId: () => 'request', doc: () => ({ valueChanges: () => updates, set }) } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any
    );
    component.currentSolution = { title: 'Clinic power', solutionId: 'solution' };
    component.currentDraftText = 'The edited strategy proposes a costed clinic energy pilot.';
    spyOn(component as any, 'getReportPeopleMetadata').and.returnValue({ label: 'Team', value: 'Clinic team' });
  });

  afterEach(() => {
    (component as any).reportDocSub?.unsubscribe();
    (component as any).solutionSub?.unsubscribe();
    clearTimeout((component as any).reportTimeoutHandle);
  });

  it('places Policy Brief third in the primary list and selects its dedicated instructions', () => {
    const primary = component.getPrimaryReports();
    expect(primary[2].id).toBe('policy-brief');
    expect(component.getSuggestedReports().some((r) => r.id === 'policy-brief')).toBeFalse();
    component.selectReportType(primary[2]);
    expect(component.reportInstruction).toContain('Compare the status quo');
  });

  it('sends structured source and audience context to the policy-specific server path', async () => {
    component.selectReportType(component.getPrimaryReports()[2]);
    component.policyBriefContext = { audience: 'City council', jurisdiction: 'Example city', decision: 'Authorize assessment' };
    await component.generateReport();
    const payload = set.calls.mostRecent().args[0];
    expect(payload.reportTypeId).toBe('policy-brief');
    expect(payload.policyBriefRequest.context).toEqual(component.policyBriefContext);
    expect(payload.policyBriefRequest.source).toContain(component.currentDraftText);
    expect(payload.policyBriefRequest.authors).toBe('Clinic team');
    updates.next({ status: { state: 'PROCESSING', message: 'Researching policy context…' } });
    expect(component.reportStatus).toBe('Researching policy context…');
  });

  it('pins the completed export format even after another format is selected', async () => {
    component.selectReportType(component.getPrimaryReports()[2]);
    await component.generateReport();
    updates.next({ status: { state: 'COMPLETED' }, policyBrief: fixture });
    component.selectReportType(component.reportTypes.find((r) => r.id === 'business-plan')!);
    expect(component.getReportTypeForExport()?.id).toBe('policy-brief');
    expect((component as any).buildReportFileName('pdf')).toBe('clinic-power-policy-brief.pdf');
    expect((component as any).buildReportPdfInput().reportTypeId).toBe('policy-brief');
    expect(component.reportText).toContain(fixture.title);
  });

  it('rejects a completed response that lacks the checked document', async () => {
    component.selectReportType(component.getPrimaryReports()[2]);
    await component.generateReport();
    updates.next({ status: { state: 'COMPLETED' }, response: 'Unvalidated narrative' });
    expect(component.reportText).toBe('');
    expect(component.reportError).toContain('incomplete');
    expect(component.reportLoading).toBeFalse();
  });

  it('keeps existing non-policy report requests on their original response path', async () => {
    component.selectReportType(component.reportTypes.find((r) => r.id === 'executive-summary')!);
    await component.generateReport();
    expect(set.calls.mostRecent().args[0].policyBriefRequest).toBeUndefined();
    updates.next({ status: { state: 'COMPLETED' }, response: 'A clear executive summary.' });
    expect(component.reportText).toBe('A clear executive summary.');
    expect(component.policyBrief).toBeNull();
  });
});
