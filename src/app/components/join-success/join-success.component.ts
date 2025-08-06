// src/app/join-success/join-success.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom, interval, Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-join-success',
  templateUrl: './join-success.component.html',
  styleUrl: './join-success.component.css',
})
export class JoinSuccessComponent implements OnInit, OnDestroy {
  sessionId = '';
  loading = true;
  errorMsg = '';
  paid = false;
  schoolId: string | null = null;
  amountPaid: number | null = null;
  currency = 'usd';
  canceled = false; // <-- NEW

  private pollSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fns: AngularFireFunctions,
    private auth: AuthService,
    private afAuth: AngularFireAuth
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    this.canceled = qp.has('canceled') || qp.has('cancelled'); // support both spellings

    if (this.canceled) {
      // User backed out of Stripe → just show “Checkout canceled” UI.
      this.loading = false;
      return;
    }

    this.sessionId = qp.get('session_id') || '';
    if (!this.sessionId) {
      this.errorMsg = 'Missing session ID.';
      this.loading = false;
      return;
    }

    this.checkOnce();
    this.pollSub = interval(2000).subscribe(async (i) => {
      if (this.paid && this.schoolId) {
        this.pollSub?.unsubscribe();
      } else if (i < 15) {
        await this.checkOnce();
      } else {
        this.errorMsg = 'Still processing payment. Please refresh in a moment.';
        this.loading = false;
        this.pollSub?.unsubscribe();
      }
    });
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }

  async checkOnce() {
    try {
      const callable = this.fns.httpsCallable('getCheckoutStatus');
      const res: any = await firstValueFrom(
        callable({ sessionId: this.sessionId })
      );
      if (!res?.exists) return; // not written yet
      this.paid = !!res.paid;
      this.schoolId = res.schoolId ?? null;
      this.amountPaid = res.amountPaid ? Number(res.amountPaid) / 100 : null;
      this.currency = res.currency || 'usd';

      // after you set this.paid and this.schoolId in checkOnce()
      if (this.paid && this.schoolId) {
        this.loading = false;

        //   const u = await this.afAuth.currentUser;
        //   if (u) {
        //     // they already have an auth session → go straight to dashboard
        //     this.router.navigate(['/school-admin']);
        //   }
      }
    } catch (err) {
      console.error(err);
      this.errorMsg = 'Could not verify payment status.';
      this.loading = false;
    }
  }

  goToLogin() {
    // assuming AuthService has setRedirectUrl()
    this.auth.setRedirectUrl('/school-admin');
    this.router.navigate(['/login']);
  }
}
