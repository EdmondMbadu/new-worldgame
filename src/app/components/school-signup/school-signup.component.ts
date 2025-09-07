import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { combineLatest, of, switchMap, map } from 'rxjs';
import { isPlanKey, PlanKey, PRICE_BOOK } from 'src/app/models/user';

@Component({
  selector: 'app-school-signup',
  templateUrl: './school-signup.component.html',
})
export class SchoolSignupComponent implements OnInit {
  /* form fields */
  firstName = '';
  lastName = '';
  schoolName = '';
  email = '';
  password = '';
  rePassword = '';

  // extra school info (useful for billing/ops)
  schoolCountry = '';
  // add 'University' to the union
  schoolType: 'Public' | 'Private' | 'IB' | 'University' | 'Other' = 'Public';

  // new fields (captured for class/university)
  courseType = '';
  coursePurpose = '';

  schoolWebsite = '';

  /* pricing selection */
  plan: PlanKey | null = null;
  amount = 0; // base price from plan (USD)
  currency = 'USD';
  extraTeams = 0; // $30 each (tournament add-on)
  /* ui state */
  agreed = false;
  loading = false;
  success = false;
  errorMsg = '';

  blocked = false; // if true, show a message instead of the form
  blockedReason = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private fns: AngularFireFunctions,
    private afAuth: AngularFireAuth
  ) {}

  ngOnInit(): void {
    // 1) read query params
    this.route.queryParamMap.subscribe((q) => {
      const planParam = q.get('plan'); // string | null
      const ccy = q.get('currency') || 'USD';

      if (isPlanKey(planParam)) {
        this.plan = planParam;
        this.amount = PRICE_BOOK[planParam];
      } else {
        this.plan = null;
        this.amount = 0;
      }
      this.currency = ccy;

      localStorage.setItem(
        'nwg.planSelection',
        JSON.stringify({ plan: this.plan, currency: this.currency })
      );
    });

    // fallback from localStorage if no query params
    if (!this.plan) {
      if (this.plan === 'class') {
        this.schoolType = 'University';
      }

      const raw = localStorage.getItem('nwg.planSelection');
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<{
            plan: PlanKey;
            currency: string;
          }>;
          if (isPlanKey(saved.plan)) {
            this.plan = saved.plan;
            this.amount = PRICE_BOOK[saved.plan];
            this.currency = saved.currency || 'USD';
          }
        } catch {}
      }
    }

    // If logged in, check if they already own a paid school
    this.afAuth.authState
      .pipe(
        switchMap((u) => {
          if (!u) return of(null);
          return this.auth.userDoc$(u.uid).pipe(
            switchMap((userDoc) => {
              if (!userDoc?.schoolId) return of({ userDoc, school: null });
              return combineLatest([
                of(userDoc),
                this.auth.schoolDoc$(userDoc.schoolId),
              ]).pipe(map(([userDoc, school]) => ({ userDoc, school })));
            })
          );
        })
      )
      .subscribe((res) => {
        if (!res) return;
        const { userDoc, school } = res;
        if (
          school?.billing?.paymentStatus === 'paid' &&
          school?.ownerUid === userDoc?.uid
        ) {
          this.blocked = true;
          this.blockedReason = `You already manage “${school.name}”.`;
          // Optionally redirect:
          this.router.navigate(['/dashboard']);
        }
      });
  }

  get total(): number {
    const addOns = this.extraTeams * 30; // $30 each
    return this.amount + addOns;
  }

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
  isFormComplete(): boolean {
    const req = [
      this.firstName,
      this.lastName,
      this.schoolName,
      this.email,
      this.password,
      this.rePassword,
    ].every(Boolean);
    return req && this.password === this.rePassword && !!this.plan;
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
        this.schoolName.trim(),
        {
          plan: this.plan!, // safe: you already guard elsewhere
          currency: this.currency,
          extraTeams: this.extraTeams,
          schoolCountry: this.schoolCountry,
          schoolType: this.schoolType,
          schoolWebsite: this.schoolWebsite,
          courseType: this.courseType || '',
          coursePurpose: this.coursePurpose || '',
        }
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

  async beginCheckout() {
    if (!this.isFormComplete() || !this.agreed || !this.plan) {
      this.errorMsg = 'Please complete all required fields and accept terms.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';

    try {
      // 1) Use current auth session if present (Auth, not Firestore)
      let uid = await this.auth.getUid();

      if (!uid) {
        // 2) Decide whether to create or sign in based on whether the email exists
        const methods = await this.auth.fetchSignInMethods(this.email);

        if (methods && methods.length) {
          // Account exists → sign in silently with provided password
          try {
            uid = await this.auth.signInForCheckout(this.email, this.password);
          } catch {
            this.errorMsg =
              'This email is already registered. Enter your existing password or reset it.';
            this.loading = false;
            return;
          }
        } else {
          // New account → create and send verification email
          uid = await this.auth.createAuthUserOnly(
            this.firstName,
            this.lastName,
            this.email,
            this.password
          );
        }
      }

      // 3) Create Stripe Checkout session
      const callable = this.fns.httpsCallable('createNwgSchoolCheckoutSession');
      const payload = {
        uid,
        plan: this.plan,
        currency: (this.currency || 'USD').toLowerCase(), // <— quick test
        extraTeams: Math.max(0, Math.floor(this.extraTeams || 0)),
        schoolName: this.schoolName.trim(),
        schoolCountry: this.schoolCountry || '',
        schoolType: this.schoolType || '',
        schoolWebsite: this.schoolWebsite || '',

        courseType: this.courseType || '',
        coursePurpose: this.coursePurpose || '',
      };
      const { url } = await firstValueFrom(callable(payload));
      window.location.href = url;
    } catch (err) {
      console.error(err);
      this.errorMsg = 'Unable to start checkout. Please try again.';
      this.loading = false;
    }
  }
}
