import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-careers-social',
  templateUrl: './careers-social.component.html',
  styleUrl: './careers-social.component.css',
})
export class CareersSocialComponent implements OnInit {
  email = 'newworld@newworld-game.org';
  subject = 'NWG Social Media Fellow – Your Name';
  copied = false;

  get mailto() {
    return `mailto:${this.email}?subject=${encodeURIComponent(this.subject)}`;
  }

  ngOnInit(): void {
    window.scrollTo(0, 0);
  }

  async copyEmail() {
    try {
      await navigator.clipboard.writeText(this.email);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1800);
    } catch {}
  }
}
