// mini-game.component.ts
import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/services/game.service';

import { AuthService } from 'src/app/services/auth.service';
import { GameScenario } from 'src/app/models/tournament';
import { AngularFirestore } from '@angular/fire/compat/firestore';
export interface LeaderRow {
  email: string;
  totalScore: number;
}
@Component({
  selector: 'app-mini-game',
  templateUrl: './mini-game.component.html', // retains big template from prior message
})
export class MiniGameComponent implements OnInit {
  scenarios: GameScenario[] = [];
  currentScenario!: GameScenario;
  currentStep = 0;
  score = { sustainability: 0, humanImpact: 0, equity: 0, innovation: 0 };
  choiceMade = false;
  selectedChoiceIndex: number | null = null;
  unlockedBadge: string | null = null;
  badges: string[] = [];
  gameOver = false;
  userEmail = '';
  /* record totalSteps separately so it can be reset after filtering */
  totalSteps: number = 0;

  emailSaved = false;
  leaderboard: LeaderRow[] = [];
  constructor(
    private gameService: GameService,
    private auth: AuthService,
    private afs: AngularFirestore
  ) {}
  /* intro logic */
  showIntro = true;
  startChallenge() {
    this.showIntro = false;
  }
  /* shrink to 5 scenarios */
  ngOnInit() {
    const all = this.gameService.loadScenarios(); // full library (17)

    // randomly pick any 5 distinct scenarios
    this.scenarios = this.randomPick(all, 5);

    this.currentScenario = this.scenarios[0];
    this.totalSteps = this.scenarios.length;
  }

  /** Fisher–Yates shuffle, then grab first k */
  private randomPick<T>(arr: T[], k: number): T[] {
    const copy = [...arr]; // keep original intact
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]]; // swap
    }
    return copy.slice(0, k);
  }

  /* star helper used in template */
  stars(n: number) {
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  // progress helpers (unchanged)
  get totalStep() {
    return this.scenarios.length;
  }
  get progress() {
    return (this.currentStep / this.totalSteps) * 100;
  }
  get totalScore() {
    return (
      this.score.sustainability +
      this.score.humanImpact +
      this.score.equity +
      this.score.innovation
    );
  }

  chooseOption(i: number) {
    if (this.choiceMade || this.gameOver) return;
    this.choiceMade = true;
    this.selectedChoiceIndex = i;

    const c = this.currentScenario.choices[i];
    this.score.sustainability += c.sustainability;
    this.score.humanImpact += c.humanImpact;
    this.score.equity += c.equity;
    this.score.innovation += c.innovation;

    this.unlockedBadge = c.badge;
    this.badges.push(c.badge);
  }

  nextScenario() {
    window.scrollTo(0, 0);
    this.currentStep++;
    if (this.currentStep < this.scenarios.length) {
      this.currentScenario = this.scenarios[this.currentStep];
      this.choiceMade = false;
      this.selectedChoiceIndex = null;
      this.unlockedBadge = null;
    } else {
      this.gameOver = true;
    }
  }

  async captureEmail() {
    /* persist to Firestore */
    await this.gameService.save({
      email: this.userEmail,
      uid: this.auth.currentUser?.uid ?? null,
      totalScore: this.totalScore,
      detailed: { ...this.score },
      badges: this.badges,
      completedAt: new Date().toISOString(),
    });
    // alert('Thanks — your score is saved!');
    this.emailSaved = true;
    this.loadLeaderboard(); // 👈 pull top scores
  }
  /** grab top-5 scores for simple display */
  loadLeaderboard() {
    this.afs
      .collection('miniScores', (ref) =>
        ref.orderBy('totalScore', 'desc').limit(5)
      )
      .valueChanges()
      .subscribe((rows) => {
        this.leaderboard = rows as LeaderRow[];
      });
  }
}
