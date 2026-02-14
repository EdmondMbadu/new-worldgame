import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-email-feedback',
  templateUrl: './email-feedback.component.html',
  styleUrls: ['./email-feedback.component.css'],
})
export class EmailFeedbackComponent implements OnInit {
  isLoggedIn = false;
  loading = false;
  submitted = false;
  submitError: string | null = null;
  success = false;

  form = this.fb.group({
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.email]],
    howDoing: ['', [Validators.required]],
    solutionName: ['', [Validators.required, Validators.minLength(3)]],
    whatToAdd: ['', [Validators.required, Validators.minLength(10)]],
    whichSolution: ['', [Validators.required, Validators.minLength(5)]],
    emailFeedback: ['', [Validators.required, Validators.minLength(20)]],
  });

  constructor(
    public auth: AuthService,
    private data: DataService,
    private fb: FormBuilder
  ) {
    window.scroll(0, 0);
  }

  async ngOnInit(): Promise<void> {
    const user = await this.auth.getCurrentUserPromise();
    this.isLoggedIn = !!user;

    if (this.isLoggedIn && this.auth.currentUser) {
      this.form.patchValue({
        firstName: this.auth.currentUser.firstName || '',
        lastName: this.auth.currentUser.lastName || '',
        email: this.auth.currentUser.email || '',
      });
    }
  }

  async submit() {
    this.submitted = true;
    this.submitError = null;
    this.success = false;

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

    const howDoing = (v.howDoing || '').trim();
    const solutionName = (v.solutionName || '').trim();
    const whatToAdd = (v.whatToAdd || '').trim();
    const whichSolution = (v.whichSolution || '').trim();
    const emailFeedback = (v.emailFeedback || '').trim();

    const payload = {
      firstName: (v.firstName || this.auth.currentUser?.firstName || '').trim(),
      lastName: (v.lastName || this.auth.currentUser?.lastName || '').trim(),
      email: (v.email || this.auth.currentUser?.email || '').trim(),

      opinion: `How well are we doing: ${howDoing}\n\nFeedback:\n${emailFeedback}`,
      levels: ['Weekly NewWorld Game Intelligence Brief'],
      levelsDetails: {
        hsCourses: `Solution in email: ${solutionName}`,
        collegeCourses: `Requested solution/support: ${whichSolution}`,
        professionalAreas: '',
        otherText: 'Submitted from /email-feedback',
      },
      improvements: whatToAdd,
      askBuckyUseful: 'not_sure' as const,
      concerns: solutionName,
      otherAgents: '',
      prompts: '',
      courseUse: whichSolution,
      teamBuilding: '',
      more: emailFeedback,

      uid: this.auth.currentUser?.uid || null,
      createdAtMs: now,
      status: 'new' as const,

      feedbackType: 'weekly_email_feedback',
      howDoing,
      solutionName,
      whatToAdd,
      whichSolution,
      emailFeedback,
      sourcePath: '/email-feedback',
    };

    this.loading = true;
    try {
      await this.data.askFeedbackSubmit(payload);
      this.loading = false;
      this.success = true;
      this.submitted = false;

      if (this.isLoggedIn) {
        this.form.reset({
          firstName: this.auth.currentUser?.firstName || '',
          lastName: this.auth.currentUser?.lastName || '',
          email: this.auth.currentUser?.email || '',
          howDoing: '',
          solutionName: '',
          whatToAdd: '',
          whichSolution: '',
          emailFeedback: '',
        });
      } else {
        this.form.reset({
          firstName: '',
          lastName: '',
          email: '',
          howDoing: '',
          solutionName: '',
          whatToAdd: '',
          whichSolution: '',
          emailFeedback: '',
        });
      }

      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (err) {
      console.error('Error submitting email feedback', err);
      this.loading = false;
      this.submitError = 'submit_failed';
      this.success = false;
    }
  }
}
