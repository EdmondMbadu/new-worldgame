import { Component, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-create-tournament',
  templateUrl: './create-tournament.component.html',
  styleUrl: './create-tournament.component.css',
})
export class CreateTournamentComponent implements OnInit {
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
