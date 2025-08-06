import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

type PlanKey = 'free' | 'license' | 'tournament' | 'pro';

function isPlanKey(v: unknown): v is PlanKey {
  return v === 'free' || v === 'license' || v === 'tournament' || v === 'pro';
}

const PRICE_BOOK: Record<PlanKey, number> = {
  free: 0,
  license: 99,
  tournament: 199,
  pro: 249,
};

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
  schoolType: 'Public' | 'Private' | 'IB' | 'Other' = 'Public';
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

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
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
}
