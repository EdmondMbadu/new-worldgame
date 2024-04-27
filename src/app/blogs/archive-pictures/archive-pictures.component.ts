import { Component, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from, map, mergeMap } from 'rxjs';

@Component({
  selector: 'app-archive-pictures',
  templateUrl: './archive-pictures.component.html',
  styleUrl: './archive-pictures.component.css',
})
export class ArchivePicturesComponent implements OnInit {
  async ngOnInit() {
    window.scroll(0, 0);
    this.getFilesList().subscribe((imageUrlPromises) => {
      Promise.all(imageUrlPromises).then(
        (imageUrls) => (this.imageList = imageUrls)
      );
    });
  }
  imageList?: string[] = [];
  constructor(private storage: AngularFireStorage) {}
  getFilesList() {
    const storageRef = this.storage.ref('archive-pictures-gsl'); // Use correct path reference
    return storageRef
      .listAll()
      .pipe(map((result) => result.items.map((ref) => ref.getDownloadURL())));
  }
}
