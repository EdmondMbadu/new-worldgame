import { Component } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Tournament } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';
import { TournamentService } from 'src/app/services/tournament.service';

@Component({
  selector: 'app-tournament-management',
  templateUrl: './tournament-management.component.html',
  styleUrl: './tournament-management.component.css',
})
export class TournamentManagementComponent {
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private activatedRoute: ActivatedRoute,
    private time: TimeService,
    public data: DataService,
    private tourneySvc: TournamentService
  ) {}
  allTournaments: Tournament[] = [];
  statusFilter: 'all' | 'pending' | 'approved' | 'rejected' = 'all';
  ngOnInit(): void {
    this.tourneySvc.getAllTournaments().subscribe((list) => {
      this.allTournaments = list;
    });
  }

  /* ---------- UI helpers ---------- */
  btnClass(target: 'all' | 'pending' | 'approved' | 'rejected') {
    return this.statusFilter === target
      ? 'bg-blue-600 text-white'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  }

  get filtered(): Tournament[] {
    if (this.statusFilter === 'all') return this.allTournaments;
    return this.allTournaments.filter((t) => t.status === this.statusFilter);
  }

  badgeClass(t: Tournament) {
    switch (t.status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'rejected':
        return 'bg-rose-100  text-rose-800  dark:bg-rose-800  dark:text-rose-100';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
    }
  }

  /** cycle status: pending → approved → rejected → pending */
  async cycleStatus(t: Tournament) {
    const next =
      t.status === 'pending'
        ? 'approved'
        : t.status === 'approved'
        ? 'rejected'
        : 'pending';

    const prev = t.status;
    t.status = next; // optimistic UI

    try {
      await this.tourneySvc.updateTournamentStatus(t.tournamentId!, next);
    } catch (err) {
      t.status = prev; // rollback on error
      console.error('Status update failed', err);
    }
  }
}
