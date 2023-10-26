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

export interface Email {
  name: string;
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
  public onReady(editor: any) {
    // console.log('CKEditor5 Angular Component is ready to use!', editor);
  }
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
    console.log(
      'displaying results : ',
      this.myForm.value.title,
      this.myForm.value.description,
      this.currentEmails,
      this.myForm.value.date
    );
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

        setTimeout(() => {
          this.createdSolutionSuccess = false;

          solutionId = this.solution.solutionId;

          this.router.navigate(['/playground-steps/' + solutionId]);
          // do something after 1000 milliseconds
        }, 2000);
      })
      .catch((error) => {
        this.solutionError = of(error);
        this.createdSolutionError = true;
        console.log('error now');
        // alert('Error launching solution ');
      });
  }
  closePopUpSucess() {
    this.createdSolutionSuccess = false;
  }
  closePopUpError() {
    this.createdSolutionError = false;
  }
}
