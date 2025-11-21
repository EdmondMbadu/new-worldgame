import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { AIOption, DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-landing-college',
  templateUrl: './landing-college.component.html',
  styleUrls: ['./landing-college.component.css'],
})
export class LandingCollegeComponent implements OnInit {
  aiOptions: AIOption[] = [];
  isLoggedIn = false;

  constructor(public data: DataService, public auth: AuthService) {}

  async ngOnInit(): Promise<void> {
    window.scrollTo(0, 0);
    this.aiOptions = this.data.getAll();
    const user = await this.auth.getCurrentUserPromise();
    this.isLoggedIn = !!user;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
