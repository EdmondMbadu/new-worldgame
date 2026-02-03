import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-verify-email',
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
})
export class VerifyEmailComponent implements OnInit {
  redirectTarget = '/home';
  checking = false;
  errorMessage = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    window.scroll(0, 0);
    const qp = this.route.snapshot.queryParamMap.get('redirectTo');
    if (qp && qp.startsWith('/')) {
      this.redirectTarget = qp;
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
        this.router.navigateByUrl(this.redirectTarget);
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
        this.router.navigateByUrl(this.redirectTarget);
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
    try {
      await this.auth.resendVerificationEmail();
      alert('Verification email sent! Please check your inbox.');
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend email. Please try again.');
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: { redirectTo: this.redirectTarget },
    });
  }
}
