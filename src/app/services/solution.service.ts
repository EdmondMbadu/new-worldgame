import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestoreDocument,
  AngularFirestore,
} from '@angular/fire/compat/firestore';
import { Evaluation, Roles, Solution } from '../models/solution';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import { combineLatest, count, last, map, Observable } from 'rxjs';
import { Tournament, User } from '../models/user';
import { SafeResourceUrlWithIconOptions } from '@angular/material/icon';
import { Email } from '../components/create-playground/create-playground.component';

@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  title: string = '';
  solutionId: string = '';
  solutionRef?: Observable<Solution>;
  userRef?: AngularFirestoreDocument<any>;
  allSolutions: Solution[] = [];
  newSolution: Solution = {};
  numberOfEvaluators: number = 3;
  evaluatorsEmails: Email[] = [];
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService
  ) {
    this.auth.user$.subscribe((user) => {
      if (user && user.email) {
        this.newSolution = {
          title: '',
          solutionArea: '',
          description: '',
          participantsHolder: [{ name: user.email }],
          evaluatorsHolder: this.evaluatorsEmails,
        };
      }
    });

    // let shuffle = (array: User[]) => {
    //   return array.sort(() => Math.random() - 0.5);
    // };
    // if (this.auth.currentUser && this.auth.currentUser.email) {
    //   this.auth
    //     .getAllOtherUsers(this.auth.currentUser.email)
    //     .subscribe((data) => {
    //       data = shuffle(data);
    //       for (
    //         let i = 0;
    //         i < this.numberOfEvaluators &&
    //         this.evaluatorsEmails.length < this.numberOfEvaluators;
    //         i++
    //       ) {
    //         this.evaluatorsEmails.push({ name: data[i].email! });
    //       }
    //     });
    // }
  }

  createdNewSolution(
    title: string,
    solutionArea: string,
    description: string,
    participants: any,
    evaluators: any,

    // endDate: string,

    sdgs: string[]
  ) {
    console.log('The list of designers', participants);
    // let formatedDate = this.time.formatDateString(endDate);
    this.solutionId = this.afs.createId().toString();
    const data = {
      solutionId: this.solutionId,
      title: title,
      solutionArea: solutionArea,
      authorAccountId: this.auth.currentUser.uid,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      authorEmail: this.auth.currentUser.email,
      description: description,
      participants: participants,
      evaluators: evaluators,
      // endDate: endDate,
      authorProfileCredential: this.auth.currentUser.profileCredential,
      // endDateFormatted: formatedDate,
      creationDate: this.time.todaysDate(),
      views: '1',
      sdgs: sdgs,
      likes: [],
      numLike: '0',
      // sdg: sdg,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${data.solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  addToTournament(contact: Tournament) {
    const data = {
      solutionId: contact.solutionId,
      firstName: contact.firstName,
      last: contact.lastName,
      city: contact.city,
      country: contact.country,
    };
    const solutionRef: AngularFirestoreDocument<Tournament> = this.afs.doc(
      `tournament/${contact.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  createNewSolutionForParticipant(
    title: string,
    description: string,
    participants: any,
    endDate: string,
    initiatorId: string,
    solutionId: string,
    participantId: string,
    sdg: string
  ) {
    let formatedDate = this.time.formatDateString(endDate);

    const data = {
      solutionId: solutionId,
      title: title,
      initiatorId: initiatorId,
      authorAccountId: participantId,
      description: description,
      participants: participants,
      endDate: endDate,
      endDateFormatted: formatedDate,
      creationDate: this.time.todaysDate(),
      sdg: sdg,
      views: '1',
      numLike: '0',
      numShare: '0',
      likes: [],
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  getSolution(solutionId: string) {
    return this.afs.doc<Solution>(`solutions/${solutionId}`).valueChanges();
  }
  updateSolutionMeetLink(solutionId: string, meetLink: string): Promise<void> {
    return this.afs.doc(`solutions/${solutionId}`).update({ meetLink });
  }

  getSolutionForNonAuthenticatedUser(solutionId: string) {
    return this.afs
      .collectionGroup(`solutions`, (ref) =>
        ref.where('solutionId', '==', solutionId)
      )
      .valueChanges();
  }

  addCommentToSolution(solution: Solution, comments: any) {
    const data = {
      comments: comments,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  // updateSolutionStatus(solutionId: string, updateData: any) {
  //   const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
  //     `solutions/${solutionId}`
  //   );

  //   return solutionRef.set(updateData, { merge: true });
  // }
  getThisUserSolution(solutionId: string) {
    return this.afs.doc<Solution>(`solutions/${solutionId}`).valueChanges();
  }

  getAuthenticatedUserAllSolutions() {
    return this.afs
      .collection<Solution>(`solutions`, (ref) =>
        ref.where('participants', 'array-contains', {
          name: this.auth.currentUser.email,
        })
      )
      .valueChanges();
  }
  getAuthenticatedUserPendingEvaluations() {
    const email = this.auth.currentUser.email;

    // Query for solutions where evaluators contain the email and evaluated is 'false'
    const queryEvaluatedFalse = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('evaluators', 'array-contains', {
          name: email,
          evaluated: 'false',
        })
      )
      .valueChanges();

    // Query for solutions where evaluators contain the email regardless of 'evaluated'
    const queryIgnoreEvaluated = this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('evaluators', 'array-contains', { name: email })
      )
      .valueChanges();

    // Combine results from both queries
    return combineLatest([queryEvaluatedFalse, queryIgnoreEvaluated]).pipe(
      map(([resultsFalse, resultsIgnoreEvaluated]) => {
        // Filter to remove duplicates that might appear in both queries
        const combinedResults = [...resultsFalse, ...resultsIgnoreEvaluated];
        return combinedResults.filter(
          (solution, index, self) =>
            index ===
            self.findIndex((t) => t.solutionId === solution.solutionId)
        );
      })
    );
  }
  getAllSolutionsOfThisUser(email: string) {
    return this.afs
      .collection<Solution>(`solutions`, (ref) =>
        ref.where('participants', 'array-contains', {
          name: email,
        })
      )
      .valueChanges();
  }

  getHomePageSolutions() {
    const tournamentSolutions$ = this.afs
      .collectionGroup<Solution>('solutions', (ref) =>
        ref.where('tournament', '==', 'true')
      )
      .valueChanges();

    const emailSolutions$ = this.afs
      .collectionGroup<Solution>('solutions', (ref) =>
        ref.where('authorEmail', '==', 'globalsollab@gmail.com')
      )
      .valueChanges();

    return combineLatest([tournamentSolutions$, emailSolutions$]).pipe(
      map(([tournamentSolutions, emailSolutions]) => [
        ...tournamentSolutions,
        ...emailSolutions,
      ])
    );
  }

  getAllSolutionsFromAllAccounts() {
    return this.afs.collection<Solution>(`solutions`).valueChanges();
  }

  addEvaluation(solution: Solution) {
    const data = {
      evaluationDetails: solution.evaluationDetails,
      evaluationSummary: solution.evaluationSummary,
      evaluators: solution.evaluators,
      numberofTimesEvaluated: solution.numberofTimesEvaluated,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  updateSolutionForTournament(solution: Solution) {
    const data = {
      tournament: 'true',
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  addLikes(solution: Solution) {
    let numLike = solution.numLike === undefined ? 0 : solution.numLike;
    const data = {
      numLike: (Number(numLike) + 1).toString(),
      likes: solution.likes,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  addNumShare(solution: Solution) {
    let numShare = solution.numShare === undefined ? 0 : solution.numShare;
    const data = {
      numShare: (Number(numShare) + 1).toString(),
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  removeLikes(solution: Solution) {
    let numberLike = solution.numLike === undefined ? 0 : solution.numLike;
    numberLike = Math.max(0, Number(numberLike) - 1);
    const data = {
      numLike: numberLike.toString(),
      likes: solution.likes,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }

  saveSolutionStrategyReview(solutionId: string, review: string) {
    // console.log('saving solution strategy review', review);
    const data = {
      strategyReview: review,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  saveSolutionStatus(solutionId: string, status: any) {
    const data = {
      status: status,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  submitSolution(solutionId: string, content: string) {
    const data = {
      content: content,
      finished: 'true',
      submissionDate: this.time.todaysDate(),
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  editSolutionAfterInitialSubmission(
    solutionId: string,
    currentSolution: Solution
  ) {
    const data = {
      finished: 'false',
      edited: 'true',
      submissionDate: '',
      evaluationDetails: [],
      evaluationSummary: {},
      evaluators: currentSolution.evaluators,
      numberofTimesEvaluated: '',
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  deleteSolution(solutionId: string) {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.delete();
  }
  updateSolutionTitle(solutionId: string, title: string) {
    const data = {
      title: title,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  updateSolutionRoles(roles: Roles, solutionId: string) {
    const data = {
      roles: roles,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  updateSolutionReadMe(solutionId: string, readMe: string) {
    const data = {
      description: readMe,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  addParticipantsToSolution(participants: any, solutionId: string) {
    const data = {
      participants: participants,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  sendSignal(solutionId: string, signalData: any) {
    const signalsRef = this.afs.collection(`solutions/${solutionId}/signals`);
    return signalsRef.add(signalData);
  }

  getSignals(
    solutionId: string,
    receiverId: string,
    receiverSessionId: string
  ): Observable<any[]> {
    return this.afs
      .collection(`solutions/${solutionId}/signals`, (ref) =>
        ref
          .where('receiverId', '==', receiverId)
          .where('receiverSessionId', '==', receiverSessionId)
      )
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data: any = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );
  }

  deleteSignal(solutionId: string, signalId: string) {
    return this.afs.doc(`solutions/${solutionId}/signals/${signalId}`).delete();
  }
  addParticipant(solutionId: string, userId: string, sessionId: string) {
    const participantsRef = this.afs.collection(
      `solutions/${solutionId}/participants`
    );
    return participantsRef.doc(userId).set({
      userId: userId,
      sessionId: sessionId,
    });
  }

  removeParticipant(solutionId: string, userId: string) {
    const participantsRef = this.afs.collection(
      `solutions/${solutionId}/participants`
    );
    return participantsRef.doc(userId).delete();
  }

  getParticipants(
    solutionId: string
  ): Observable<{ userId: string; sessionId: string }[]> {
    const participantsRef = this.afs.collection(
      `solutions/${solutionId}/participants`
    );
    return participantsRef.valueChanges().pipe(
      map((participants) =>
        participants.map((p: any) => ({
          userId: p.userId,
          sessionId: p.sessionId,
        }))
      )
    );
  }

  deleteSignalsBySender(
    solutionId: string,
    senderId: string,
    senderSessionId: string
  ) {
    const signalsRef = this.afs.collection(
      `solutions/${solutionId}/signals`,
      (ref) =>
        ref
          .where('senderId', '==', senderId)
          .where('senderSessionId', '==', senderSessionId)
    );
    signalsRef.get().subscribe((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        doc.ref.delete();
      });
    });
  }

  private generateSessionId(): string {
    return Date.now().toString(); // Generates a simple session ID based on timestamp
  }
}
