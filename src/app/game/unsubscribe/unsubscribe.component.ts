import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-unsubscribe',
  templateUrl: './unsubscribe.component.html',
})
export class UnsubscribeComponent implements OnInit {
  isLoggedIn = false;

  form: FormGroup;
  submitting = false;
  checking = false;
  checked = false;
  alreadyUnsubscribed = false;
  success = false;
  errorMsg = '';

  constructor(
    public auth: AuthService,
    private fb: FormBuilder,
    private afs: AngularFirestore,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      reason: [''],
      details: [''],
    });
  }

  get emailControl(): AbstractControl {
    return this.form.get('email')!;
  }

  async ngOnInit() {
    // auth state
    this.auth.getCurrentUserPromise().then((u) => (this.isLoggedIn = !!u));

    // Prefill from query ?email= or ?u=base64(email)
    const qp = this.route.snapshot.queryParamMap;
    const emailParam = qp.get('email');
    const uParam = qp.get('u');

    let prefill = (emailParam || '').trim();
    if (!prefill && uParam) {
      try {
        prefill = atob(uParam).trim();
      } catch {}
    }
    if (prefill) {
      this.form.patchValue({ email: prefill });
      if (this.emailControl.valid) {
        await this.checkStatus(); // auto check
      }
    }
  }

  async onEmailBlur() {
    if (this.emailControl.valid) await this.checkStatus();
  }

  /** Check if already unsubscribed (doc exists) */
  async checkStatus() {
    this.checking = true;
    this.errorMsg = '';
    this.checked = false;
    this.alreadyUnsubscribed = false;

    try {
      const email = this.emailControl.value.toLowerCase();
      const snap = await this.afs
        .doc(`mailing_unsubscribes/${email}`)
        .get()
        .toPromise();
      this.alreadyUnsubscribed = !!snap?.exists;
      this.checked = true;
    } catch (e) {
      console.error('checkStatus', e);
      this.errorMsg = 'Could not check current status. Try again.';
    } finally {
      this.checking = false;
    }
  }

  /** Persist unsubscribe; if exists, we just confirm & optionally update reason */
  async onSubmit() {
    if (this.form.invalid) return;

    this.submitting = true;
    this.errorMsg = '';

    const email: string = this.form.value.email.toLowerCase().trim();
    const reason: string = (this.form.value.reason || '').toString().trim();
    const details: string = (this.form.value.details || '').toString().trim();

    try {
      const ref = this.afs.doc(`mailing_unsubscribes/${email}`);

      const snap = await ref.get().toPromise();
      const now = new Date();

      if (snap?.exists) {
        // Already unsubscribed: optionally update reason/details
        const updates: any = { updatedAt: now };
        if (reason) updates.reason = reason;
        if (details) updates.details = details;
        if (Object.keys(updates).length > 1) {
          await ref.update(updates).catch(() => {});
        }
        this.alreadyUnsubscribed = true;
        this.success = true;
        return;
      }

      // Create new record
      await ref.set({
        email,
        reason: reason || null,
        details: details || null,
        status: 'unsubscribed',
        createdAt: now,
        updatedAt: now,
        createdBy: this.auth?.currentUser?.uid || null,
        userAgent:
          typeof navigator !== 'undefined' ? navigator.userAgent : null,
        source: 'self-serve',
      });

      this.alreadyUnsubscribed = false;
      this.success = true;
    } catch (e: any) {
      console.error('unsubscribe', e);
      this.errorMsg = 'Unsubscribe failed. Please try again in a moment.';
    } finally {
      this.submitting = false;
    }
  }
}
