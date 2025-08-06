// src/app/join-success/join-success.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom, interval, Subscription } from 'rxjs';

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

  private pollSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fns: AngularFireFunctions
  ) {}

  ngOnInit(): void {
    this.sessionId = this.route.snapshot.queryParamMap.get('session_id') || '';
    if (!this.sessionId) {
      this.errorMsg = 'Missing session ID.';
      this.loading = false;
      return;
    }

    // Quick check immediately, then poll for up to ~30s (Stripe→Webhook latency)
    this.checkOnce();
    this.pollSub = interval(2000).subscribe(async (i) => {
      if (this.paid && this.schoolId) {
        this.pollSub?.unsubscribe();
      } else if (i < 15) {
        // cap 15 attempts (~30s)
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

      if (this.paid) this.loading = false;
    } catch (err) {
      console.error(err);
      this.errorMsg = 'Could not verify payment status.';
      this.loading = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
