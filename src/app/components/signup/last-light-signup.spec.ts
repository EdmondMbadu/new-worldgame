import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { SignupComponent } from './signup.component';

describe('Let There Be Light signup form', () => {
  let fixture: ComponentFixture<SignupComponent>, component: SignupComponent, auth: any;
  beforeEach(async () => {
    auth={register:jasmine.createSpy('register').and.resolveTo({status:'created',profileRepaired:true}),setRedirectUrl:jasmine.createSpy('setRedirectUrl')};
    await TestBed.configureTestingModule({declarations:[SignupComponent],imports:[CommonModule,FormsModule],providers:[provideRouter([]),{provide:AuthService,useValue:auth}],schemas:[NO_ERRORS_SCHEMA]}).compileComponents();
    fixture=TestBed.createComponent(SignupComponent); component=fixture.componentInstance;
    component.gameReturnUrl='/games/last-light/?resume=0081bdaa-6dce-4ac5-9fac-c33976f1251b';
    spyOn<any>(component,'returnToGame'); fixture.detectChanges();
  });
  it('offers only the four account fields and terms, with login and both ways to help', () => {
    const page=fixture.nativeElement as HTMLElement;
    expect(page.querySelectorAll('.game-field input').length).toBe(4);
    expect(page.querySelectorAll('input[type="checkbox"]').length).toBe(1);
    expect(page.textContent).toContain('Log in'); expect(page.textContent).toContain('Invite 10 friends'); expect(page.textContent).toContain('Contribute $10');
    expect(page.textContent).not.toContain('Confirm password'); expect(page.textContent).not.toContain('problem solver');
  });
  it('shows useful errors without submitting invalid data', async () => {
    await component.createAccount(); fixture.detectChanges();
    expect(auth.register).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelectorAll('[aria-invalid="true"]').length).toBe(5);
    expect(component.fieldErrors['email']).toBe('Enter a valid email address.');
  });
  it('accepts international and short names immediately, without a repeated password, pledge or five-second wait', async () => {
    component.firstName='李'; component.lastName='NG'; component.email='player@example.test'; component.password='test-pass-42'; component.agree=true;
    await component.createAccount();
    expect(auth.register).toHaveBeenCalledWith('李','NG','player@example.test','test-pass-42','Play Let There Be Light and save my journey.',[],{continueGame:true});
    expect((component as any).returnToGame).toHaveBeenCalled(); expect(component.password).toBe('');
  });
  it('keeps the entered details and supports retry when the profile request fails', async () => {
    component.firstName='A'; component.lastName='Walker'; component.email='player@example.test'; component.password='test-pass-42'; component.agree=true;
    auth.register.and.rejectWith({code:'auth/network-request-failed'});
    await component.createAccount();
    expect(component.submitting).toBeFalse(); expect(component.firstName).toBe('A'); expect(component.email).toBe('player@example.test'); expect(component.password).toBe('test-pass-42');
    expect((component as any).returnToGame).not.toHaveBeenCalled();
    auth.register.and.resolveTo({status:'recovered-unverified',profileRepaired:true});
    await component.createAccount(); expect((component as any).returnToGame).toHaveBeenCalled();
  });
  it('ignores duplicate submits while creation is in flight', async () => {
    component.firstName='A'; component.lastName='Walker'; component.email='player@example.test'; component.password='test-pass-42'; component.agree=true;
    let resolve: (value: any) => void = () => {};
    auth.register.and.returnValue(new Promise(r=>resolve=r));
    const first=component.createAccount(); await component.createAccount();
    expect(auth.register).toHaveBeenCalledTimes(1);
    resolve({status:'created',profileRepaired:true}); await first;
  });
});
