import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestoreDocument,
  AngularFirestore,
} from '@angular/fire/compat/firestore';
import { Evaluation, Roles, Solution } from '../models/solution';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import {
  combineLatest,
  count,
  from,
  last,
  map,
  Observable,
  of,
  switchMap,
  take,
} from 'rxjs';
import { ChallengePage, Tournament, User } from '../models/user';
import { SafeResourceUrlWithIconOptions } from '@angular/material/icon';
import { Email } from '../components/create-playground/create-playground.component';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

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
    private time: TimeService,
    private fns: AngularFireFunctions
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
  }

  resetNewSolution() {
    this.newSolution = {
      title: '',
      solutionArea: '',
      description: '',
      image: '',
      participantsHolder: [{ name: this.auth.currentUser.email }],
      evaluatorsHolder: this.evaluatorsEmails,
    };
  }
  async joinSolution(solution: Solution, email: string) {
    /* --- 1. normalise participants --- */
    const raw = solution.participants ?? [];
    const participants: { name: string }[] = Array.isArray(raw)
      ? [...raw]
      : Object.values(raw as Record<string, string>).map((e) => ({ name: e }));

    /* --- 2. add user if missing --- */
    if (!participants.some((p) => p.name.trim().toLowerCase() === email)) {
      participants.push({ name: email });

      await this.afs
        .doc(`solutions/${solution.solutionId}`)
        .update({ participants });
    }

    return participants; // in case caller needs it
  }

  async createdNewSolution(
    title: string,
    solutionArea: string,
    description: string,
    image: string | undefined,
    participants: any,
    evaluators: any,
    // endDate: string,
    sdgs: string[],
    solutionId: string = ''
  ) {
    console.log('The list of designers', participants);

    // Generate a unique solution ID
    this.solutionId =
      solutionId !== '' ? solutionId : this.afs.createId().toString();

    const data: {
      solutionId: string;
      title: string;
      solutionArea: string;
      authorAccountId: string;
      authorName: string;
      authorEmail: string;
      description: string;
      participants: any;
      evaluators: any;
      authorProfileCredential: string;
      creationDate: string;
      views: string;
      sdgs: string[];
      likes: any[];
      numLike: string;
      image?: string; // Optional image field
    } = {
      solutionId: this.solutionId,
      title: title,
      solutionArea: solutionArea,
      authorAccountId: this.auth.currentUser.uid,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      authorEmail: this.auth.currentUser.email,
      description: description,
      participants: participants,
      evaluators: evaluators,
      authorProfileCredential: this.auth.currentUser.profileCredential,
      creationDate: this.time.todaysDate(),
      views: '1',
      sdgs: sdgs,
      likes: [],
      numLike: '0',
    };

    // Only add the image property if it is defined and not empty
    if (image) {
      data.image = image;
    }

    // Reference to the Firestore document
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${data.solutionId}`
    );

    // Save the initial data to Firestore
    await solutionRef.set(data, { merge: true });

    // Asynchronously create the meeting link without awaiting
    this.createMeetLink(this.solutionId, title)
      .toPromise()
      .then((dataMeeting) => {
        const meetLink = dataMeeting.hangoutLink;
        console.log('Meeting link', meetLink);

        // Update the Firestore document with the meetLink
        return solutionRef.update({ meetLink });
      })
      .catch((error) => {
        console.error('Error creating meeting link:', error);
        // Optionally handle the error, e.g., notify the user or retry
      });

    // Optionally return the solution data or a confirmation
    return {
      solutionId: this.solutionId,
      status: 'Solution created. Meeting link is being generated.',
    };
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
  updateSolutionField(id: string, key: string, value: any) {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${id}`
    );
    const data = {
      [key]: value,
    };
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
  submitSolution(solutionId: string) {
    const data = {
      // content: content,
      finished: 'true',
      stqtusForPublication: '', // every submition will need to be seen for publication
      submissionDate: this.time.todaysDate(),
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  submitPreviewSolution(solutionId: string, content: string) {
    const data = {
      content: content,
      preview: 'true',
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
  submitSolutionForPublication(solutionId: string, currentSolution: Solution) {
    const data = {
      statusForPublication: currentSolution.statusForPublication,
      evaluators: currentSolution.evaluators,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
  setSolutionCategoryForPublication(
    solutionId: string,
    currentSolution: Solution
  ) {
    const data = {
      category: currentSolution.category,
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
  updateSolutionBoard(solutionId: string, boardDataUrl: string): Promise<void> {
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `solutions/${solutionId}`
    );
    return solutionRef.update({ board: boardDataUrl });
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
  addEvaluatorsToSolution(evaluators: any, solutionId: string) {
    const data = {
      evaluators: evaluators,
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
  createMeetLink(solutionId: string, title: string): Observable<any> {
    const callable = this.fns.httpsCallable('createGoogleMeet');
    return callable({ solutionId, title });
  }
  getMany(ids: string[]) {
    return this.afs
      .collection<Solution>('solutions', (ref) =>
        ref.where('solutionId', 'in', ids).limit(30)
      )
      .valueChanges();
  }
}
