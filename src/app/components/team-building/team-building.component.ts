import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { AuthService } from 'src/app/services/auth.service';
import { Subscription } from 'rxjs';

interface VoteDoc {
  picked: number;
  name: string;
}
interface GuessDoc {
  guess: string;
  name: string;
}

interface EntryDoc {
  id?: string;
  uid: string;
  displayName: string;
  statements: string[];
  lieIndex: number;
  code: string;
  codeExplanation: string;
  createdAt: firebase.firestore.FieldValue;
  revealed?: boolean;
}

interface EntryView extends EntryDoc {
  shuffled: string[];
  answerPos: number;
  alreadyVoted: boolean;
  alreadyGuessed: boolean;
  tempGuess?: string;
  voteCount: number;
  votesDetail: VoteDoc[];
  guessDetail: GuessDoc[];
}

@Component({
  selector: 'app-team-building',
  templateUrl: './team-building.component.html',
})
export class TeamBuildingComponent implements OnInit, OnDestroy {
  truth1 = '';
  truth2 = '';
  lie = '';
  code = '';
  codeExplanation = '';
  isOwner = false;
  solutionId = '';
  viewEntries: EntryView[] = [];
  private listSub?: Subscription;
  private entrySubs = new Map<string, Subscription[]>(); // realtime ▶

