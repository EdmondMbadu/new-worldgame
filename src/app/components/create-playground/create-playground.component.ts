import { Component } from '@angular/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';

@Component({
  selector: 'app-create-playground',
  templateUrl: './create-playground.component.html',
  styleUrls: ['./create-playground.component.css'],
})
export class CreatePlaygroundComponent {
  public Editor = ClassicEditor;
  public onReady(editor: any) {
    // console.log('CKEditor5 Angular Component is ready to use!', editor);
  }
  public onChange({ editor }: any) {
    // const data = editor.getData();
    // console.log(data);
  }
}
