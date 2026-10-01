import { t, campaignHref } from '../../../../content/last-light-locale';
import { clearAuthReturn, captureAuthReturn, gameAuthReturn, navigateAuthReturn } from 'src/app/services/auth-return';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
    selector: 'app-signup',
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.css'],
    standalone: false
})
export class SignupComponent implements OnInit {
  readonly tr = t;
  cancelGameReturn() { clearAuthReturn(); this.auth.setRedirectUrl(''); }
  gameReturnUrl = gameAuthReturn();
  email: string = '';
  password: string = '';
  firstName: string = '';
  lastName: string = '';
  agree: boolean = false;
  solverEvaluator: boolean = false;
  rePassword: string = '';
  goal: string = '';
  createAccountSuccess: boolean = false;
  createAccountPopUp: boolean = false;
  createAccountError: boolean = false;
  submitting: boolean = false;
  accountErrorMessage: string = '';
  fieldErrors: Record<string, string> = {};
  showPassword = false;
  readonly contributionUrl = campaignHref();
  shareNotice = '';
  async inviteFriends() {
    const url = 'https://newworld-game.org/games/last-light/';
    try {
      if (navigator.share) await navigator.share({ title: 'Last Light', text: t('Help bring solar panels and batteries to health clinics. Play Last Light and invite your friends!'), url });
      else { await navigator.clipboard.writeText(url); this.shareNotice = 'Link copied. Send it to 10 friends!'; }
    } catch (error: any) {
      if (error?.name !== 'AbortError') this.shareNotice = 'Share this link: https://newworld-game.org/games/last-light/';
    }
  }

  // Bot protection fields
  honeypot: string = ''; // Hidden field - bots will fill this
  formLoadTime: number = 0; // Track when form loaded

  ngOnInit(): void {
    const destination = captureAuthReturn();
    if (destination) this.auth.setRedirectUrl(destination);
    window.scroll(0, 0);
    if (this.gameReturnUrl) this.goal = t('Play Last Light, save my progress, and join the player leaderboard.');
    this.formLoadTime = Date.now(); // Record form load time
  }
  constructor(private auth: AuthService, private router: Router) {}

