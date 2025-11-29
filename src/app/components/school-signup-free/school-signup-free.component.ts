import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { combineLatest, of, switchMap, map } from 'rxjs';
import { PlanKey } from 'src/app/models/user';

@Component({
  selector: 'app-school-signup-free',
  templateUrl: './school-signup-free.component.html',
})
export class SchoolSignupFreeComponent implements OnInit {
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
  schoolType: string = 'Public';

  // new fields (captured for class/university)
  courseType = '';
  coursePurpose = '';
  specificFocus = ''; // NEW

  schoolWebsite = '';

  /* pricing selection */
  plan: PlanKey = 'free';
  amount = 0; // base price from plan (USD)
  currency = 'USD';
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
    private afAuth: AngularFireAuth
  ) {}

  ngOnInit(): void {
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
    return this.amount;
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
          extraTeams: 0,
          schoolCountry: this.schoolCountry,
          schoolType: this.schoolType,
          schoolWebsite: this.schoolWebsite,
          courseType: this.courseType || '',
          coursePurpose: this.coursePurpose || '',
          specificFocus: this.specificFocus || '', // NEW
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
