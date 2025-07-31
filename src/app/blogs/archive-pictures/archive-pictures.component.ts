import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from, map, mergeMap } from 'rxjs';

@Component({
  selector: 'app-archive-pictures',
  templateUrl: './archive-pictures.component.html',
  styleUrl: './archive-pictures.component.css',
})
export class ArchivePicturesComponent implements OnInit, OnDestroy {
  /** These are the real images retrieved from Firebase **/
  imageList: string[] = [];

  /**
   * This is the array used for the infinite loop.
   * We will prepend the last image and append the first image.
   */
  slides: string[] = [];

  /** We start the carousel at index 1, so the first *real* image is visible. */
  currentIndex = 1;

  /** Controls the CSS transitions (we temporarily disable them when snapping). */
  transitioning = true;

  /** Interval reference for auto-play. */
  autoPlayInterval: any;

  constructor(private storage: AngularFireStorage) {}

  ngOnInit(): void {
    window.scroll(0, 0);

    // Get the real images from Firebase
    this.getFilesList().subscribe((imageUrlPromises) => {
      Promise.all(imageUrlPromises).then((loadedUrls) => {
        this.imageList = loadedUrls;

        // Build the cloned slides array:
        // [ lastImage, ...realImages..., firstImage ]
        if (this.imageList.length > 0) {
          this.slides = [
            this.imageList[this.imageList.length - 1], // clone of last
            ...this.imageList,
            this.imageList[0], // clone of first
          ];
        }
      });
    });
  }

  ngOnDestroy(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }
  // Helpful for Angular re-render performance
  trackByUrl(index: number, url: string) {
    return url;
  }
  /**
   * Firebase: get references of all images in "archive-pictures-gsl"
   * and convert them to download URLs.
   */
  private getFilesList() {
    const storageRef = this.storage.ref('archive-pictures-gsl');
    return storageRef.listAll().pipe(
      map((result) => {
        // sort by file name for stable order
        const items = [...result.items].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        return items.map((ref) => ref.getDownloadURL());
      })
    );
  }

  modalVisible = false;
  modalImage: string | null = null;

  openModal(imageUrl: string): void {
    this.modalImage = imageUrl;
    this.modalVisible = true;
  }

  closeModal(): void {
    this.modalVisible = false;
    this.modalImage = null;
  }
}
