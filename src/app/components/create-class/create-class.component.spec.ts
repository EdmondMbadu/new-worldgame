import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SolutionService } from '../../services/solution.service';
import { CreateClassComponent } from './create-class.component';
import { CLASS_DRAFT_KEY, readClassDraft } from './class-draft';

describe('Class setup', () => {
  let fixture: ComponentFixture<CreateClassComponent>;
  let component: CreateClassComponent;
  let users: BehaviorSubject<any>;
  let firebaseAuth: any;
  let auth: any;
  let functions: any;
  let create: jasmine.Spy;
  let router: any;
  const classId = 'abcdefghijklmnopqrst';
  const form = () => ({ invalid: false, control: { markAllAsTouched: jasmine.createSpy() } } as unknown as NgForm);
  const signedIn = async (uid = 'instructor', verified = true) => {
    firebaseAuth.currentUser = Promise.resolve({ uid, emailVerified: verified, providerData: [{ providerId: 'password' }], getIdToken: jasmine.createSpy().and.resolveTo('token') });
    users.next({ uid, email: 'teacher@example.test', verified });
    await fixture.whenStable(); fixture.detectChanges();
  };
  beforeEach(async () => {
    sessionStorage.removeItem(CLASS_DRAFT_KEY);
    users = new BehaviorSubject(null);
    firebaseAuth = { currentUser: Promise.resolve(null) };
    auth = { user$: users, setRedirectUrl: jasmine.createSpy(), register: jasmine.createSpy().and.resolveTo({ status: 'created' }), resendVerificationEmail: jasmine.createSpy().and.resolveTo() };
    create = jasmine.createSpy('createClassSpace').and.returnValue(of({ classId }));
    functions = { httpsCallable: jasmine.createSpy().and.returnValue(create) };
    await TestBed.configureTestingModule({ imports: [CreateClassComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: auth }, { provide: AngularFireAuth, useValue: firebaseAuth },
      { provide: AngularFirestore, useValue: { createId: () => classId, doc: () => ({ update: () => Promise.resolve() }) } },
      { provide: AngularFireFunctions, useValue: functions }, { provide: SolutionService, useValue: { createMeetLink: () => of(null) } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(CreateClassComponent); component = fixture.componentInstance;
    router = (component as any).router; spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); sessionStorage.removeItem(CLASS_DRAFT_KEY); sessionStorage.removeItem('redirectTo'); });

  it('shows account setup for a signed-out professor and class setup for a verified professor', async () => {
    expect(fixture.nativeElement.textContent).toContain('Start with your account');
    await signedIn();
    expect(fixture.nativeElement.textContent).toContain('Tell us about your class');
    expect(fixture.nativeElement.textContent).not.toContain('Start with your account');
  });
  it('requires verification before exposing class creation', async () => {
    await signedIn('instructor', false);
    expect(fixture.nativeElement.textContent).toContain('Verify your email');
    expect(fixture.nativeElement.querySelector('#class-name')).toBeNull();
    expect(create).not.toHaveBeenCalled();
    component.verifyEmail();
    expect(router.navigate).toHaveBeenCalledWith(['/verify-email'], { queryParams: { redirectTo: '/create-class' } });
  });
  it('rejects whitespace-only names and mismatched passwords without creating accounts', async () => {
    component.account = { firstName: '  ', lastName: 'Teacher', email: 't@example.test', password: '123456', confirmation: '654321', agreed: true };
    await component.createAccount(form());
    expect(auth.register).not.toHaveBeenCalled();
  });
  it('creates an ordinary account and returns from verification to class setup without storing credentials', async () => {
    component.account = { firstName: 'Ada', lastName: 'Teacher', email: 't@example.test', password: '123456', confirmation: '123456', agreed: true };
    component.draft.name = 'Climate design'; component.saveDraft();
    await component.createAccount(form());
    expect(auth.register).toHaveBeenCalledWith('Ada', 'Teacher', 't@example.test', '123456', 'Teach a class with Global Solutions Lab.', []);
    expect(router.navigate).toHaveBeenCalledWith(['/verify-email'], { queryParams: { redirectTo: '/create-class' } });
    const saved = sessionStorage.getItem(CLASS_DRAFT_KEY)!;
    expect(saved).toContain('Climate design'); expect(saved).not.toContain('123456'); expect(saved).not.toContain('t@example.test');
  });
  it('opens existing-account sign-in without modifying that account', async () => {
    auth.register.and.rejectWith({ code: 'auth/existing-account-sign-in-required' });
    component.account = { firstName: 'Ada', lastName: 'Teacher', email: 't@example.test', password: '123456', confirmation: '123456', agreed: true };
    await component.createAccount(form());
    expect(component.error).toContain('Sign in with your existing password');
    component.signIn(); expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { redirectTo: '/create-class' } });
    expect(create).not.toHaveBeenCalled();
  });
  it('keeps the same class identifier and draft on failure, then clears it only after opening the workspace', async () => {
    await signedIn(); component.draft.name = 'Climate design'; component.draft.institutionName = 'University';
    create.and.returnValue(throwError(() => ({ code: 'functions/unavailable' })));
    await component.createClass(form());
    expect(component.error).toContain('please try again'); expect(readClassDraft(sessionStorage).classId).toBe(classId);
    create.and.returnValue(of({ classId })); await component.createClass(form());
    expect(create.calls.allArgs().map(args => args[0].classId)).toEqual([classId, classId]);
    expect(router.navigate).toHaveBeenCalledWith(['/home-challenge', classId], { queryParams: { setup: '1' } });
    expect(sessionStorage.getItem(CLASS_DRAFT_KEY)).toBeNull();
  });
  it('requires an institution unless independent educator is selected', async () => {
    await signedIn(); component.draft.name = 'Community design';
    await component.createClass(form()); expect(create).not.toHaveBeenCalled();
    component.draft.independentEducator = true; await component.createClass(form()); expect(create).toHaveBeenCalledTimes(1);
  });
  it('prevents concurrent submissions', async () => {
    await signedIn(); component.draft.name = 'Community design'; component.draft.independentEducator = true;
    await Promise.all([component.createClass(form()), component.createClass(form())]);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('does not reuse a pending creation identifier after changing accounts', async () => {
    await signedIn(); component.draft.name = 'Old class'; component.draft.ownerUid = 'instructor'; component.draft.classId = classId; component.saveDraft();
    await signedIn('another-instructor');
    expect(component.draft.classId).toBe(''); expect(component.draft.name).toBe('');
  });
  it('recovers safely from a damaged draft', () => {
    const saved = readClassDraft({ getItem: () => '{bad json' }); expect(saved.name).toBe('');
    const safe = readClassDraft({ getItem: () => JSON.stringify({ name: 'A class', password: 'secret', independentEducator: 'true' }) });
    expect(safe.independentEducator).toBeFalse(); expect((safe as any).password).toBeUndefined();
  });
});
