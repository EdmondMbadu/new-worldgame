import { Component, ElementRef, Inject, Input, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { DataService } from 'src/app/services/data.service';
import { Presentation, Slide } from 'src/app/models/presentation';

@Component({
  selector: 'app-presentation-form',
  templateUrl: './presentation-form.component.html',
  styleUrls: ['./presentation-form.component.css'],
})
export class PresentationFormComponent {
  /** injected by dialog -> contains the parent solutionId */
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { solutionId: string },
    private dialogRef: MatDialogRef<PresentationFormComponent>,
    private afs: AngularFirestore,
    private db: DataService
  ) {}

  /** wizard state */
  name = '';
  description = '';
  slides: Slide[] = [];

  /** scratch for current slide */
  previewUrl: any = '';
  bulletText: any = '';
  // @ViewChild('uploader') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('picker', { static: false })
  fileInput!: ElementRef<HTMLInputElement>;

  async onFile(e: Event) {
    const fileList = (e.target as HTMLInputElement).files;
    if (!fileList || !fileList[0]) {
      return;
    }

    const file = fileList[0];
    const path = `slides/${Date.now()}_${file.name}`;

    /* ✂─── replace this line ───
  this.previewUrl = await this.db.startUpload([file] as any, path, 'false');
  ────────────────────────────*/

    // ✅ pass the original FileList to startUpload
    this.previewUrl = await this.db.startUpload(fileList, path, 'false');
  }

  addSlide() {
    if (!this.previewUrl) {
      alert('Choose an image');
      return;
    }

    this.slides.push({
      imageUrl: this.previewUrl,
      bullets: this.bulletText.split('\n').filter((l: any) => l.trim()),
    });

    /* ✅ reset safely */
    this.fileInput.nativeElement.value = '';
    this.previewUrl = '';
    this.bulletText = '';
  }

  removeSlide(i: number) {
    this.slides.splice(i, 1);
  }

  async save() {
    if (!this.slides.length || !this.name.trim()) {
      alert('Give the presentation a title and at least one slide.');
      return;
    }
    const id = this.afs.createId();
    const pres: Presentation = {
      id,
      solutionId: this.data.solutionId,
      name: this.name,
      description: this.description,
      dateCreated: Date.now(),
      slides: this.slides,
      thumbnail: this.slides[0].imageUrl,
    };
    await this.db.addPresentation(pres);
    this.dialogRef.close();
  }
}
