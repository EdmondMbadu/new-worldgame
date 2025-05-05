import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-active-tournaments',
  templateUrl: './active-tournaments.component.html',
  styleUrl: './active-tournaments.component.css',
})
export class ActiveTournamentsComponent implements OnInit {
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
