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

  emailSaved = false;
  leaderboard: LeaderRow[] = [];
  constructor(
    private gameService: GameService,
    private auth: AuthService,
    private afs: AngularFirestore
  ) {}

  ngOnInit() {
    window.scrollTo(0, 0);
    this.scenarios = this.gameService.loadScenarios();
    this.currentScenario = this.scenarios[0];
  }

  // progress helpers (unchanged)
  get totalSteps() {
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
