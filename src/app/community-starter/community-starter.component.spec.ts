import { fakeAsync, tick } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user';
import { CommunityStarterComponent } from './community-starter.component';
import { STARTER_STORAGE_KEY, newStarterDraft } from './starter-model';

describe('Community starter flow and recovery', () => {
  let component: CommunityStarterComponent;
  function create(raw?: string) {
    spyOn(Storage.prototype, 'getItem').and.callFake(key => key === STARTER_STORAGE_KEY ? raw || null : null);
    spyOn(Storage.prototype, 'setItem');
    spyOn(Storage.prototype, 'removeItem');
    const auth = { user$: new BehaviorSubject<User | null>(null), getRedirectUrl: () => '', setRedirectUrl: jasmine.createSpy(), register: jasmine.createSpy('register').and.resolveTo({ status: 'created' }), syncEmailVerified: jasmine.createSpy('syncEmailVerified').and.resolveTo(true) };
    const router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
    component = new CommunityStarterComponent(auth as any, router as any, { snapshot: { queryParamMap: { get: () => null } } } as any, {} as any);
    component.ngOnInit();
    return { auth, router };
  }
  afterEach(() => component?.ngOnDestroy());

  it('starts instantly without authenticating or creating a server solution', fakeAsync(() => {
    create();
    component.setAnswer('problem', 'Local residents cannot reach fresh food.');
    component.start();
    tick();
    expect(component.draft.started).toBeTrue();
    expect(component.draft.activeField).toBe('context');
    expect(component.user).toBeNull();
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  }));

  it('rejects an empty initial submission', () => {
    create();
    component.start();
    expect(component.draft.started).toBeFalse();
    expect(component.attempted).toBeTrue();
  });

  it('keeps answers when moving between steps and skipping a question', fakeAsync(() => {
    create();
    component.setAnswer('problem', 'A community issue.'); component.start();
    component.setAnswer('context', 'Older neighbors.'); component.continueAnswer();
    expect(component.draft.activeField).toBe('symptoms');
    component.continueAnswer(true);
    expect(component.draft.activeField).toBe('');
    component.nextStep();
    expect(component.draft.step).toBe(1);
    component.setAnswer('future', 'An accessible neighborhood.');
    component.chooseStep(0);
    expect(component.draft.answers['context']).toBe('Older neighbors.');
    expect(component.draft.answers['future']).toBe('An accessible neighborhood.');
    expect(component.draft.skipped).toContain('symptoms');
    tick();
  }));

  it('restores the precise step and in-progress answer after navigation or refresh', () => {
    const draft = newStarterDraft();
    Object.assign(draft, { started: true, step: 3, activeField: 'delivery', answers: { problem: 'A problem.', delivery: 'A possible lead…' } });
    create(JSON.stringify(draft));
    expect(component.draft.step).toBe(3);
    expect(component.field?.id).toBe('delivery');
    expect(component.draft.answers['delivery']).toBe('A possible lead…');
  });

  it('blocks overwriting another tab until a version is explicitly chosen', fakeAsync(() => {
    create();
    component.setAnswer('problem', 'My local version');
    const incoming = { ...newStarterDraft(), updatedAt: component.draft.updatedAt + 1, answers: { problem: 'Other tab' } };
    component.storageChanged({ key: STARTER_STORAGE_KEY, newValue: JSON.stringify(incoming) } as StorageEvent);
    (Storage.prototype.setItem as jasmine.Spy).calls.reset();
    tick(200);
    component.flushDraft();
    expect(Storage.prototype.setItem).not.toHaveBeenCalled();
    component.resolveOtherTab(true);
    expect(component.draft.answers['problem']).toBe('Other tab');
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  }));

  it('falls back to tab storage, then honestly reports memory-only mode', () => {
    create();
    const setter = Storage.prototype.setItem as jasmine.Spy;
    setter.and.callFake(function(this: Storage) { if (this === localStorage) throw new Error('blocked'); });
    component.flushDraft();
    expect(component.storageMode).toBe('tab');
    setter.and.throwError('blocked');
    component.flushDraft();
    expect(component.storageMode).toBe('memory');
    expect(component.storageLabel).toBe('Draft in memory only');
  });

  it('keeps email registration inside the starter while preserving save intent', () => {
    const { router } = create();
    component.setAnswer('problem', 'A local problem.');
    component.emailAuth(true);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.emailMode).toBeTrue();
    expect(Storage.prototype.setItem).toHaveBeenCalled();
  });

  it('carries the return destination to the existing login flow', () => {
    const { router } = create();
    component.setAnswer('problem', 'A local problem.');
    component.emailAuth(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { redirectTo: '/start-a-solution?save=1' } });
  });

  it('does not leave for sign-in if neither browser storage is available', () => {
    const { router } = create();
    (Storage.prototype.setItem as jasmine.Spy).and.throwError('blocked');
    component.setAnswer('problem', 'A local problem.');
    component.emailAuth(true);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.accountError).toContain('Browser storage is unavailable');
  });

  it('registers without a joining questionnaire and never persists credentials', async () => {
    const { auth, router } = create();
    component.setAnswer('problem', 'A local problem.');
    component.account = { firstName: 'Test', lastName: 'Member', email: 'member@example.test', password: 'not-a-real-password', agreed: true };
    await component.createAccount({ invalid: false, control: { markAllAsTouched() {} } } as any);
    expect(auth.register).toHaveBeenCalledWith('Test', 'Member', 'member@example.test', 'not-a-real-password', 'Start a community solution and collaborate in Global Solutions Lab.', []);
    expect(component.account.password).toBe('');
    expect(component.accountNotice).toContain('verify your email');
    expect(router.navigate).not.toHaveBeenCalled();
    const stored = (Storage.prototype.setItem as jasmine.Spy).calls.allArgs().map(args => args[1]).join('\n');
    expect(stored).not.toContain('not-a-real-password');
    expect(stored).not.toContain('member@example.test');
  });

  it('requires valid registration fields and explicit agreement', async () => {
    const { auth } = create();
    await component.createAccount({ invalid: true, control: { markAllAsTouched() {} } } as any);
    expect(auth.register).not.toHaveBeenCalled();
    expect(component.accountAttempted).toBeTrue();
  });

  it('checks email verification in place without creating or navigating to a workspace', async () => {
    const { router, auth } = create();
    component.user = { uid: 'member', verified: false };
    await component.checkEmailVerification();
    expect(auth.syncEmailVerified).toHaveBeenCalled();
    expect(component.user.verified).toBeTrue();
    expect(component.draft.exported).toBeUndefined();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
