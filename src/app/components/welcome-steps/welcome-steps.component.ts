import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { NewUser } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-welcome-steps',
  templateUrl: './welcome-steps.component.html',
  styleUrl: './welcome-steps.component.css',
})
export class WelcomeStepsComponent implements OnInit, OnDestroy {
  result: string = '';
  @Input() textKey: string = '';
  @Input() stepNumber: number = 0;
  @Input() focusSelectedArray: boolean[] = [];
  focusSelected: number = -1;

  registrationSuccess: boolean = true;
  registrationFailure: boolean = true;
  sdgSelectedArray: number[] = [];
  @Input() sdgSelected: number[] = [];
  sdgInterest: string[] = [];
  email: string = '';
  password: string = '';
  firstName: string = '';
  lastName: string = '';
  namesCompleted: boolean = false;
  agreeTerm: boolean = false;
  agreeEvaluator: boolean = false;
  agreeFun: boolean = false;
  agree: boolean = false;
  solverEvaluator: boolean = false;
  rePassword: string = '';
  imagePaths: string[] = [
    '../../../assets/img/nw-intro.png',
    '../../../assets/img/nwg-focus.png',
    '',
    '',
    '../../../assets/img/nwg-names.png',
    '../../../assets/img/nwg-email.png',
    '../../../assets/img/nwg-password.png',
    '../../../assets/img/nwg-terms-conditions.png',
  ];

  createAccountSuccess: boolean = false;
  createAccountPopUp: boolean = false;
  createAccountError: boolean = false;

  // Email verification state
  checkingVerification: boolean = false;
  verificationError: string = '';

  focus: Focus[] = [
    {
      textKey: 'welcomeFlow.focus.options.solutions',
      imagePath: '../../../assets/img/puzzle.png',
      backgroundSelected: '',
    },
    {
      textKey: 'welcomeFlow.focus.options.explore',
      imagePath: '../../../assets/img/global.png',
      backgroundSelected: '',
    },
    {
      textKey: 'welcomeFlow.focus.options.collaboration',
      imagePath: '../../../assets/img/collaborate.png',
      backgroundSelected: '',
    },
    {
      textKey: 'welcomeFlow.focus.options.implementation',
      imagePath: '../../../assets/img/implement.png',
      backgroundSelected: '',
    },
    {
      textKey: 'welcomeFlow.focus.options.other',
      imagePath: '../../../assets/img/eyes.png',
      backgroundSelected: '',
    },
  ];

  @Output() buttonInfoEvent = new EventEmitter<number>();
  @Input() buttonKey: 'continue' | 'done' = 'continue';
  submitDisplay: boolean = false;
  sdgs: any = [];
  private langSub?: Subscription;
  constructor(
    private cdRef: ChangeDetectorRef,
    private router: Router,
    public data: DataService,
    public auth: AuthService,
    private translate: TranslateService
  ) {}
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.sdgs = this.data.sdgs;
    this.initializeTypewriter();
    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.initializeTypewriter();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private initializeTypewriter(): void {
    this.result = '';
    if (!this.textKey) {
      return;
    }
    const translated = this.translate.instant(this.textKey);
    if (translated) {
      this.typewriterEffect(translated, () => {});
    }
  }

  typewriterEffect(text: string, callback: () => void) {
    let index = 0;

    const interval = setInterval(() => {
      this.result += text[index];
      index++;

      if (index === text.length) {
        clearInterval(interval);
        callback();
      }

      this.cdRef.detectChanges();
    }, 10); // Adjust typing speed here
  }
  async updatePlayground(current: number) {
    if (this.buttonKey === 'continue') {
      current++;
      this.buttonInfoEvent.emit(current);
    }
    if (current === 8 && this.buttonKey !== 'done') {
      let createAccount = await this.createAccount();
    } else {
      if (this.buttonKey === 'done') {
        // Check email verification before allowing to proceed
        await this.verifyEmailAndProceed();
      }
    }
  }

