import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PlaygroundRoutingModule } from './playground-routing.module';
import { SharedModule } from '../shared/shared.module';
import { MaterialModule } from '../shared/material.module';

import { CreatePlaygroundComponent } from '../components/create-playground/create-playground.component';
import { SliderComponent } from '../components/slider/slider.component';
import { CreateSolutionComponent } from '../components/create-solution/create-solution.component';
import { CreateSolutionStepsComponent } from '../components/create-solution-steps/create-solution-steps.component';
import { CkeditorComponent } from '../components/ckeditor/ckeditor.component';

import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { EditorModule } from '@tinymce/tinymce-angular';

@NgModule({
  declarations: [
    CreatePlaygroundComponent,
    SliderComponent,
    CreateSolutionComponent,
    CreateSolutionStepsComponent,
    CkeditorComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    MaterialModule,
    CKEditorModule,
    EditorModule,
    PlaygroundRoutingModule,
  ],
})
export class PlaygroundModule {}
