// tournament-details.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, filter } from 'rxjs/operators';
import { Tournament } from 'src/app/models/tournament';
import { Solution } from 'src/app/models/solution';
import { TournamentService } from 'src/app/services/tournament.service';
import { SolutionService } from 'src/app/services/solution.service';
import { AuthService } from 'src/app/services/auth.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { of } from 'rxjs';

@Component({
  selector: 'app-tournament-details',
  templateUrl: './tournament-details.component.html',
  styleUrls: ['./tournament-details.component.css'],
})
export class TournamentDetailsComponent implements OnInit {
  t?: Tournament;
  completedSolutions: Solution[] = [];
  isAuthor = false;
  isPostDeadline = false;
  uploadBusy = false;

  constructor(
    private route: ActivatedRoute,
    private tourneySvc: TournamentService,
    private solSvc: SolutionService,
    private storage: AngularFireStorage,
    public auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.scrollTo(0, 0);

    this.route.paramMap
      .pipe(switchMap((p) => this.tourneySvc.getById(p.get('id')!)))
      .subscribe((t) => {
        if (!t) {
          this.router.navigate(['/active-tournaments']);
          return;
        }
        this.t = t;

        /* is the logged-in user the author? */
        this.isAuthor = t.authorId === this.auth.currentUser.uid;

        /* is deadline in the past? */
        this.isPostDeadline = new Date() > new Date(t.deadline ?? '');

        /* load solutions if any */
        if (t.submittedSolutions?.length) {
          this.solSvc.getMany(t.submittedSolutions).subscribe((sols) => {
            this.completedSolutions = sols;
          });
        }
      });
  }

  /** AUTHOR-ONLY – upload extra reference file */
  async addReferenceFile(fileList: FileList | null) {
    const file = fileList?.item(0);
    if (!file || file.size > 20_000_000) {
      return;
    }

    this.uploadBusy = true;
    const path = `tournament_refs/${Date.now()}_${file.name}`;
    const task = await this.storage.upload(path, file);
    const url = await task.ref.getDownloadURL();

    const files = this.t?.files ?? [];
    files.push(url);
    await this.tourneySvc.updateFiles(this.t!.tournamentId!, files);

    /* refresh local state */
    this.t!.files = files;
    this.uploadBusy = false;
  }

  /** NAV */
  submitFinishedSolution() {
    this.router.navigate(['/submit-solution', this.t!.tournamentId]);
  }
  createNewSolution() {
    this.router.navigate(['/create-solution', this.t!.tournamentId]);
  }
}
