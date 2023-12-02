import { Component, inject } from '@angular/core';
// import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import * as Editor from 'ckeditor5-custom-build/build/ckeditor';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { AuthService } from 'src/app/services/auth.service';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import {
  MatChipEditedEvent,
  MatChipInputEvent,
  MatChipsModule,
} from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgFor, NgPlural } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SolutionService } from 'src/app/services/solution.service';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { User } from 'src/app/models/user';

export interface Email {
  name: string;
  ready?: string;
  evaluated?: string;
}
@Component({
  selector: 'app-create-playground',
  templateUrl: './create-playground.component.html',
  styleUrls: ['./create-playground.component.css'],
})
export class CreatePlaygroundComponent {
  myForm: FormGroup;
  loading: boolean = false;
  numberOfEvaluators: number = 2;
  createdSolutionSuccess: boolean = false;
  createdSolutionError: boolean = false;
  solutionError: Observable<any> = of(null);
  addOnBlur = true;
  sdgs: string[] = [
    'SDG1   No Poverty',
    'SDG2   Zero Hunger',
    'SDG3   Good Health And Well Being',
    'SDG4   Quality Education',
    'SDG5   Gender Equality',
    'SDG6   Clean Water And Sanitation',
    'SDG7   Affordable And Clean Energy',
    'SDG8   Decent Work And Economic Growth',
    'SDG9   Industry Innovation And Infrastructure',
    'SDG10  Reduced Inequalities',
    'SDG11  Sustainable Cities And Communities',
    'SDG12  Responsible Consumption And Production',
    'SDG13  Climate Action',
    'SDG14  Life Below Water',
    'SDG15  Life And Land',
    'SDG16  Peace, Justice And Strong Institutions',
    'SDG17  Partnership For ThE Goals',
  ];
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;
  participantsEmails: Email[] = [];
  evaluatorsEmails: Email[] = [];

  announcer = inject(LiveAnnouncer);
  constructor(
    public auth: AuthService,
    private fb: FormBuilder,
    private solution: SolutionService,
    private router: Router
  ) {
    let shuffle = (array: User[]) => {
      return array.sort(() => Math.random() - 0.5);
    };
    this.myForm = this.fb.group({
      title: ['', [Validators.required]],
      emails: ['', Validators.compose([Validators.email])],
      evaluatorsEmails: [
        '',
        Validators.compose([Validators.email]),
        this.isEvaluatorsValid(),
      ],
      description: ['', [Validators.required]],
      sdg: ['', [Validators.required]],
      date: ['', [Validators.required]],
    });
    this.evaluatorsEmails = [];
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
    this.participantsEmails.push({ name: this.auth.currentUser.email });
  }

  get title() {
    return this.myForm.get('title');
  }
  get emails() {
    return this.myForm.get('emails');
  }
  get evEmails() {
    return this.myForm.get('evaluatorsEmails');
  }

  get description() {
    return this.myForm.get('description');
  }
  get date() {
    return this.myForm.get('date');
  }
  get sdg() {
    return this.myForm.get('sdg');
  }

  public Editor: any = Editor;
  public onReady(editor: any) {}
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

  removeEvaluators(email: Email): void {
    const index = this.evaluatorsEmails.indexOf(email);

    if (index >= 0) {
      this.evaluatorsEmails.splice(index, 1);

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

  isEvaluatorsValid() {
    return this.evaluatorsEmails.some((evaluator) =>
      this.participantsEmails.some(
        (participant) => participant.name === evaluator.name
      )
    );
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
  launchPlayground() {
    this.loading = true;
    let solutionId = '';
    // console.log(
    //   'here are the values',
    //   this.myForm.value.title,
    //   this.myForm.value.description,
    //   this.participantsEmails,
    //   this.evaluatorsEmails,
    //   this.myForm.value.date,
    //   this.myForm.value.sdg
    // );
    this.solution
      .createdNewSolution(
        this.myForm.value.title,
        this.myForm.value.description,
        this.participantsEmails,
        this.evaluatorsEmails,
        this.myForm.value.date,
        this.myForm.value.sdg
      )
      .then(() => {
        this.createdSolutionSuccess = true;
      })
      .then(() => {
        this.router.navigate(['/playground-steps/' + this.solution.solutionId]);
      })
      .catch((error) => {
        this.solutionError = of(error);
        this.createdSolutionError = true;
        console.log('error now');
      });
  }

  closePopUpSucess() {
    this.createdSolutionSuccess = false;
  }
  closePopUpError() {
    this.createdSolutionError = false;
  }
}
