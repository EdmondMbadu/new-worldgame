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
import { firstValueFrom, Observable, of } from 'rxjs';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFirestore } from '@angular/fire/compat/firestore';

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
  imageDownloadUrl: string = '';
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;
  addOnBlur = true;
  allowedMimeTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/webb',
  ];

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
  isHovering?: boolean;
  path: string = '';
  isLoading: boolean = false;
  imagePaths: string[] = [
    '../../../assets/img/nwg-start-solution.png',
    '../../../assets/img/nwg-working-title.png',
    '../../../assets/img/nwg-description.png',
    '',
    '../../../assets/img/nwg-email.png',
    '../../../assets/img/nwg-email.png',
    '',
    '../../../assets/img/nwg-submit.png',
  ];

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
    private fns: AngularFireFunctions,
    private storage: AngularFireStorage,
    private afs: AngularFirestore
  ) {
    this.auth.newUser = {}; // reinitialize the new user in case it happens.
    let shuffle = (array: User[]) => {
      return array.sort(() => Math.random() - 0.5);
    };
    // this.solution.newSolution.participantsHolder = [
    //   {
    //     name: this.auth.currentUser.email,
    //   },
    // ];
    let append = this.afs.createId().toString();
    this.path = `solutions/${append}`;
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
        this.solution.newSolution.evaluatorsHolder = this.evaluatorsEmails;
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
    try {
      if (this.buttonText === 'Continue') {
        current++;
        this.buttonInfoEvent.emit(current);
      } else if (this.buttonText === 'Submit') {
        // Set loading to true before starting async operations
        this.isLoading = true;

        // Await the creation of the new solution
        await this.solution.createdNewSolution(
          this.solution.newSolution.title!,
          this.solution.newSolution.solutionArea!,
          this.solution.newSolution.description!,
          this.solution.newSolution.image!,
          this.solution.newSolution.participantsHolder,
          this.solution.newSolution.evaluatorsHolder,
          this.solution.newSolution.sdgs!
        );

        // Indicate success
        this.createdSolutionSuccess = true;

        // Await the email sending process
        await this.sendEmailToParticipants();

        // Reset the solution and navigate
        this.resetNewSolution();
        this.router.navigate(['/dashboard/' + this.solution.solutionId]);
        // Set loading to false after successful operations
        this.isLoading = false;
        // Set loading to false in case of error
        this.isLoading = false;
      }
    } catch (error) {
      // Handle errors appropriately
      this.solutionError = of(error);
      this.createdSolutionError = true;
      console.error('An error occurred:', error);
    }
  }

  // chooseSDG(index: number) {
  //   // Check if the item is already selected
  //   if (this.sdgSelected[index] >= 0) {
  //     // Item is already selected, so unselect it
  //     this.sdgs[index].backgroundSelected = '';
  //     this.sdgSelected[index] = -1;
  //   } else {
  //     // Item is not selected, so select it
  //     this.sdgs[index].backgroundSelected =
  //       'bg-teal-100   dark:border-gray-100 dark:border-4';
  //     this.sdgSelected[index] = 1;
  //   }
  //   this.sdgInterest = this.getSelectedSDGStrings();
  //   // console.log('sdgs selected', this.sdgInterest);
  //   this.solution.newSolution.sdgs = this.sdgInterest;
  // }
  chooseSDG(index: number) {
    if (index === 0) {
      // If "None" is selected
      // Unselect all SDGs
      this.sdgs.forEach((sdg: any, i: any) => {
        sdg.backgroundSelected = '';
        this.sdgSelected[i] = -1;
      });

      // Toggle "None"
      if (this.sdgSelected[0] >= 0) {
        this.sdgs[0].backgroundSelected = '';
        this.sdgSelected[0] = -1;
      } else {
        this.sdgs[0].backgroundSelected =
          'bg-teal-100 dark:border-gray-100 dark:border-4';
        this.sdgSelected[0] = 1;
      }
    } else {
      // Unselect "None" if another SDG is selected
      this.sdgs[0].backgroundSelected = '';
      this.sdgSelected[0] = -1;

      // Toggle selection of the chosen SDG
      if (this.sdgSelected[index] >= 0) {
        this.sdgs[index].backgroundSelected = '';
        this.sdgSelected[index] = -1;
      } else {
        this.sdgs[index].backgroundSelected =
          'bg-teal-100 dark:border-gray-100 dark:border-4';
        this.sdgSelected[index] = 1;
      }
    }

    // Update selected SDGs array
    this.sdgInterest = this.getSelectedSDGStrings();

    // Ensure "None" is the only selection if chosen
    if (this.sdgSelected[0] === 1) {
      this.sdgInterest = ['None'];
    }

    // Store the selected SDGs in the solution object
    this.solution.newSolution.sdgs = this.sdgInterest;
  }

  delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  resetNewSolution() {
    this.solution.newSolution = {
      title: '',
      solutionArea: '',
      description: '',
      image: '',
      participantsHolder: [{ name: this.auth.currentUser.email }],
      evaluatorsHolder: this.evaluatorsEmails,
    };
  }
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.participantsEmails.push({ name: value });
    }
    this.solution.newSolution.participantsHolder!.push({ name: value });
    // console.log('new email list afer adding', this.participantsEmails);

    // Clear the input value
    event.chipInput!.clear();
  }
  addEvaluators(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      // this.evaluatorsEmails.push({ name: value });
      this.solution.newSolution.evaluatorsHolder?.push({ name: value });
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(email: Email): void {
    const index = this.solution.newSolution.participantsHolder!.indexOf(email);

    if (index >= 0) {
      this.solution.newSolution.participantsHolder!.splice(index, 1);

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
    this.solution.newSolution.sdgs = this.sdgInterest;
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

  // sendEmailToParticipants() {
  //   const genericEmail = this.fns.httpsCallable('genericEmail');

  //   this.solution.newSolution.participantsHolder!.forEach((participant) => {
  //     const emailData = {
  //       email: participant.name,
  //       subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
  //       title: this.solution.newSolution.title,
  //       description: this.solution.newSolution.description,
  //       author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
  //       image: this.solution.newSolution.image,
  //       path: `https://newworld-game.org/playground-steps/${this.solution.solutionId}`,
  //       // Include any other data required by your Cloud Function
  //     };

  //     genericEmail(emailData).subscribe(
  //       (result) => {
  //         console.log('Email sent:', result);
  //       },
  //       (error) => {
  //         console.error('Error sending email:', error);
  //       }
  //     );
  //   });
  // }
  // New method to send emails to participants
  async sendEmailToParticipants() {
    const genericEmail = this.fns.httpsCallable('genericEmail');
    const nonUserEmail = this.fns.httpsCallable('nonUserEmail'); // Ensure you have this Cloud Function set up

    const participants = this.solution.newSolution.participantsHolder || [];

    for (const participant of participants) {
      try {
        // Fetch the user data
        const users = await firstValueFrom(
          this.auth.getUserFromEmail(participant.name)
        );
        console.log('extracted user from email', users);
        console.log('the new solution data', this.solution.newSolution);

        if (users && users.length > 0) {
          // Participant is a registered user
          const emailData = {
            email: participant.name, // Ensure this is the correct field
            subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
            title: `${this.solution.newSolution.title}`,
            description: `${this.solution.newSolution.description}`,
            author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
            image: `${this.solution.newSolution.image}`,
            path: `https://newworld-game.org/dashboard/${this.solution.solutionId}`,
            user: `${users[0].firstName} ${users[0].lastName}`,
            // Add any other necessary fields
          };

          const result = await firstValueFrom(genericEmail(emailData));
          console.log(`Email sent to ${participant.name}:`, result);
        } else {
          // Participant is NOT a registered user
          // Participant is a registered user
          const emailData = {
            email: participant.name, // Ensure this is the correct field
            subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
            title: this.solution.newSolution.title,
            description: this.solution.newSolution.description,
            author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
            image: this.solution.newSolution.image,
            path: `https://newworld-game.org/dashboard/${this.solution.solutionId}`,
            // Add any other necessary fields
          };

          const result = await firstValueFrom(nonUserEmail(emailData));
          console.log(`Email sent to ${participant.name}:`, result);
        }
      } catch (error) {
        console.error(
          `Error processing participant ${participant.name}:`,
          error
        );
      }
    }
  }
  closePopUpSucess() {
    this.createdSolutionSuccess = false;
  }
  closePopUpError() {
    this.createdSolutionError = false;
  }
  async startUpload(event: FileList) {
    const file = event?.item(0);
    console.log(' current file data', file);

    if (file) {
      if (!this.allowedMimeTypes.includes(file.type)) {
        alert('unsupported file type. User png, jpeg, webp for file types');
        console.log('unsupported file type');

        return;
      }

      // Proceed with file processing
      console.log('File is supported:', file);
      // Your file handling logic here
      if (file?.size >= 10000000) {
        console.log('the file is too big');
        alert('The picture is too big. It should be less than 10MB');
        return;
      }
    }
    // the file should not be larger than 10MB

    // the main task
    console.log('the path', this.path);

    // this.task = await this.storage.upload(path, file);
    const uploadTask = await this.storage.upload(this.path, file);
    let url = await uploadTask.ref.getDownloadURL();
    this.imageDownloadUrl = url;
    uploadTask.totalBytes;
    // console.log('the download url', this.url);
    this.solution.newSolution.image = url;
    const avatar = {
      path: this.path,
      downloadURL: url,
      size: uploadTask.totalBytes.toString(),
    };
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }
}
