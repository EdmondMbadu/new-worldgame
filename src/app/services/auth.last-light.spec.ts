import { fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('Last Light account creation and return', () => {
  let service: any;
  let user: any;
  let originalUrl: string;
  const destination = '/games/last-light/?resume=0081bdaa-6dce-4ac5-9fac-c33976f1251b&lang=fr';
  const setDestination = (value: string) => {
    sessionStorage.removeItem('redirectTo');
    history.replaceState(null, '', location.pathname + '?redirectTo=' + encodeURIComponent(value));
  };
  beforeEach(() => {
    originalUrl = location.pathname + location.search;
    setDestination(destination);
    user = { uid: 'test-player', emailVerified: false, providerData: [{ providerId: 'password' }], reload: jasmine.createSpy('reload').and.resolveTo() };
    // Exercise the real service methods with isolated Firebase boundaries.
    service = Object.create(AuthService.prototype);
    service.newUser = {};
    service.fireauth = {
      createUserWithEmailAndPassword: jasmine.createSpy('create').and.resolveTo({user}),
      signInWithEmailAndPassword: jasmine.createSpy('signIn').and.resolveTo({user}),
      signOut: jasmine.createSpy('signOut').and.resolveTo(),
    };
    service.router = { navigate: jasmine.createSpy('navigate').and.resolveTo(true) };
    spyOn(service, 'addNewUser').and.resolveTo();
    spyOn(service, 'repairRegistrationProfile').and.resolveTo(true);
    spyOn(service, 'sendEmailForVerification').and.resolveTo();
    spyOn(service, 'markUserVerified').and.resolveTo();
    spyOn(service, 'updateLastLogin').and.resolveTo();
    spyOn(service, 'ensureUserProfileDocument').and.resolveTo();
    spyOn(service, 'navigateToDestination');
    spyOn(service, 'popRedirect').and.returnValue(destination);
  });
  afterEach(() => { history.replaceState(null, '', originalUrl); sessionStorage.removeItem('redirectTo'); });
  const register = () => service.register(' 李 ', ' NG ', ' player@example.test ', 'test-pass-42', 'Play Last Light.', [], {continueGame:true});

  it('awaits profile creation, trims names and returns even when verification delivery fails', async () => {
    service.sendEmailForVerification.and.rejectWith(new Error('email offline'));
    const outcome = await register();
    expect(service.addNewUser).toHaveBeenCalledWith('李','NG',user,'Play Last Light.',[]);
    expect(outcome).toEqual({status:'created',profileRepaired:true,verificationSent:false});
    expect(service.newUser.success).toBeTrue();
  });
  it('bounds the email wait after a successful account and profile creation', fakeAsync(() => {
    service.sendEmailForVerification.and.returnValue(new Promise(() => {}));
    let outcome: any;
    register().then((value: any) => outcome=value);
    flushMicrotasks(); tick(10000); flushMicrotasks();
    expect(outcome.status).toBe('created'); expect(outcome.verificationSent).toBeFalse();
  }));
  it('bounds an offline Firestore write and offers recovery instead of spinning forever', fakeAsync(() => {
    service.addNewUser.and.returnValue(new Promise(() => {}));
    let failure: any;
    register().catch((error: any) => failure=error);
    flushMicrotasks(); tick(18000); flushMicrotasks();
    expect(failure.code).toBe('auth/game-profile-pending');
    expect(service.sendEmailForVerification).not.toHaveBeenCalled();
  }));
  it('keeps the ordinary registration verification requirement', async () => {
    setDestination('/home'); service.sendEmailForVerification.and.rejectWith(new Error('email offline'));
    await expectAsync(register()).toBeRejectedWithError('email offline');
    expect(service.newUser.success).toBeFalse();
  });
  it('recovers a partial registration only after proving ownership and stays signed in for the game', async () => {
    service.addNewUser.and.rejectWith(new Error('profile offline'));
    await expectAsync(register()).toBeRejectedWithError('profile offline');
    service.fireauth.createUserWithEmailAndPassword.and.rejectWith({code:'auth/email-already-in-use'});
    user.emailVerified=true;
    const outcome = await register();
    expect(outcome.status).toBe('recovered-verified');
    expect(service.fireauth.signInWithEmailAndPassword).toHaveBeenCalledWith('player@example.test','test-pass-42');
    expect(service.repairRegistrationProfile).toHaveBeenCalled();
    expect(service.fireauth.signOut).not.toHaveBeenCalled();
  });
  it('does not repair a different account when the existing password is wrong', async () => {
    service.fireauth.createUserWithEmailAndPassword.and.rejectWith({code:'auth/email-already-in-use'});
    service.fireauth.signInWithEmailAndPassword.and.rejectWith({code:'auth/invalid-credential'});
    try { await register(); fail('expected ownership failure'); } catch(error:any) { expect(error.code).toBe('auth/existing-account-sign-in-required'); }
    expect(service.repairRegistrationProfile).not.toHaveBeenCalled();
    expect(service.sendEmailForVerification).not.toHaveBeenCalled();
  });
  it('returns an unverified game login to its exact checkpoint', async () => {
    await service.finishInteractiveSignIn(user);
    expect(service.navigateToDestination).toHaveBeenCalledWith(destination);
    expect(service.router.navigate).not.toHaveBeenCalled();
    expect(service.markUserVerified).not.toHaveBeenCalled();
  });
  it('still redirects unverified users of other site flows to verification', async () => {
    setDestination('/home');
    await service.finishInteractiveSignIn(user);
    expect(service.navigateToDestination).not.toHaveBeenCalled();
    expect(service.router.navigate).toHaveBeenCalledWith(['/verify-email'],{queryParams:{redirectTo:'/home'}});
  });
});
