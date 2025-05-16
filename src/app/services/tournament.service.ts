import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import { Tournament } from '../models/tournament';
import { map, Observable } from 'rxjs';
import firebase from 'firebase/compat/app';
@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  constructor(
    private afs: AngularFirestore,
    private auth: AuthService,
    private time: TimeService
  ) {}

  async createdNewTournament(
    title: string,
    subtitle: string,
    instruction: string,
    image: string,
    prizeAmount: string,
    prizeOther: string,
    deadline: string
  ) {
    const tournamentId = this.afs.createId();
    const data: Tournament = {
      tournamentId,
      title,
      subtTitle: subtitle,
      instruction,
      image,
      prizeAmount,
      prizeOther,
      deadline,
      submittedSolutions: [],
      winningSolution: '',
      authorId: this.auth.currentUser.uid,
      authorEmail: this.auth.currentUser.email,
      status: 'pending',
      /** NEW ↓ — ISO string keeps sorting simple */
      creationDate: new Date().toISOString(),
    };

    const ref: AngularFirestoreDocument<Tournament> = this.afs.doc(
      `tournaments/${tournamentId}`
    );

    await ref.set(data, { merge: true });
    return tournamentId;
  }
  /** returns all tournaments created by this author, newest first */
  getByAuthor(authorId: string): Observable<Tournament[]> {
    const col: AngularFirestoreCollection<Tournament> =
      this.afs.collection<Tournament>('tournaments', (ref) =>
        ref.where('authorId', '==', authorId).orderBy('creationDate', 'desc')
      );

    return col.snapshotChanges().pipe(
      map((snaps) =>
        snaps.map((s) => ({
          tournamentId: s.payload.doc.id,
          ...(s.payload.doc.data() as Tournament),
        }))
      )
    );
  }
  // tournament.service.ts
  getActive(today: string): Observable<Tournament[]> {
    /*  Firestore supports one equality + one range filter
      => status == 'approved'  AND  deadline >= today
      orderBy must start with the range field (deadline). */
    return this.afs
      .collection<Tournament>(
        'tournaments',
        (ref) =>
          ref
            .where('status', '==', 'approved')
            .where('deadline', '>=', today) // today in YYYY-MM-DD
            .orderBy('deadline', 'asc') // soonest first
      )
      .snapshotChanges()
      .pipe(
        map((snaps) =>
          snaps.map((s) => ({
            tournamentId: s.payload.doc.id,
            ...(s.payload.doc.data() as Tournament),
          }))
        )
      );
  }
  /** approved tournaments whose deadline is before today */
  getPast(today: string): Observable<Tournament[]> {
    return this.afs
      .collection<Tournament>(
        'tournaments',
        (ref) =>
          ref
            .where('status', '==', 'approved')
            .where('deadline', '<', today) // past deadlines
            .orderBy('deadline', 'desc') // most-recent first
      )
      .snapshotChanges()
      .pipe(
        map((snaps) =>
          snaps.map((s) => ({
            tournamentId: s.payload.doc.id,
            ...(s.payload.doc.data() as Tournament),
          }))
        )
      );
  }
  getById(id: string) {
    return this.afs.doc<Tournament>(`tournaments/${id}`).valueChanges();
  }
  updateFiles(id: string, files: string[]) {
    return this.afs.doc(`tournaments/${id}`).update({ files });
  }
  // tournament.service.ts
  addSubmittedSolution(tournamentId: string, solutionId: string) {
    const ref = this.afs.doc(`tournaments/${tournamentId}`);
    return ref.update({
      submittedSolutions: firebase.firestore.FieldValue.arrayUnion(solutionId),
    });
  }
  removeSubmittedSolution(tournamentId: string, solutionId: string) {
    return this.afs.doc(`tournaments/${tournamentId}`).update({
      submittedSolutions: firebase.firestore.FieldValue.arrayRemove(solutionId),
    });
  }
  // tournament.service.ts
  setWinningSolution(tournamentId: string, solutionId: string | null) {
    return this.afs.doc(`tournaments/${tournamentId}`).update({
      winningSolution: solutionId ?? '',
    });
  }
}