  /**
   * Validates that a name looks like a real human name.
   * Detects gibberish patterns common in bot signups.
   */
  isValidName(name: string): boolean {
    const trimmed = name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Must be at least 2 characters
    if (trimmed.length < 2) return false;

    // Must not be too long (reasonable name limit)
    if (trimmed.length > 50) return false;

    // Check for excessive consecutive consonants (4+ is suspicious)
    const consecutiveConsonants = /[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{4,}/;
    if (consecutiveConsonants.test(trimmed)) return false;

    // Check for excessive uppercase letters (more than 3 uppercase in a row)
    const excessiveUppercase = /[A-Z]{4,}/;
    if (excessiveUppercase.test(trimmed)) return false;

    // Check for mixed case gibberish pattern (alternating case like "aBcDeF")
    const mixedCaseGibberish = /([a-z][A-Z]){3,}|([A-Z][a-z]){3,}[A-Z]/;
    if (mixedCaseGibberish.test(trimmed)) return false;

    // Must contain at least one vowel
    const hasVowel = /[aeiouAEIOU]/;
    if (!hasVowel.test(trimmed)) return false;

    // Check ratio of uppercase to total letters (names shouldn't be mostly uppercase)
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    const uppercaseCount = (letters.match(/[A-Z]/g) || []).length;
    if (letters.length > 3 && uppercaseCount / letters.length > 0.5) return false;

    return true;
  }

  /**
   * Checks if the form was filled too quickly (bot behavior).
   * Humans typically take at least 10 seconds to fill a signup form.
   */
  isFormFilledTooQuickly(): boolean {
    const timeSpent = Date.now() - this.formLoadTime;
    const minimumTimeMs = 5000; // 5 seconds minimum
    return timeSpent < minimumTimeMs;
  }

  async createAccount() {
    if (this.submitting) return;
    if (this.gameReturnUrl) { await this.createGameAccount(); return; }
    // Bot detection: honeypot field should be empty
    if (this.honeypot !== '') {
      console.log('Bot detected: honeypot filled');
      // Silently reject - don't alert bots to detection
      this.createAccountError = true;
      return;
    }

    // Bot detection: form filled too quickly
    if (this.isFormFilledTooQuickly()) {
      console.log('Bot detected: form filled too quickly');
      alert(t('Please take your time filling out the form.'));
      return;
    }

    if (
      this.email === '' ||
      this.password === '' ||
      this.firstName === '' ||
      this.lastName === '' ||
      this.rePassword === ''
    ) {
      alert(t('Fill all the fields'));
      return;
    }

    // Validate names aren't gibberish
    if (!this.isValidName(this.firstName)) {
      alert(t('Please enter a valid first name.'));
      return;
    }
    if (!this.isValidName(this.lastName)) {
      alert(t('Please enter a valid last name.'));
      return;
    }

    // Require goal/reason with minimum length
    if (this.goal.trim().length < 20) {
      alert(
        t('Please tell us why you want to join (at least 20 characters). This helps us understand our community better.')
      );
      return;
    }

    if (!this.agree || !this.solverEvaluator) {
      alert(t('You must check both checkbox conditions to proceed.'));
      return;
    } else if (this.password !== this.rePassword) {
      alert(t(' Both Passwords need to match'));
      return;
    }
    this.submitting = true;
    this.createAccountError = false;
    this.accountErrorMessage = '';
    try {
      const outcome = await this.auth.register(
        this.firstName,
        this.lastName,
        this.email,
        this.password,
        this.goal.trim(),
        []
      );
      this.resetFields();
      if (outcome.status === 'recovered-verified') {
        await this.router.navigate(['/login'], {
          queryParams: {
            redirectTo: captureAuthReturn(),
            accountRecovered: outcome.profileRepaired ? 'repaired' : 'verified',
          },
        });
      } else {
        await this.router.navigate(['/verify-email'], {
          queryParams: { redirectTo: captureAuthReturn(), ...(outcome.status === 'recovered-unverified' ? { recovered: outcome.profileRepaired ? 'repaired' : 'existing' } : {}) },
        });
      }
    } catch (error: any) {
      console.error('Account creation failed', error);
      this.accountErrorMessage = this.registrationErrorMessage(error);
      this.createAccountError = true;
    } finally {
      this.submitting = false;
    }
  }

  private async createGameAccount() {
    this.fieldErrors = {};
    this.createAccountError = false;
    this.accountErrorMessage = '';
    const validName = (value: string) => value.trim().length > 0 && value.trim().length <= 80 && /\p{L}/u.test(value) && !/[\u0000-\u001f\u007f]/.test(value);
    if (!validName(this.firstName)) this.fieldErrors['firstName'] = 'Enter your first name.';
    if (!validName(this.lastName)) this.fieldErrors['lastName'] = 'Enter your last name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) this.fieldErrors['email'] = 'Enter a valid email address.';
    if (this.password.length < 6) this.fieldErrors['password'] = 'Use at least 6 characters for your password.';
    if (!this.agree) this.fieldErrors['agree'] = 'Please agree to the terms and conditions.';
    if (Object.keys(this.fieldErrors).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('.game-signup [aria-invalid="true"]')?.focus());
      return;
    }
    if (this.honeypot) { this.accountErrorMessage = 'We could not finish creating your account. Please try again.'; this.createAccountError = true; return; }
    this.submitting = true;
    try {
      const outcome = await this.auth.register(this.firstName.trim(), this.lastName.trim(), this.email.trim(), this.password,
        'Play Last Light and save my journey.', [], { continueGame: true });
      try {
        if (outcome.verificationSent === false) sessionStorage.setItem('last-light.verification-notice', 'pending');
        else sessionStorage.removeItem('last-light.verification-notice');
      } catch { /* The in-game reminder remains available without storage. */ }
      this.password = '';
      this.returnToGame();
    } catch (error: any) {
      this.accountErrorMessage = this.registrationErrorMessage(error);
      this.createAccountError = true;
    } finally { this.submitting = false; }
  }
  private returnToGame() { navigateAuthReturn(this.router, this.gameReturnUrl!); }

  private registrationErrorMessage(error: any): string {
    switch (error?.code) {
      case 'auth/email-already-in-use':
        return 'An account already exists for this email. Sign in or reset your password.';
      case 'auth/existing-account-sign-in-required':
        return 'Your account already exists. Go to login with your existing password, reset it, or use the social sign-in method you originally chose.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Choose a stronger password with at least 6 characters.';
      case 'auth/network-request-failed':
        return 'We could not reach the server. Check your connection and try again.';
      case 'auth/game-profile-pending':
        return 'Your account was created, but its profile is still syncing. Check your connection and try again with the same details.';
      default:
        return 'We could not finish creating your account. Please try again.';
    }
  }
  onCheckboxChangeAgree(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.agree = true;
      console.log('Agree on terms and conditions is checked');
    } else {
      this.agree = false;
      console.log('Agree to be an evaluator is unchecked');
    }
  }
  onCheckboxChangeAgreeEvaluator(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.solverEvaluator = true;
      console.log('CAgree to be an evaluator is checked');
    } else {
      this.solverEvaluator = false;
      console.log('Agree to be an evaluator is unchecked');
    }
  }

  resetFields() {
    this.email = '';
    this.password = '';
    this.rePassword = '';
    this.firstName = '';
    this.lastName = '';
    this.goal = '';
    this.honeypot = '';
  }

  closeAccountCreatedSuccess() {
    this.createAccountSuccess = false;
  }
  closeAccountCreatedError() {
    this.createAccountError = false;
  }
}
