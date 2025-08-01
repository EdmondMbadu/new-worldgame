import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-school-signup',
  templateUrl: './school-signup.component.html',
})
export class SchoolSignupComponent {
  /* form fields */
  firstName = '';
  lastName = '';
  schoolName = '';
  email = '';
  password = '';
  rePassword = '';

  /* ui state */
  agreed = false;
  loading = false;
  success = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  /* map Firebase codes → friendly messages */
  private friendly(msg: string) {
    if (msg.includes('auth/email-already-in-use'))
      return 'That email is already registered.';
    if (msg.includes('auth/weak-password'))
      return 'Password should be at least 6 characters.';
    if (msg.includes('auth/invalid-email'))
      return 'Please enter a valid email address.';
    return 'Something went wrong. Please try again.';
  }
  async createSchoolAccount() {
    /* front-end guards */
    if (
      ![
        this.firstName,
        this.lastName,
        this.schoolName,
        this.email,
        this.password,
        this.rePassword,
      ].every(Boolean)
    ) {
      this.errorMsg = 'Please fill all fields.';
      return;
    }
    if (this.password !== this.rePassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }
    if (!this.agreed) {
      this.errorMsg = 'You must accept the terms.';
      return;
    }

    this.loading = true;
    this.success = false; // reset between attempts
    this.errorMsg = '';

    try {
      await this.auth.registerSchool(
        this.firstName,
        this.lastName,
        this.email,
        this.password,
        this.schoolName.trim()
      );
      this.success = true;
      setTimeout(() => this.router.navigate(['/login']), 4000);
    } catch (err: any) {
      console.error(err);
      this.errorMsg = this.friendly(err?.message || '');
    } finally {
      this.loading = false;
    }
  }
}
