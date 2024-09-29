import { Component, ElementRef, ViewChild } from '@angular/core';
import { Input, OnInit, Pipe } from '@angular/core';

@Component({
  selector: 'app-audio-player',
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.css',
})
export class AudioPlayerComponent {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  @ViewChild('seekBar') seekBar!: ElementRef<HTMLInputElement>;

  @Input() audioFile: string = '';

  isPlaying: boolean = false;
  currentTime: number = 0;
  duration: number = 0;

  playPause() {
    const audio = this.audioPlayer.nativeElement;
    if (audio.paused) {
      audio.play();
      this.isPlaying = true;
    } else {
      audio.pause();
      this.isPlaying = false;
    }
  }

  stop() {
    const audio = this.audioPlayer.nativeElement;
    audio.pause();
    audio.currentTime = 0;
    this.isPlaying = false;
  }

  forward() {
    const audio = this.audioPlayer.nativeElement;
    audio.currentTime = Math.min(audio.currentTime + 5, this.duration);
  }

  backward() {
    const audio = this.audioPlayer.nativeElement;
    audio.currentTime = Math.max(audio.currentTime - 5, 0);
  }

  seekAudio(event: Event) {
    const audio = this.audioPlayer.nativeElement;
    const input = event.target as HTMLInputElement;
    audio.currentTime = parseFloat(input.value);
  }
  // Method to get the dynamic background for the seek bar
  getSeekBarBackground(): string {
    const percentage = (this.currentTime / this.duration) * 100;
    return `linear-gradient(to right, #3b82f6 ${percentage}%, gray ${percentage}%)`;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  updateCurrentTime() {
    const audio = this.audioPlayer.nativeElement;
    this.currentTime = audio.currentTime;
  }

  setDuration() {
    const audio = this.audioPlayer.nativeElement;
    this.duration = audio.duration;
  }

  shuffle() {
    console.log('Shuffle button clicked!');
  }

  repeat() {
    console.log('Repeat button clicked!');
  }

  ngAfterViewInit() {
    const audio = this.audioPlayer.nativeElement;
    audio.addEventListener('timeupdate', () => {
      this.updateCurrentTime();
    });

    audio.addEventListener('loadedmetadata', () => {
      this.setDuration();
    });
  }
}
