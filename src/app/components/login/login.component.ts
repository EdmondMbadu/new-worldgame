import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import {
  FormGroup,
  FormBuilder,
  Validators,
  FormControl,
} from '@angular/forms';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  myForm: FormGroup;
  loading: boolean = false;
  ngOnInit() {
    window.scroll(0, 0);
    this.auth.logingError = of(null);

    // If someone lands on /login?redirectTo=... (from a public page or bookmark),
    // capture it for AuthService and for refresh resilience.
    const qp = this.route.snapshot.queryParamMap.get('redirectTo');
    if (qp) {
      this.auth.setRedirectUrl(qp);
      sessionStorage.setItem('redirectTo', qp);
    } else {
      // If the guard already set session storage and user refreshed on /login
      const ss = sessionStorage.getItem('redirectTo');
      if (ss) this.auth.setRedirectUrl(ss);
    }
  }

  constructor(
    public auth: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.myForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  async SignIn() {
    if (this.myForm.invalid || this.loading) {
      this.myForm.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      await this.auth.SignIn(
        this.myForm.value.email,
        this.myForm.value.password
      );
    } catch (error) {
      console.error('Email sign-in failed', error);
    } finally {
      this.loading = false;
    }
  }

  async signInWithGoogle() {
    if (this.loading) return;
    this.loading = true;
    try {
      await this.auth.signInWithGoogle();
    } catch (error) {
      console.error('Google sign-in failed', error);
    } finally {
      this.loading = false;
    }
  }

  async signInWithFacebook() {
    if (this.loading) return;
    this.loading = true;
    try {
      await this.auth.signInWithFacebook();
    } catch (error) {
      console.error('Facebook sign-in failed', error);
    } finally {
      this.loading = false;
    }
  }

  async signInWithX() {
    if (this.loading) return;
    this.loading = true;
    try {
      await this.auth.signInWithTwitter();
    } catch (error) {
      console.error('X sign-in failed', error);
    } finally {
      this.loading = false;
    }
  }

  get email() {
    return this.myForm.get('email');
  }
  get password() {
    return this.myForm.get('password');
  }
}
