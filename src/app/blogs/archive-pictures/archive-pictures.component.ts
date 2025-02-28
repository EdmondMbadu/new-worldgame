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

        // Once images are ready, start auto-play
        this.startAutoPlay();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  /**
   * Firebase: get references of all images in "archive-pictures-gsl"
   * and convert them to download URLs.
   */
  private getFilesList() {
    const storageRef = this.storage.ref('archive-pictures-gsl');
    return storageRef
      .listAll()
      .pipe(map((result) => result.items.map((ref) => ref.getDownloadURL())));
  }

  /**
   * Starts the auto-play mechanism: go to the next slide every 5 seconds.
   */
  private startAutoPlay(): void {
    // Clear any existing interval to prevent duplication
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }

    this.autoPlayInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  /**
   * Move to the next slide in the array.
   */
  nextSlide(): void {
    if (this.slides.length === 0) return;
    this.currentIndex++;
  }

  /**
   * Move to the previous slide in the array.
   */
  prevSlide(): void {
    if (this.slides.length === 0) return;
    this.currentIndex--;
  }

  /**
   * Jump to a specific index (useful if you want dot indicators).
   */
  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  /**
   * This fires when the CSS transition on the .flex container finishes.
   * We detect if we've slid onto a "cloned" slide (either index=0 or
   * index=slides.length-1) and snap to the real slide while *disabling* transition
   * so the user doesn't see the jump.
   */
  onTransitionEnd(): void {
    // If we're on the cloned first slide (index 0),
    // jump to the real last slide (index = imageList.length).
    if (this.currentIndex === 0) {
      this.transitioning = false;
      this.currentIndex = this.imageList.length;
      // re-enable transitions after we snap
      setTimeout(() => (this.transitioning = true), 0);

      // If we're on the cloned last slide (index = slides.length-1),
      // jump to the real first slide (index = 1).
    } else if (this.currentIndex === this.slides.length - 1) {
      this.transitioning = false;
      this.currentIndex = 1;
      // re-enable transitions after we snap
      setTimeout(() => (this.transitioning = true), 0);
    }
  }
}
