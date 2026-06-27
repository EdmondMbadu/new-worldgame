import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  FormBuilder,
  Validators,
} from '@angular/forms';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

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

  resourceOptions = [
    {
      value: 'Solutions Library',
      labelKey: 'askFeedback.questionG.resources.solutionsLibrary',
    },
    {
      value: 'Global Statistical Data and Analysis Tools',
      labelKey: 'askFeedback.questionG.resources.globalStatisticalTools',
    },
    {
      value: 'Sample Preferred States',
      labelKey: 'askFeedback.questionG.resources.samplePreferredStates',
    },
    {
      value: 'State of the World Reports',
      labelKey: 'askFeedback.questionG.resources.stateOfWorldReports',
    },
    {
      value: 'Steps I to IV AI Introductions',
      labelKey: 'askFeedback.questionG.resources.stepsAiIntroductions',
    },
    {
      value: 'Ask Bucky Prompts for Implementation',
      labelKey: 'askFeedback.questionG.resources.askBuckyPrompts',
    },
    {
      value: 'Tools for Changing the World book',
      labelKey: 'askFeedback.questionG.resources.toolsBook',
    },
  ];

  form = this.fb.group({
    // identity
    firstName: [''],
    lastName: [''],
    email: ['', [Validators.required, Validators.email]],

    // A
    opinion: ['', [Validators.required, Validators.minLength(20)]],

    // C
    improvements: ['', [Validators.required, Validators.minLength(5)]],

    // F (typed union)
    askBuckyUseful: this.fb.control<AskBuckyUseful | null>(null, {
      validators: Validators.required,
    }),

    // G, H, I, K, L
    concerns: ['', Validators.required],
    resourcesUsed: this.fb.array(
      this.resourceOptions.map(() => this.fb.nonNullable.control(false))
    ),
    resourcesOther: [''],
    videoChatUse: [''],
    avatarUse: [''],
    prompts: [''],
    teamBuilding: [''],
    enoughTime: [''],
    additionalCapabilities: [''],
    more: ['', Validators.required],
  });
  constructor(
    public auth: AuthService,
    private data: DataService,
    private fb: FormBuilder
  ) {
    window.scroll(0, 0);
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

  private selectedResources(): string[] {
    const selected: string[] = [];
    this.form.controls.resourcesUsed.controls.forEach((ctrl, idx) => {
      if (ctrl.value) selected.push(this.resourceOptions[idx].value);
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
      improvements: (v.improvements || '').trim(),
      askBuckyUseful, // 'yes' | 'somewhat' | 'no' | 'not_sure'
      concerns: (v.concerns || '').trim(),
      resourcesUsed: this.selectedResources(),
      resourcesOther: (v.resourcesOther || '').trim(),
      videoChatUse: (v.videoChatUse || '').trim(),
      avatarUse: (v.avatarUse || '').trim(),
      prompts: (v.prompts || '').trim(),
      teamBuilding: (v.teamBuilding || '').trim(),
      enoughTime: (v.enoughTime || '').trim(),
      additionalCapabilities: (v.additionalCapabilities || '').trim(),
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

      this.form.controls.resourcesUsed.controls.forEach((c) => c.setValue(false));

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
        improvements: '',
        askBuckyUseful: null,
        concerns: '',
        resourcesOther: '',
        videoChatUse: '',
        avatarUse: '',
        prompts: '',
        teamBuilding: '',
        enoughTime: '',
        additionalCapabilities: '',
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

    // B) Improvements
    if (f.improvements.errors?.['required'])
      list.push('B) Improvements is required.');
    else if (f.improvements.errors?.['minlength'])
      list.push('B) Improvements must be at least 5 characters.');

    // C) Ask Bucky
    if (f.askBuckyUseful.errors?.['required'])
      list.push('C) Please select if “Ask Bucky” was useful.');

    // D) Concerns
    if (f.concerns.errors?.['required'])
      list.push('D) Problems/issues is required.');

    // H) Anything else
    if (f.more.errors?.['required'])
      list.push('H) What else would you like to add? is required.');

    return list;
  }
}
