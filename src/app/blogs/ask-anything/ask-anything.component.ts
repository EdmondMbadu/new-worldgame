import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-ask-anything',
  templateUrl: './ask-anything.component.html',
  styleUrls: ['./ask-anything.component.css'],
})
export class AskAnythingComponent implements OnInit {
  isLoggedIn = false;
  loading = false;
  submitted = false;
  submitError: string | null = null;
  // at top of class
  success = false;

  // Reactive form
  form = this.fb.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.email]],
    question: ['', [Validators.required, Validators.minLength(10)]],
  });

  constructor(
    public auth: AuthService,
    private data: DataService,
    private time: TimeService,
    private fb: FormBuilder
  ) {
    window.scroll(0, 0);
  }

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUserPromise();
    this.isLoggedIn = !!user;

    // When logged in, we hide identity inputs in the UI.
    // We also pre-fill values so payload is complete.
    if (this.isLoggedIn && this.auth.currentUser) {
      this.form.patchValue({
        firstName: this.auth.currentUser.firstName || '',
        lastName: this.auth.currentUser.lastName || '',
        email: this.auth.currentUser.email || '',
      });
    }
  }
  async submit() {
    this.submitted = true; // gate validation messages
    this.submitError = null;
    this.success = false;

    // For signed-out users, ensure validators are active
    if (!this.isLoggedIn) {
      this.form.controls['firstName'].addValidators([Validators.required]);
      this.form.controls['lastName'].addValidators([Validators.required]);
      this.form.controls['email'].addValidators([
        Validators.required,
        Validators.email,
      ]);
      this.form.controls['firstName'].updateValueAndValidity();
      this.form.controls['lastName'].updateValueAndValidity();
      this.form.controls['email'].updateValueAndValidity();
    }

    if (this.form.invalid) return;

    const v = this.form.value;
    const now = Date.now();
    const payload = {
      firstName: (v.firstName || this.auth.currentUser?.firstName || '').trim(),
      lastName: (v.lastName || this.auth.currentUser?.lastName || '').trim(),
      email: (v.email || this.auth.currentUser?.email || '').trim(),
      question: (v.question || '').trim(),
      uid: this.auth.currentUser?.uid || null,
      // NEW: local fallback to show time immediately
      createdAtMs: now,
      status: 'new' as const,
    };

    this.loading = true;
    try {
      await this.data.askAnythingSubmit(payload);
      this.loading = false;

      // ✅ Show success and stop gating validation errors
      this.success = true;
      this.submitted = false;

      // Clear just the question, preserve identity fields
      if (this.isLoggedIn) {
        this.form.reset({
          firstName: this.auth.currentUser?.firstName || '',
          lastName: this.auth.currentUser?.lastName || '',
          email: this.auth.currentUser?.email || '',
          question: '',
        });
      } else {
        this.form.patchValue({ question: '' });
      }

      // Clean form state so no errors display
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (err) {
      console.error('Error submitting question', err);
      this.loading = false;
      this.submitError = 'submit_failed';
      this.success = false;
    }
  }
}
