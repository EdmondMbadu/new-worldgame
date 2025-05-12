import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-tournament-win',
  templateUrl: './tournament-win.component.html',
  styleUrl: './tournament-win.component.css',
})
export class TournamentWinComponent implements OnInit {
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService,
    public router: Router
  ) {}
  allSolutions: Solution[] = [];
  showDetails: boolean = false;
  completedSolutions: Solution[] = [];
  isPostDeadline: boolean = false;
  winningSolution: Solution = {};
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
    this.winningSolution = this.completedSolutions[0];
  }
}
