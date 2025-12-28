import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
  FormArray,
  FormBuilder,
  FormControl,
  Validators,
} from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';
import { TranslateService } from '@ngx-translate/core';

function atLeastOneChecked(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const fa = control as FormArray<FormControl<boolean>>;
    const hasOne =
      Array.isArray(fa?.controls) && fa.controls.some((c) => !!c.value);
    return hasOne ? null : { required: true };
  };
}

type AskBuckyUseful = 'yes' | 'somewhat' | 'no' | 'not_sure';

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

  showSuccessModal = false;

  // for focus management
  @ViewChild('successDialog') successDialog?: ElementRef<HTMLDivElement>;
  @ViewChild('successCloseBtn') successCloseBtn?: ElementRef<HTMLButtonElement>;

  // Updated levels
  levelOptions = [
    'High School',
    'College',
    'Professionals',
    'Business',
    'Other',
  ];

  form = this.fb.group({
    // identity
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],

    // A
    opinion: ['', [Validators.required, Validators.minLength(20)]],

    // B (non-nullable checkboxes created here)
    levels: this.fb.array(
      this.levelOptions.map(() => this.fb.nonNullable.control(false)),
      { validators: atLeastOneChecked() }
    ),

    levelsDetails: this.fb.group({
      hsCourses: [''],
      collegeCourses: [''],
      professionalAreas: [''],
      otherText: [''],
    }),

    // C
    improvements: ['', [Validators.required, Validators.minLength(5)]],

    // F (typed union)
    askBuckyUseful: this.fb.control<AskBuckyUseful | null>(null, {
      validators: Validators.required,
    }),

    // G, H, I, J, K, L
    concerns: ['', Validators.required],
    otherAgents: [''],
    prompts: [''],
    courseUse: ['', [Validators.required, Validators.minLength(10)]],
    teamBuilding: [''],
    more: ['', Validators.required],
  });
  constructor(
    public auth: AuthService,
    private data: DataService,
    private time: TimeService,
    private fb: FormBuilder,
    private translate: TranslateService
  ) {
    window.scroll(0, 0);
    // init levels FormArray
    // this.levelOptions.forEach(() => this.levelsFA.push(this.fb.control(false)));
  }

  getLevelLabel(option: string): string {
    const keyMap: { [key: string]: string } = {
      'High School': 'askFeedback.questionB.highSchool',
      'College': 'askFeedback.questionB.college',
      'Professionals': 'askFeedback.questionB.professionals',
      'Business': 'askFeedback.questionB.business',
      'Other': 'askFeedback.questionB.other'
    };
    const key = keyMap[option];
    return key ? this.translate.instant(key) : option;
  }

  get levelsFA(): FormArray<FormControl<boolean>> {
    return this.form.get('levels') as FormArray<FormControl<boolean>>;
  }

  isLevelSelected(label: string): boolean {
    const idx = this.levelOptions.indexOf(label);
    if (idx < 0) return false;
    return !!this.levelsFA.at(idx)?.value;
  }

  // ✅ Open / Close helpers
  openSuccessModal() {
    this.showSuccessModal = true;
    // move focus to the Close button after view updates
    setTimeout(() => this.successCloseBtn?.nativeElement.focus(), 0);
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  // ✅ Allow closing with Escape anywhere
  @HostListener('document:keydown.escape', ['$event'])
  onEsc(e: KeyboardEvent) {
    if (this.showSuccessModal) {
      e.preventDefault();
      this.closeSuccessModal();
    }
  }

  onModalKeydown(e: KeyboardEvent) {
    if (!this.showSuccessModal || e.key !== 'Tab') return;
    const root = this.successDialog?.nativeElement;
    if (!root) return;

    const focusables = root.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    document.body.style.overflow = ''; // restore scroll
  }

  private selectedLevels(): string[] {
    const selected: string[] = [];
    this.levelsFA.controls.forEach((ctrl, idx) => {
      if (ctrl.value) selected.push(this.levelOptions[idx]);
    });
    return selected;
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

    // If signed-out, also require identity fields
    if (!this.isLoggedIn) {
      this.form.controls['firstName'].addValidators([Validators.required]);
      this.form.controls['lastName'].addValidators([Validators.required]);
      this.form.controls['firstName'].updateValueAndValidity();
      this.form.controls['lastName'].updateValueAndValidity();
    }

    if (this.form.invalid) return;

    const v = this.form.value;
    // Narrow the value to the union (safe after Validators.required)
    const askBuckyUseful = (v.askBuckyUseful as AskBuckyUseful) ?? 'not_sure';
    const now = Date.now();

    const payload = {
      // identity
      firstName: (v.firstName || this.auth.currentUser?.firstName || '').trim(),
      lastName: (v.lastName || this.auth.currentUser?.lastName || '').trim(),
      email: (v.email || this.auth.currentUser?.email || '').trim(),

      // A–L answers
      opinion: (v.opinion || '').trim(),
      levels: this.selectedLevels(),
      levelsDetails: {
        hsCourses: (v.levelsDetails?.hsCourses || '').trim(),
        collegeCourses: (v.levelsDetails?.collegeCourses || '').trim(),
        professionalAreas: (v.levelsDetails?.professionalAreas || '').trim(),
        otherText: (v.levelsDetails?.otherText || '').trim(),
      },
      improvements: (v.improvements || '').trim(),
      askBuckyUseful, // 'yes' | 'somewhat' | 'no' | 'not_sure'
      concerns: (v.concerns || '').trim(),
      otherAgents: (v.otherAgents || '').trim(),
      prompts: (v.prompts || '').trim(),
      courseUse: (v.courseUse || '').trim(),
      teamBuilding: (v.teamBuilding || '').trim(),
      more: (v.more || '').trim(),

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

      // reset levels
      this.levelsFA.controls.forEach((c) => c.setValue(false));

      // keep identity if logged in
      const identity = this.isLoggedIn
        ? {
            firstName: this.auth.currentUser?.firstName || '',
            lastName: this.auth.currentUser?.lastName || '',
            email: this.auth.currentUser?.email || '',
          }
        : { firstName: '', lastName: '', email: '' };

      this.form.reset({
        ...identity,
        opinion: '',
        levelsDetails: {
          hsCourses: '',
          collegeCourses: '',
          professionalAreas: '',
          otherText: '',
        },
        improvements: '',
        askBuckyUseful: null,
        concerns: '',
        otherAgents: '',
        prompts: '',
        courseUse: '',
        teamBuilding: '',
        more: '',
      });

      this.form.markAsPristine();
      this.form.markAsUntouched();

      // If you implemented the success modal earlier, you can open it here:
      this.openSuccessModal();
    } catch (err) {
      console.error('Error submitting feedback', err);
      this.loading = false;
      this.submitError = 'submit_failed';
      this.success = false;
    }
  }

  get globalErrorList(): string[] {
    const list: string[] = [];
    const f = this.form.controls;

    // Identity (only when signed out)
    if (!this.isLoggedIn) {
      if (f.firstName.errors?.['required'])
        list.push('First name is required.');
      if (f.lastName.errors?.['required']) list.push('Last name is required.');
    }

    // Email
    if (f.email.errors?.['required']) list.push('Email is required.');
    else if (f.email.errors?.['email'])
      list.push('Email must be a valid address.');

    // A) Opinion
    if (f.opinion.errors?.['required']) list.push('A) Opinion is required.');
    else if (f.opinion.errors?.['minlength'])
      list.push('A) Opinion must be at least 20 characters.');

    // B) Levels
    if (this.levelsFA.errors?.['required'])
      list.push('B) Select at least one level.');

    // C) Improvements
    if (f.improvements.errors?.['required'])
      list.push('C) Improvements is required.');
    else if (f.improvements.errors?.['minlength'])
      list.push('C) Improvements must be at least 5 characters.');

    // F) Ask Bucky
    if (f.askBuckyUseful.errors?.['required'])
      list.push('F) Please select if “Ask Bucky” was useful.');

    // G) Concerns
    if (f.concerns.errors?.['required'])
      list.push('G) Problems/issues is required.');

    // J) Course usefulness
    if (f.courseUse.errors?.['required'])
      list.push('J) Course usefulness is required.');
    else if (f.courseUse.errors?.['minlength'])
      list.push('J) Course usefulness must be at least 10 characters.');

    // L) Anything else
    if (f.more.errors?.['required'])
      list.push('L) What else would you like to add? is required.');

    return list;
  }
}
