import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NgForm } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SolutionService } from '../../services/solution.service';
import { DataService } from '../../services/data.service';
import { CreateClassComponent } from './create-class.component';
import { VerifyEmailComponent } from '../verify-email/verify-email.component';
import { CLASS_DRAFT_KEY, readClassDraft } from './class-draft';
import { finishClassSetup, hasPendingClassSetup, rememberClassSetup } from './class-setup-intent';

describe('Class setup', () => {
  let fixture: ComponentFixture<CreateClassComponent>;
  let component: CreateClassComponent;
  let users: BehaviorSubject<any>;
  let firebaseAuth: any;
  let auth: any;
  let functions: any;
  let create: jasmine.Spy;
  let router: any;
  let pageUpdate: jasmine.Spy;
  let upload: jasmine.Spy;
  const storedImage = 'https://firebasestorage.googleapis.com/v0/b/new-worldgame/o/logo.png';
  const classId = 'abcdefghijklmnopqrst';
  const form = () => ({ invalid: false, control: { markAllAsTouched: jasmine.createSpy() } } as unknown as NgForm);
  const signedIn = async (uid = 'instructor', verified = true) => {
    firebaseAuth.currentUser = Promise.resolve({ uid, emailVerified: verified, providerData: [{ providerId: 'password' }], getIdToken: jasmine.createSpy().and.resolveTo('token') });
    users.next({ uid, email: 'teacher@example.test', verified });
    await fixture.whenStable(); fixture.detectChanges();
  };
  beforeEach(async () => {
    sessionStorage.removeItem(CLASS_DRAFT_KEY);
    finishClassSetup('instructor');
    sessionStorage.removeItem('gsl.class-introduction.instructor');
    users = new BehaviorSubject(null);
    firebaseAuth = { currentUser: Promise.resolve(null) };
    auth = { user$: users, setRedirectUrl: jasmine.createSpy(), register: jasmine.createSpy().and.resolveTo({ status: 'created' }), resendVerificationEmail: jasmine.createSpy().and.resolveTo(), syncEmailVerified: jasmine.createSpy().and.resolveTo(true) };
    create = jasmine.createSpy('createClassSpace').and.returnValue(of({ classId }));
    functions = { httpsCallable: jasmine.createSpy().and.returnValue(create) };
    pageUpdate = jasmine.createSpy('update').and.resolveTo();
    upload = jasmine.createSpy('startUpload').and.resolveTo(storedImage);
    await TestBed.configureTestingModule({ imports: [CreateClassComponent], providers: [provideRouter([]),
      { provide: AuthService, useValue: auth }, { provide: AngularFireAuth, useValue: firebaseAuth },
      { provide: AngularFirestore, useValue: { createId: () => classId, doc: () => ({ update: pageUpdate }) } },
      { provide: AngularFireFunctions, useValue: functions }, { provide: SolutionService, useValue: { createMeetLink: () => of(null) } }, { provide: DataService, useValue: { startUpload: upload } },
    ] }).compileComponents();
    TestBed.overrideProvider(AngularFireAuth, { useValue: firebaseAuth });
    TestBed.overrideProvider(AngularFirestore, { useValue: { createId: () => classId, doc: () => ({ update: pageUpdate }) } });
    TestBed.overrideProvider(AngularFireFunctions, { useValue: functions });
    TestBed.overrideComponent(CreateClassComponent, { set: { providers: [
      { provide: AuthService, useValue: auth }, { provide: AngularFireAuth, useValue: firebaseAuth },
      { provide: AngularFirestore, useValue: { createId: () => classId, doc: () => ({ update: pageUpdate }) } },
      { provide: AngularFireFunctions, useValue: functions }, { provide: SolutionService, useValue: { createMeetLink: () => of(null) } }, { provide: DataService, useValue: { startUpload: upload } },
    ] } });
    fixture = TestBed.createComponent(CreateClassComponent); component = fixture.componentInstance;
    router = (component as any).router; spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });
  afterEach(() => { fixture?.destroy(); sessionStorage.removeItem(CLASS_DRAFT_KEY); sessionStorage.removeItem('redirectTo'); finishClassSetup('instructor'); sessionStorage.removeItem('gsl.class-introduction.instructor'); });

  it('shows account setup for a signed-out professor and class setup for a verified professor', async () => {
    expect(fixture.nativeElement.textContent).toContain('Start with your account');
    await signedIn();
    expect(fixture.nativeElement.textContent).toContain('Tell us about your class');
    expect(fixture.nativeElement.textContent).not.toContain('Start with your account');
  });
  it('requires verification before exposing class creation', async () => {
    await signedIn('instructor', false);
    expect(fixture.nativeElement.textContent).toContain('Check your inbox');
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
    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.accountCreated).toBeTrue();
    expect(component.notice).toContain('create your class space');
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
  it('explains the class journey after verification and offers an explicit next action', async () => {
    rememberClassSetup('instructor');
    await signedIn();
    expect(fixture.nativeElement.textContent).toContain('Let’s bring your class together.');
    expect(fixture.nativeElement.textContent).toContain('Set up my class space');
    expect(fixture.nativeElement.querySelector('#class-name')).toBeNull();
    component.continueToClass(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#class-name')).not.toBeNull();
  });
  it('checks verification in place and continues to a class-specific welcome', async () => {
    await signedIn('instructor', false);
    await component.checkVerification(); fixture.detectChanges();
    expect(component.verified).toBeTrue();
    expect(component.showClassIntroduction).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Set up my class space');
  });
  it('keeps verification intent scoped to the account and clears it only after class creation', async () => {
    rememberClassSetup('instructor');
    expect(hasPendingClassSetup('another-instructor')).toBeFalse();
    await signedIn(); component.continueToClass(); component.draft.name = 'Design studio'; component.draft.independentEducator = true;
    await component.createClass(form());
    expect(hasPendingClassSetup('instructor')).toBeFalse();
  });
  it('recovers class setup when a verification email opens in a new tab without a return URL', async () => {
    rememberClassSetup('instructor');
    const verificationAuth: any = { getCurrentUserPromise: () => Promise.resolve({ uid: 'instructor', email: 'teacher@example.test' }), syncEmailVerified: () => Promise.resolve(false), setRedirectUrl: jasmine.createSpy() };
    const originalUrl = location.pathname + location.search;
    history.replaceState(null, '', location.pathname); sessionStorage.removeItem('redirectTo');
    try {
      const page = new VerifyEmailComponent(router, { snapshot: { queryParamMap: { get: () => null } } } as any, verificationAuth);
      await page.ngOnInit();
      expect(page.classReturn).toBeTrue(); expect(page.redirectTarget).toBe('/create-class');
    } finally { history.replaceState(null, '', originalUrl); }
  });
  it('preserves an explicit destination when verification completes', async () => {
    rememberClassSetup('instructor');
    const verificationAuth: any = { getCurrentUserPromise: () => Promise.resolve({ uid: 'instructor' }), syncEmailVerified: () => Promise.resolve(false), setRedirectUrl: jasmine.createSpy() };
    const originalUrl = location.pathname + location.search;
    history.replaceState(null, '', location.pathname + '?redirectTo=%2Fhome'); sessionStorage.removeItem('redirectTo');
    try {
      const page = new VerifyEmailComponent(router, { snapshot: { queryParamMap: { get: () => null } } } as any, verificationAuth);
      await page.ngOnInit(); expect(page.classReturn).toBeFalse(); expect(page.redirectTarget).toBe('/home');
    } finally { history.replaceState(null, '', originalUrl); }
  });
  it('uploads optional branding to the class folder and applies it after the class is created', async () => {
    await signedIn(); component.draft.name = 'Design studio'; component.draft.independentEducator = true;
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    const input = { files: { item: () => file }, value: 'logo.png' } as unknown as HTMLInputElement;
    await component.uploadImage('logo', input);
    expect(upload).toHaveBeenCalledWith(file, `challenge-page/${classId}/logo`, 'false', undefined, component.maxImageBytes);
    expect(component.draft.logoImage).toBe(storedImage);
    await component.createClass(form());
    expect(create.calls.mostRecent().args[0].logoImage).toBeUndefined();
    expect(pageUpdate).toHaveBeenCalledWith({ logoImage: storedImage });
  });
  it('rejects unsupported or oversized images without uploading', async () => {
    await signedIn();
    const input = (file: File) => ({ files: { item: () => file }, value: '' } as unknown as HTMLInputElement);
    await component.uploadImage('cover', input(new File(['x'], 'cover.gif', { type: 'image/gif' })));
    expect(component.uploadError.cover).toContain('JPG');
    const big = new File(['x'], 'cover.png', { type: 'image/png' }); Object.defineProperty(big, 'size', { value: component.maxImageBytes + 1 });
    await component.uploadImage('cover', input(big));
    expect(component.uploadError.cover).toContain('5 MB'); expect(upload).not.toHaveBeenCalled();
  });
  it('recovers safely from a damaged draft', () => {
    const saved = readClassDraft({ getItem: () => '{bad json' }); expect(saved.name).toBe('');
    const safe = readClassDraft({ getItem: () => JSON.stringify({ name: 'A class', password: 'secret', independentEducator: 'true' }) });
    expect(safe.independentEducator).toBeFalse(); expect((safe as any).password).toBeUndefined();
    expect(readClassDraft({ getItem: () => JSON.stringify({ logoImage: 'javascript:alert(1)' }) }).logoImage).toBe('');
  });
});
