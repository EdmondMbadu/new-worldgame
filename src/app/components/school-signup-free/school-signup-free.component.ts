import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { combineLatest, of, switchMap, map, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PlanKey, User } from 'src/app/models/user';

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

  // Existing user detection
  existingUser: User | null = null;
  isExistingUser = false;
  checkingEmail = false;
  private emailCheck$ = new Subject<string>();

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
          this.blockedReason = `You already manage "${school.name}".`;
          // Optionally redirect:
          this.router.navigate(['/school-admin']);
        }
      });

    // Set up email checking with debounce
    this.emailCheck$
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe((email) => this.checkExistingUser(email));
  }

  onEmailChange(email: string): void {
    this.emailCheck$.next(email);
  }

  private async checkExistingUser(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      this.isExistingUser = false;
      this.existingUser = null;
      return;
    }

    this.checkingEmail = true;
    this.errorMsg = '';

    try {
      const user = await this.auth.getUserByEmail(email.toLowerCase().trim());
      if (user) {
        this.isExistingUser = true;
        this.existingUser = user;
        this.firstName = user.firstName || '';
        this.lastName = user.lastName || '';

        // Check if they already have a school
        if (user.schoolId) {
          const schoolSnap = await this.auth.schoolDoc$(user.schoolId).toPromise();
          if (schoolSnap?.ownerUid === user.uid) {
            this.blocked = true;
            this.blockedReason = `You already own a school account "${schoolSnap.name}". You can only create one school account.`;
          }
        }
      } else {
        this.isExistingUser = false;
        this.existingUser = null;
      }
    } catch (err) {
      console.error('Error checking user:', err);
    } finally {
      this.checkingEmail = false;
    }
  }

  get total(): number {
    return this.amount;
  }

  /* map Firebase codes → friendly messages */
  private friendly(msg: string) {
    if (msg.includes('auth/email-already-in-use'))
      return 'That email is already registered. If this is your account, we\'ll prefill your info automatically.';
    if (msg.includes('auth/weak-password'))
      return 'Password should be at least 6 characters.';
    if (msg.includes('auth/invalid-email'))
      return 'Please enter a valid email address.';
    if (msg.includes('already own a school'))
      return 'You already own a school account. You can only create one school account.';
    return 'Something went wrong. Please try again.';
  }
  isFormComplete(): boolean {
    // For existing users, password fields are not required
    if (this.isExistingUser) {
      const req = [this.firstName, this.lastName, this.schoolName, this.email].every(Boolean);
      return req && !!this.plan;
    }
    // For new users, all fields including password are required
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
    if (this.isExistingUser) {
      // Existing user flow - no password needed
      if (![this.firstName, this.lastName, this.schoolName, this.email].every(Boolean)) {
        this.errorMsg = 'Please fill all required fields.';
        return;
      }
    } else {
      // New user flow - password required
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
    }

    if (!this.agreed) {
      this.errorMsg = 'You must accept the terms.';
      return;
    }

    this.loading = true;
    this.success = false; // reset between attempts
    this.errorMsg = '';

    try {
      if (this.isExistingUser && this.existingUser?.uid) {
        // Upgrade existing user to school admin
        await this.auth.upgradeToSchoolAdmin(this.existingUser.uid, this.schoolName.trim(), {
          plan: this.plan!,
          currency: this.currency,
          extraTeams: 0,
          schoolCountry: this.schoolCountry,
          schoolType: this.schoolType,
          schoolWebsite: this.schoolWebsite,
          courseType: this.courseType || '',
          coursePurpose: this.coursePurpose || '',
          specificFocus: this.specificFocus || '',
        });

        this.success = true;
        // Redirect to login since they need to sign in
        this.auth.setRedirectUrl('/school-admin');
        this.router.navigate(['/login'], {
          queryParams: { redirectTo: '/school-admin', email: this.email },
        });
      } else {
        // Create new account
        await this.auth.registerSchool(
          this.firstName,
          this.lastName,
          this.email,
          this.password,
          this.schoolName.trim(),
          {
            plan: this.plan!,
            currency: this.currency,
            extraTeams: 0,
            schoolCountry: this.schoolCountry,
            schoolType: this.schoolType,
            schoolWebsite: this.schoolWebsite,
            courseType: this.courseType || '',
            coursePurpose: this.coursePurpose || '',
            specificFocus: this.specificFocus || '',
          }
        );

        this.success = true;
        this.auth.setRedirectUrl('/school-admin');
        await this.afAuth.signOut();
        this.router.navigate(['/verify-email'], {
          queryParams: { redirectTo: '/school-admin', email: this.email },
        });
      }
    } catch (err: any) {
      console.error(err);
      this.errorMsg = this.friendly(err?.message || '');
    } finally {
      this.loading = false;
    }
  }
}