  /**
   * Check if the user has verified their email before allowing them to proceed.
   */
  async verifyEmailAndProceed() {
    this.checkingVerification = true;
    this.verificationError = '';

    try {
      const isVerified = await this.auth.syncEmailVerified();

      if (isVerified) {
        // Email is verified, proceed directly to home (user is already logged in)
        this.router.navigate(['/home']);
      } else {
        // Email not verified yet
        this.verificationError = this.translate.instant(
          'welcomeFlow.verification.notVerified'
        );
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      this.verificationError = this.translate.instant(
        'welcomeFlow.verification.error'
      );
    } finally {
      this.checkingVerification = false;
      this.cdRef.detectChanges();
    }
  }

  /**
   * Resend the verification email to the user.
   */
  async resendVerificationEmail() {
    try {
      await this.auth.resendVerificationEmail();
      alert(this.translate.instant('welcomeFlow.verification.emailResent'));
    } catch (error) {
      console.error('Error resending verification email:', error);
      alert(this.translate.instant('welcomeFlow.verification.resendError'));
    }
  }
  chooseFocus(index: number) {
    if (this.focusSelected >= 0) {
      this.focus[this.focusSelected].backgroundSelected = '';
      this.focusSelected = index;
      this.focus[index].backgroundSelected =
        'bg-teal-100    dark:border-gray-100 dark:border-4';
    } else {
      this.focusSelected = index;
      this.focus[index].backgroundSelected =
        'bg-teal-100 dark:border-gray-100 dark:border-4';
    }

    this.auth.newUser.goal = this.translate.instant(
      this.focus[index].textKey
    );

    this.focusSelectedArray[this.stepNumber] = true;
  }

  chooseSDG(index: number) {
    // Check if the item is already selected
    if (this.sdgSelected[index] >= 0) {
      // Item is already selected, so unselect it
      this.sdgs[index].backgroundSelected = '';
      this.sdgSelected[index] = -1;
    } else {
      // Item is not selected, so select it
      this.sdgs[index].backgroundSelected =
        'bg-teal-100   dark:border-gray-100 dark:border-4';
      this.sdgSelected[index] = 1;
    }
    this.sdgInterest = this.getSelectedSDGStrings();
    this.auth.newUser.sdgsSelected = this.sdgInterest;
  }
  get hasSelectedSDG(): boolean {
    return this.sdgSelected.some((value) => value === 1);
  }

  get continueActive(): boolean {
    return (
      this.focusSelectedArray[this.stepNumber] ||
      this.stepNumber < 1 ||
      this.hasSelectedSDG
    );
  }

  get continueInactive(): boolean {
    return (
      !this.focusSelectedArray[this.stepNumber] &&
      this.stepNumber >= 1 &&
      !this.hasSelectedSDG &&
      !this.namesCompleted
    );
  }
  getSelectedSDGStrings(): string[] {
    return this.sdgSelected
      .map((value, index) => (value === 1 ? `sdg${index + 1}` : ''))
      .filter((sdg) => sdg !== '');
    // return this.sdgSelected
    //   .map((value, index) =>
    //     value === 1 ? this.data.getSdgLabel(`SDG${index + 1}`) : ''
    //   )
    //   .filter((sdg) => sdg !== '');
  }

  get namesFieldEmpty() {
    return (
      this.auth.newUser.firstName === '' || this.auth.newUser.lastname === ''
    );
  }
  get emailEmptyOrInvalid() {
    return (
      this.auth.newUser.email === '' ||
      !this.data.isValidEmail(this.auth.newUser.email!)
    );
  }
  get passwordEmptyOrDifferent() {
    return (
      this.auth.newUser.password === '' ||
      this.rePassword === '' ||
      this.auth.newUser.password !== this.rePassword
    );
  }
  createAccount() {
    if (
      this.auth.newUser.email === '' ||
      this.auth.newUser.password === '' ||
      this.auth.newUser.firstName === '' ||
      this.auth.newUser.lastname === ''
    ) {
      alert(this.translate.instant('welcomeFlow.alerts.fillAllFields'));
      return;
    }
    console.log(
      'data to create an account ',
      this.auth.newUser.firstName,
      this.auth.newUser.lastname,
      this.auth.newUser.email,
      this.auth.newUser.password
    );
    this.auth.register(
      this.auth.newUser.firstName!,
      this.auth.newUser.lastname!,
      this.auth.newUser.email!,
      this.auth.newUser.password!,
      this.auth.newUser.goal!,
      this.auth.newUser.sdgsSelected!
    );
    this.resetFields();
  }
  onCheckboxChangeAgree(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.agree = true;
      console.log('Agree on terms and conditions is checked');
    } else {
      this.agree = false;
      console.log('Agree to be an evaluator is unchecked');
    }
  }
  onCheckboxChangeAgreeEvaluator(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.solverEvaluator = true;
      console.log('Agree to be an evaluator is checked');
    } else {
      this.solverEvaluator = false;
      console.log('Agree to be an evaluator is unchecked');
    }
  }
  onCheckboxChangeAgreeFun(event: Event) {
    // Access the checkbox via event.target, which is typed as EventTarget, so cast it
    const checkbox = event.target as HTMLInputElement;

    if (checkbox.checked) {
      this.agreeFun = true;
      console.log('Agree to have fun');
    } else {
      this.agreeFun = false;
      console.log('Agree to have fun is unchecked');
    }
  }

  selectAllSdgs() {
    const allSelected = this.sdgSelected.every((status) => status === 1);

    if (allSelected) {
      // Unselect all SDGs
      for (let i = 0; i < this.sdgs.length; i++) {
        this.sdgs[i].backgroundSelected = '';
        this.sdgSelected[i] = -1;
      }
    } else {
      // Select all SDGs
      for (let i = 0; i < this.sdgs.length; i++) {
        this.sdgs[i].backgroundSelected =
          'bg-teal-100 dark:border-gray-100 dark:border-4';
        this.sdgSelected[i] = 1;
      }
    }

    // Update the selected SDG strings
    this.sdgInterest = this.getSelectedSDGStrings();
    this.auth.newUser.sdgsSelected = this.sdgInterest;
  }

  resetFields() {
    this.email = '';
    this.password = '';
    this.rePassword = '';
    this.firstName = '';
    this.lastName = '';
  }

  closeAccountCreatedSuccess() {
    this.createAccountSuccess = false;
  }
  closeAccountCreatedError() {
    this.createAccountError = false;
  }
  closeRegistrationSuccess() {
    this.registrationSuccess = !this.registrationSuccess;
  }
  closeRegistrationFailure() {
    this.registrationFailure = false;
  }
}
interface Focus {
  textKey: string;
  imagePath?: string;
  backgroundSelected?: string;
}
