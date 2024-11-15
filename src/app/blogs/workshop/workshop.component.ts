import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-workshop',
  templateUrl: './workshop.component.html',
  styleUrl: './workshop.component.css',
})
export class WorkshopComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
    this.initializeCountdown();
  }
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService, private solution: SolutionService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }
  private initializeCountdown(): void {
    const eventDate = new Date('December 12, 2024 12:00:00 EST').getTime();
    const daysElement = document.getElementById('days');
    const hoursElement = document.getElementById('hours');
    const minutesElement = document.getElementById('minutes');
    const secondsElement = document.getElementById('seconds');

    function pad(value: number): string {
      return value < 10 ? `0${value}` : `${value}`;
    }

    function updateTimer() {
      const now = new Date().getTime();
      const timeLeft = eventDate - now;

      if (timeLeft < 0) {
        const countdownElement = document.getElementById('countdown');
        countdownElement!.innerHTML = 'The event has started!';
        return;
      }

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      if (daysElement && hoursElement && minutesElement && secondsElement) {
        daysElement.innerHTML = pad(days);
        hoursElement.innerHTML = pad(hours);
        minutesElement.innerHTML = pad(minutes);
        secondsElement.innerHTML = pad(seconds);
      }
    }

    updateTimer();
    setInterval(updateTimer, 1000);
  }
}
