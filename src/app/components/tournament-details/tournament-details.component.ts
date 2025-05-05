import { Component, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-tournament-details',
  templateUrl: './tournament-details.component.html',
  styleUrl: './tournament-details.component.css',
})
export class TournamentDetailsComponent implements OnInit {
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}
  allSolutions: Solution[] = [];
  completedSolutions: Solution[] = [];
  isPostDeadline: boolean = false;
  ngOnInit(): void {
    this.solution.getHomePageSolutions().subscribe((data) => {
      this.allSolutions = data;
      this.findCompletedSolutions();
      /* ➌ enrich the category list with any new categories found in data */
    });

    window.scroll(0, 0);
  }
  findCompletedSolutions() {
    this.completedSolutions = [];

    for (let s of this.allSolutions) {
      if (s.finished === 'true') {
        this.completedSolutions.push(s);
      }
    }
  }
}
