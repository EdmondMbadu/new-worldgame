import { t } from '../../../../content/last-light-locale';
import { clearAuthReturn, captureAuthReturn, gameAuthReturn, navigateAuthReturn } from 'src/app/services/auth-return';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
    selector: 'app-verify-email',
    templateUrl: './verify-email.component.html',
    styleUrls: ['./verify-email.component.css'],
    standalone: false
})
export class VerifyEmailComponent implements OnInit {
  readonly tr = t;
  cancelGameReturn() { clearAuthReturn(); this.auth.setRedirectUrl(''); }
  gameReturnUrl = gameAuthReturn();
  redirectTarget = '/home';
  checking = false;
  errorMessage = '';
  recoveryNotice = '';
  resending = false;
  resendNotice = '';

  continuePlaying() {
    if (this.gameReturnUrl) navigateAuthReturn(this.router, this.gameReturnUrl);
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    window.scroll(0, 0);
    this.redirectTarget = captureAuthReturn() || '/home';
    const recoveryState = this.route.snapshot.queryParamMap.get('recovered');
    if (recoveryState === 'repaired') {
      this.recoveryNotice =
        'We found your existing account and restored its missing profile. Please verify your email to finish recovery.';
    } else if (recoveryState === 'existing') {
      this.recoveryNotice =
        'Your account and profile are already present. Please verify your email to finish setting up access.';
    }

    // Auto-check if already verified
    await this.checkVerificationAndRedirect();
  }

  /**
   * Check if email is verified and redirect if so.
   */
  async checkVerificationAndRedirect(): Promise<void> {
    this.checking = true;
    this.errorMessage = '';

    try {
      const isVerified = await this.auth.syncEmailVerified();
      if (isVerified) {
        // Email is verified, redirect to target
        navigateAuthReturn(this.router, this.redirectTarget);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      this.checking = false;
    }
  }

  /**
   * User clicks to confirm they've verified - check and redirect.
   */
  async onVerifiedClick(): Promise<void> {
    this.checking = true;
    this.errorMessage = '';

    try {
      const isVerified = await this.auth.syncEmailVerified();
      if (isVerified) {
        navigateAuthReturn(this.router, this.redirectTarget);
      } else {
        this.errorMessage =
          'Your email has not been verified yet. Please check your inbox and click the verification link.';
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      this.errorMessage = 'An error occurred. Please try again.';
    } finally {
      this.checking = false;
    }
  }

  /**
   * Resend the verification email.
   */
  async resendEmail(): Promise<void> {
    if (this.resending) return;
    this.resending = true;
    this.resendNotice = '';
    try {
      await this.auth.resendVerificationEmail();
      try { sessionStorage.removeItem('last-light.verification-notice'); } catch { /* Optional notice. */ }
      this.resendNotice = 'Verification email sent! Please check your inbox.';
    } catch (error) {
      this.resendNotice = 'Failed to resend email. Please try again.';
    } finally { this.resending = false; }
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { redirectTo: this.redirectTarget },
    });
  }
}
