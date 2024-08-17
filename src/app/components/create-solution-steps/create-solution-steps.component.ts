import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { Email } from '../create-playground/create-playground.component';
import { MatChipEditedEvent, MatChipInputEvent } from '@angular/material/chips';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import { User } from 'src/app/models/user';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-create-solution-steps',

  templateUrl: './create-solution-steps.component.html',
  styleUrl: './create-solution-steps.component.css',
})
export class CreateSolutionStepsComponent implements OnInit {
  myForm: FormGroup;
  @Input() result: string = '';
  @Input() text: string = '';
  @Input() stepNumber: number = 0;
  @Input() focusSelectedArray: boolean[] = [];
  focusSelected: number = -1;
  participantsEmails: Email[] = [];
  evaluatorsEmails: Email[] = [];
  announcer = inject(LiveAnnouncer);
  solutionError: Observable<any> = of(null);
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;
  addOnBlur = true;

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
  agree: boolean = false;
  solverEvaluator: boolean = false;
  rePassword: string = '';

  createAccountSuccess: boolean = false;
  createAccountPopUp: boolean = false;
  createAccountError: boolean = false;
  numberOfEvaluators: number = 3;
  createdSolutionSuccess: boolean = false;
  createdSolutionError: boolean = false;
  @Output() buttonInfoEvent = new EventEmitter<number>();
  @Input() buttonText: string = '';
  submitDisplay: boolean = false;
  sdgs: any = [];
  constructor(
    private cdRef: ChangeDetectorRef,
    private router: Router,
    public data: DataService,
    public auth: AuthService,
    public solution: SolutionService,
    private fb: FormBuilder,
    private fns: AngularFireFunctions
  ) {
    let shuffle = (array: User[]) => {
      return array.sort(() => Math.random() - 0.5);
    };
    this.auth
      .getAllOtherUsers(this.auth.currentUser.email)
      .subscribe((data) => {
        data = shuffle(data);
        for (
          let i = 0;
          i < this.numberOfEvaluators &&
          this.evaluatorsEmails.length < this.numberOfEvaluators;
          i++
        ) {
          this.evaluatorsEmails.push({ name: data[i].email! });
        }
      });
    this.myForm = this.fb.group({
      emails: ['', Validators.compose([Validators.email])],

      evaluatorsEmails: [
        '',
        Validators.compose([Validators.email]),
        // this.isEvaluatorsValid(),
      ],
      description: ['', [Validators.required]],
      // sdg: ['', [Validators.required]],
      // date: ['', [Validators.required]],
    });
  }
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.sdgs = this.data.sdgs;
    this.participantsEmails.push({ name: this.auth.currentUser.email });
    this.typewriterEffect(this.text, () => {});
  }

  get emails() {
    return this.myForm.get('emails');
  }
  get evEmails() {
    return this.myForm.get('evaluatorsEmails');
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
    }, 5); // Adjust typing speed here
  }
  async updatePlayground(current: number) {
    if (this.buttonText === 'Continue') {
      current++;
      this.buttonInfoEvent.emit(current);
    } else {
      if (this.buttonText === 'Submit') {
        this.solution
          .createdNewSolution(
            this.solution.newSolution.title!,
            this.solution.newSolution.solutionArea!,
            this.solution.newSolution.description!,
            this.participantsEmails,
            this.evaluatorsEmails,
            // this.myForm.value.date,

            this.solution.newSolution.sdgs!
          )
          .then(() => {
            this.createdSolutionSuccess = true;
            this.sendEmailToParticipants(); // Call the function here
          })
          .then(() => {
            this.router.navigate([
              '/playground-steps/' + this.solution.solutionId,
            ]);
          })
          .catch((error) => {
            this.solutionError = of(error);
            this.createdSolutionError = true;
            console.log('error now');
          });
      }
    }
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
    console.log('sdgs selected', this.sdgInterest);
    this.solution.newSolution.sdgs = this.sdgInterest;
  }
  get hasSelectedSDG(): boolean {
    return this.sdgSelected.some((value) => value === 1);
  }

  getSelectedSDGStrings(): string[] {
    return this.sdgSelected
      .map((value, index) =>
        value === 1 ? this.data.getSdgLabel(`SDG${index + 1}`) : ''
      )
      .filter((sdg) => sdg !== '');
  }

  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.participantsEmails.push({ name: value });
    }

    // Clear the input value
    event.chipInput!.clear();
  }
  addEvaluators(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.evaluatorsEmails.push({ name: value });
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(email: Email): void {
    const index = this.participantsEmails.indexOf(email);

    if (index >= 0) {
      this.participantsEmails.splice(index, 1);

      this.announcer.announce(`Removed ${email}`);
    }
  }
  edit(email: Email, event: MatChipEditedEvent) {
    const value = event.value.trim();

    // Remove email if it no longer has a name
    if (!value) {
      this.remove(email);
      return;
    }

    // Edit existing f
    const index = this.participantsEmails.indexOf(email);
    if (index >= 0) {
      this.participantsEmails[index].name = value;
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
  editEvaluators(email: Email, event: MatChipEditedEvent) {
    const value = event.value.trim();

    // Remove email if it no longer has a name
    if (!value) {
      this.removeEvaluators(email);
      return;
    }

    // Edit existing f
    const index = this.evaluatorsEmails.indexOf(email);
    if (index >= 0) {
      this.evaluatorsEmails[index].name = value;
    }
  }
  removeEvaluators(email: Email): void {
    const index = this.evaluatorsEmails.indexOf(email);

    if (index >= 0) {
      this.evaluatorsEmails.splice(index, 1);

      this.announcer.announce(`Removed ${email}`);
    }
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

  sendEmailToParticipants() {
    const genericEmail = this.fns.httpsCallable('genericEmail');

    this.participantsEmails.forEach((participant) => {
      const emailData = {
        email: participant.name,
        subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
        title: this.solution.newSolution.title,
        description: this.solution.newSolution.description,
        path: `https://newworld-game.org/playground-steps/${this.solution.solutionId}`,
        // Include any other data required by your Cloud Function
      };

      genericEmail(emailData).subscribe(
        (result) => {
          console.log('Email sent:', result);
        },
        (error) => {
          console.error('Error sending email:', error);
        }
      );
    });
  }
  closePopUpSucess() {
    this.createdSolutionSuccess = false;
  }
  closePopUpError() {
    this.createdSolutionError = false;
  }
}