  constructor(
    public auth: AuthService,
    private route: ActivatedRoute,
    private afs: AngularFirestore,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.solutionId = this.route.snapshot.paramMap.get('id') ?? '';

    /* main entries stream */
    this.listSub = this.afs
      .collection('solutions')
      .doc(this.solutionId)
      .collection<EntryDoc>('teamBuildingEntries', (ref) =>
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' })
      .subscribe((list) => this.syncEntries(list));

    this.afs
      .doc(`solutions/${this.solutionId}`)
      .valueChanges()
      .subscribe(
        (sol: any) =>
          (this.isOwner = sol?.ownerOfTeamPost === this.auth.currentUser.uid)
      );
  }
  ngOnDestroy() {
    this.listSub?.unsubscribe();
    this.entrySubs.forEach((arr) => arr.forEach((s) => s.unsubscribe()));
  }

  /* ───────── sync list & attach sub-listeners ───────── */
  private syncEntries(docs: EntryDoc[]) {
    const existingIds = new Set(this.viewEntries.map((e) => e.id));

    // add new entries
    docs.forEach((d) => {
      if (!existingIds.has(d.id!)) {
        const view: EntryView = {
          ...d,
          shuffled: d.statements,
          answerPos: d.lieIndex,
          alreadyVoted: false,
          alreadyGuessed: false,
          voteCount: 0,
          votesDetail: [],
          guessDetail: [],
        };
        this.viewEntries.unshift(view);
        this.attachRealtime(view); // realtime ▶
      }
    });

    // remove listeners for deleted entries
    this.viewEntries = this.viewEntries.filter((v) => {
      const stillExists = docs.some((d) => d.id === v.id);
      if (!stillExists) {
        this.detachRealtime(v.id!); // realtime ▶
      }
      return stillExists;
    });
  }

  /* ───────── attach listeners for votes & guesses ───────── */
  private attachRealtime(view: EntryView) {
    const path = `solutions/${this.solutionId}/teamBuildingEntries/${view.id}`;

    const votes$ = this.afs
      .doc(path)
      .collection<VoteDoc>('votesLie')
      .valueChanges(); // realtime ▶
    const guesses$ = this.afs
      .doc(path)
      .collection<GuessDoc>('guessesCode')
      .valueChanges(); // realtime ▶

    const votesSub = votes$.subscribe((list) => {
      this.zone.run(() => {
        view.votesDetail = list;
        view.voteCount = list.length;
        view.alreadyVoted = list.some(
          (v) => v.name === this.auth.currentUser.firstName
        );
      });
    });

    const guessesSub = guesses$.subscribe((list) => {
      this.zone.run(() => {
        view.guessDetail = list;
        view.alreadyGuessed = list.some(
          (g) => g.name === this.auth.currentUser.firstName
        );
      });
    });

    this.entrySubs.set(view.id!, [votesSub, guessesSub]);
  }
  private detachRealtime(id: string) {
    const arr = this.entrySubs.get(id);
    arr?.forEach((s) => s.unsubscribe());
    this.entrySubs.delete(id);
  }
  /* ── submit entry ── */
  async submit() {
    if (!this.canSubmit()) return;
    const uid = this.auth.currentUser.uid;
    const name = this.auth.currentUser.firstName || 'Anonymous';

    const statements = [this.truth1, this.truth2, this.lie];
    const order = [0, 1, 2].sort(() => Math.random() - 0.5);
    const lieIndex = order.indexOf(2);

    await this.afs
      .doc(`solutions/${this.solutionId}`)
      .collection('teamBuildingEntries')
      .add({
        uid,
        displayName: name,
        statements: order.map((i) => statements[i]),
        lieIndex,
        code: this.code,
        codeExplanation: this.codeExplanation,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        revealed: false,
      });

    await this.afs
      .doc(`solutions/${this.solutionId}`)
      .set({ ownerOfTeamPost: uid }, { merge: true });

    this.truth1 =
      this.truth2 =
      this.lie =
      this.code =
      this.codeExplanation =
        '';
  }

  /* ── vote ── */
  async pickLie(ev: EntryView, picked: number) {
    const uid = this.auth.currentUser.uid;
    if (ev.alreadyVoted) return;

    const name = this.auth.currentUser.firstName || 'You';
    const ref = this.afs
      .doc(`solutions/${this.solutionId}/teamBuildingEntries/${ev.id}`)
      .collection('votesLie')
      .doc(uid);
    await ref.set({ picked, name } as VoteDoc);

    ev.alreadyVoted = true;
    ev.votesDetail.push({ picked, name });
    ev.voteCount = ev.votesDetail.length;
  }

  /* ── guess ── */
  async submitGuess(ev: EntryView) {
    const uid = this.auth.currentUser.uid;
    if (ev.alreadyGuessed || !ev.tempGuess) return;

    if (!confirm('Submit this guess?')) return;

    const name = this.auth.currentUser.firstName || 'You';
    await this.afs
      .doc(`solutions/${this.solutionId}/teamBuildingEntries/${ev.id}`)
      .collection('guessesCode')
      .doc(uid)
      .set({ guess: ev.tempGuess, name } as GuessDoc);

    ev.alreadyGuessed = true;
    ev.guessDetail.push({ guess: ev.tempGuess, name });
    ev.tempGuess = '';
  }

  /* ── reset ── */
  async resetGame() {
    if (!this.isOwner) return;
    const snap = await this.afs
      .collection(`solutions/${this.solutionId}/teamBuildingEntries`)
      .get()
      .toPromise();
    const batch = this.afs.firestore.batch();
    snap?.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  /* helpers */
  canSubmit() {
    return (
      this.truth1 &&
      this.truth2 &&
      this.lie &&
      this.code &&
      this.codeExplanation
    );
  }

  private async buildViews(docs: EntryDoc[]) {
    const promises = docs.map(async (d) => {
      const path = `solutions/${this.solutionId}/teamBuildingEntries/${d.id}`;

      const voteSnap = await this.afs
        .doc(path)
        .collection('votesLie')
        .get()
        .toPromise();
      const votesDetail: VoteDoc[] =
        voteSnap?.docs.map((v) => v.data() as VoteDoc) || [];

      const guessSnap = await this.afs
        .doc(path)
        .collection('guessesCode')
        .get()
        .toPromise();
      const guessDetail: GuessDoc[] =
        guessSnap?.docs.map((g) => g.data() as GuessDoc) || [];

      return <EntryView>{
        ...d,
        shuffled: d.statements,
        answerPos: d.lieIndex,
        alreadyVoted: votesDetail.some(
          (v) => v.name === this.auth.currentUser.firstName
        ),
        alreadyGuessed: guessDetail.some(
          (g) => g.name === this.auth.currentUser.firstName
        ),
        tempGuess: '',
        voteCount: votesDetail.length,
        votesDetail,
        guessDetail,
      };
    });
    this.viewEntries = await Promise.all(promises);
  }
}
