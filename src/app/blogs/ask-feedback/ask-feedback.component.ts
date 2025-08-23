import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  FormArray,
  FormControl,
} from '@angular/forms';

function atLeastOneChecked(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const fa = control as FormArray<FormControl<boolean>>;
    if (!fa?.controls?.length) return { required: true }; // or return null if you prefer
    const hasOne = fa.controls.some((c) => !!c.value);
    return hasOne ? null : { required: true };
  };
}
@Component({
  selector: 'app-ask-feedback',
  templateUrl: './ask-feedback.component.html',
  styleUrls: ['./ask-feedback.component.css'],
})
export class AskFeedbackComponent implements OnInit {
  isLoggedIn = false;
  loading = false;
  submitted = false;
  submitError: string | null = null;
  success = false;

  // B) Levels — includes the new "Business" option
  levelOptions = [
    'High school',
    'College/University',
    'Researchers',
    'Organizations/NGOs',
    'Business', // ← added as requested
  ];

  // Reactive form
  form = this.fb.group({
    // identity
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.email]],
    // questions
    opinion: ['', [Validators.required, Validators.minLength(20)]], // A
    levels: this.fb.array([] as FormControl[], atLeastOneChecked()), // B
    improvements: [''], // C
    prompts: [''], // D
    courseUse: ['', [Validators.required, Validators.minLength(10)]], // E
  });

  constructor(
    public auth: AuthService,
    private data: DataService,
    private time: TimeService,
    private fb: FormBuilder
  ) {
    window.scroll(0, 0);
    // init levels FormArray
    this.levelOptions.forEach(() => this.levelsFA.push(new FormControl(false)));
  }

  get levelsFA(): FormArray {
    return this.form.get('levels') as FormArray;
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

  private selectedLevels(): string[] {
    const selected: string[] = [];
    this.levelsFA.controls.forEach((ctrl, idx) => {
      if (ctrl.value) selected.push(this.levelOptions[idx]);
    });
    return selected;
  }

  async submit() {
    this.submitted = true;
    this.submitError = null;
    this.success = false;

    // Make identity required for signed-out users
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
      // A–E
      opinion: (v.opinion || '').trim(),
      levels: this.selectedLevels(),
      improvements: (v.improvements || '').trim(),
      prompts: (v.prompts || '').trim(),
      courseUse: (v.courseUse || '').trim(),
      // meta
      uid: this.auth.currentUser?.uid || null,
      createdAtMs: now,
      status: 'new' as const,
    };

    this.loading = true;
    try {
      await this.data.askFeedbackSubmit(payload);
      this.loading = false;
      this.success = true;
      this.submitted = false;

      // Reset fields but keep identity if logged in
      const identity = this.isLoggedIn
        ? {
            firstName: this.auth.currentUser?.firstName || '',
            lastName: this.auth.currentUser?.lastName || '',
            email: this.auth.currentUser?.email || '',
          }
        : { firstName: '', lastName: '', email: '' };

      // reset levels
      this.levelsFA.controls.forEach((c) => c.setValue(false));

      this.form.reset({
        ...identity,
        opinion: '',
        improvements: '',
        prompts: '',
        courseUse: '',
      });

      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (err) {
      console.error('Error submitting feedback', err);
      this.loading = false;
      this.submitError = 'submit_failed';
      this.success = false;
    }
  }
}
