import { Component, inject } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { AuthService } from 'src/app/services/auth.service';
import { COMMA, ENTER, SPACE } from '@angular/cdk/keycodes';
import {
  MatChipEditedEvent,
  MatChipInputEvent,
  MatChipsModule,
} from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { NgFor } from '@angular/common';
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
  createdSolutionSuccess: boolean = false;
  createdSolutionError: boolean = false;
  solutionError: Observable<any> = of(null);
  addOnBlur = true;
  readonly separatorKeysCodes = [ENTER, COMMA, SPACE] as const;
  currentEmails: Email[] = [];
  announcer = inject(LiveAnnouncer);
  constructor(
    public auth: AuthService,
    private fb: FormBuilder,
    private solution: SolutionService,
    private router: Router
  ) {
    this.myForm = this.fb.group({
      title: ['', [Validators.required]],
      emails: ['', Validators.compose([Validators.email])],
      description: ['', [Validators.required]],
      date: ['', [Validators.required]],
    });
  }

  get title() {
    return this.myForm.get('title');
  }
  get emails() {
    return this.myForm.get('emails');
  }

  get description() {
    return this.myForm.get('description');
  }
  get date() {
    return this.myForm.get('date');
  }

  public Editor = ClassicEditor;
  public onReady(editor: any) {}
  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our fruit
    if (value) {
      this.currentEmails.push({ name: value });
    }

    // Clear the input value
    event.chipInput!.clear();
  }

  remove(email: Email): void {
    const index = this.currentEmails.indexOf(email);

    if (index >= 0) {
      this.currentEmails.splice(index, 1);

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
    const index = this.currentEmails.indexOf(email);
    if (index >= 0) {
      this.currentEmails[index].name = value;
    }
  }

  launchPlayground() {
    this.loading = true;
    let solutionId = '';
    this.solution
      .createdNewSolution(
        this.myForm.value.title,
        this.myForm.value.description,
        this.currentEmails,
        this.myForm.value.date
      )
      .then(() => {
        this.createdSolutionSuccess = true;
        this.createSolutionForParticipants();

        // setTimeout(() => {
        //   this.createdSolutionSuccess = false;

        //   solutionId = this.solution.solutionId;

        //   this.createSolutionForParticipants();
        //   // this.router.navigate(['/playground-steps/' + this.solution.solutionId]);
        //   // do something after 1000 milliseconds
        // }, 2000);
      })
      .then(() => {
        this.router.navigate(['/playground-steps/' + this.solution.solutionId]);
      })
      .catch((error) => {
        this.solutionError = of(error);
        this.createdSolutionError = true;
        console.log('error now');
        // alert('Error launching solution ');
      });
  }

  createSolutionForParticipants() {
    let initiatorEmail = this.auth.currentUser.email;

    let myuser: User = {};
    for (let email of this.currentEmails) {
      this.auth.getUserFromEmail(email.name).subscribe((data) => {
        myuser = data[0];

        this.solution.createNewSolutionForParticipant(
          this.myForm.value.title,
          this.myForm.value.description,
          this.findEmailsToSend(initiatorEmail, myuser.email!),
          this.myForm.value.date,
          this.auth.currentUser.uid,
          this.solution.solutionId,
          myuser.uid!
        );
      });
    }
  }

  findEmailsToSend(initiatorEmail: string, authorEmail: string) {
    let emailsToSend: Email[] = [];

    for (let email of this.currentEmails) {
      if (email.name !== authorEmail) {
        emailsToSend.push(email);
      }
    }

    emailsToSend.push({ name: initiatorEmail });

    return emailsToSend;
  }
  closePopUpSucess() {
    this.createdSolutionSuccess = false;
  }
  closePopUpError() {
    this.createdSolutionError = false;
  }
}
