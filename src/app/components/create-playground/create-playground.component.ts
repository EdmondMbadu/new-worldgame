import { Component } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import { AuthService } from 'src/app/services/auth.service';
import { PlaygroundService } from 'src/app/services/playground.service';

@Component({
  selector: 'app-create-playground',
  templateUrl: './create-playground.component.html',
  styleUrls: ['./create-playground.component.css'],
})
export class CreatePlaygroundComponent {
  constructor(
    public auth: AuthService,
    private playground: PlaygroundService
  ) {}
  title: string = '';
  description: string = '';
  data: any;

  public Editor = ClassicEditor;
  public onReady(editor: any) {
    // console.log('CKEditor5 Angular Component is ready to use!', editor);
  }
  public onChange({ editor }: any) {
    this.data = editor.getData();
  }

  launchPlayground() {
    this.description = this.data;
    console.log('title', this.title);
    console.log('description', this.description);
  }
}
