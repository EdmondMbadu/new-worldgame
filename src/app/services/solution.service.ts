import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestoreDocument,
  AngularFirestore,
} from '@angular/fire/compat/firestore';
import {
  Broadcast,
  Evaluation,
  JoinRequest,
  Roles,
  Solution,
} from '../models/solution';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import {
  combineLatest,
  count,
  firstValueFrom,
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
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

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
  // solution.service.ts
  getSolutionsByIds(ids: string[]) {
    if (!ids.length) return of([]);
    /* Firestore ‘in’ supports ≤30 values – chunk if needed */
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));

    return combineLatest(
      chunks.map((chunk) =>
        this.afs
          .collection<Solution>('solutions', (ref) =>
            ref.where('solutionId', 'in', chunk)
          )
          .valueChanges({ idField: 'solutionId' })
      )
    ).pipe(map((arr) => arr.flat()));
  }

  // === Start a broadcast ===
  async startBroadcast(params: {
    solutionId: string;
    title: string;
    message: string;
    includeReadMe: boolean;
    readMe?: string;
    channels: {
      email: boolean;
      broadcastFeed: boolean;
      social: boolean;
      customApi: boolean;
    };
    inviteLink: string;
    joinLink: string;
  }): Promise<string> {
    const broadcastId = this.afs.createId();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    const payload: Broadcast = {
      broadcastId,
      solutionId: params.solutionId,
      title: params.title,
      message: params.message || '',
      includeReadMe: !!params.includeReadMe,
      readMe: params.includeReadMe ? params.readMe || '' : undefined,
      channels: params.channels,
      inviteLink: params.inviteLink,
      joinLink: params.joinLink,
      active: true,
      status: 'active',
      createdByUid: this.auth.currentUser.uid,
      createdByName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      createdByEmail: this.auth.currentUser.email,
      createdAt: now,
      updatedAt: now,
    };

    // 1) create broadcast doc
    await this.afs
      .doc(`broadcasts/${broadcastId}`)
      .set(payload, { merge: true });

    // 2) mirror status on the solution
    await this.afs.doc(`solutions/${params.solutionId}`).set(
      {
        isBroadcasting: true,
        broadcastId,
        broadcastStatus: 'active',
        broadcastChannels: params.channels,
        broadCastInviteMessage: params.message || '',
        broadcastStartedAt: now,
        broadcastUpdatedAt: now,
      },
      { merge: true }
    );

    // (Optional) trigger emails / feeds via CF if chosen
    // if (params.channels.email) {
    //   const send = this.fns.httpsCallable('sendSolutionBroadcastEmails');
    //   await firstValueFrom(send({ broadcastId }));
    // }

    return broadcastId;
  }

  // === Stop broadcast by solutionId ===
  async stopBroadcastBySolutionId(solutionId: string): Promise<void> {
    // find active broadcast for this solution
    const snap = await firstValueFrom(
      this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref
            .where('solutionId', '==', solutionId)
            .where('active', '==', true)
            .limit(1)
        )
        .get()
    );
    if (snap.empty) {
      // still clear solution mirror if it somehow stayed on
      await this.afs.doc(`solutions/${solutionId}`).set(
        {
          isBroadcasting: false,
          broadcastStatus: 'stopped',
          broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return;
    }

    const doc = snap.docs[0].ref;
    await doc.set(
      {
        active: false,
        status: 'stopped',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await this.afs.doc(`solutions/${solutionId}`).set(
      {
        isBroadcasting: false,
        broadcastStatus: 'stopped',
        broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  // === Read: active broadcasts (for your future page) ===
  listActiveBroadcasts() {
    return this.afs
      .collection<Broadcast>('broadcasts', (ref) =>
        ref.where('active', '==', true).orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'broadcastId' });
  }

  // Active broadcasts → Solutions (convenience)
  listActiveBroadcastSolutions() {
    return this.listActiveBroadcasts().pipe(
      map((bcs) => bcs.map((b) => b.solutionId)),
      switchMap((ids) => this.getSolutionsByIds(ids)) // you already have this helper
    );
  }

  // === Pause / Resume (optional) ===
  async setBroadcastPaused(solutionId: string, paused: boolean): Promise<void> {
    const snap = await firstValueFrom(
      this.afs
        .collection<Broadcast>('broadcasts', (ref) =>
          ref
            .where('solutionId', '==', solutionId)
            .where('active', '==', true)
            .limit(1)
        )
        .get()
    );
    if (snap.empty) return;

    const status = paused ? 'paused' : 'active';
    await snap.docs[0].ref.set(
      {
        status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await this.afs.doc(`solutions/${solutionId}`).set(
      {
        broadcastStatus: status,
        broadcastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  async requestToJoin(
    solutionId: string,
    user: { uid: string; email: string; firstName?: string; lastName?: string },
    message: string
  ): Promise<void> {
    const docRef = this.afs.doc<JoinRequest>(
      `solutions/${solutionId}/joinRequests/${user.uid}`
    );
    const data: JoinRequest = {
      uid: user.uid,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      message: message.trim(),
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await docRef.set(data, { merge: true });

    const notify = this.fns.httpsCallable('notifyJoinRequest');
    try {
      await firstValueFrom(
        notify({
          solutionId,
          requester: {
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
          },
          message: data.message,
        })
      );
    } catch (error) {
      console.error('Failed to notify team about join request', error);
    }
  }

  cancelJoinRequest(solutionId: string, uid: string) {
    const docRef = this.afs.doc<any>(
      `solutions/${solutionId}/joinRequests/${uid}`
    );
    return docRef.set(
      {
        status: 'cancelled',
        cancelledAt: Date.now(),
        updatedAt: Date.now(),
      } as Partial<JoinRequest>,
      { merge: true }
    );
  }

  getJoinRequestForUser(solutionId: string, uid: string) {
    return this.afs
      .doc<JoinRequest>(`solutions/${solutionId}/joinRequests/${uid}`)
      .valueChanges();
  }

  listJoinRequests(solutionId: string) {
    return this.afs
      .collection<JoinRequest>(`solutions/${solutionId}/joinRequests`, (ref) =>
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  listPendingJoinRequests(solutionId: string) {
    return this.afs
      .collection<JoinRequest>(`solutions/${solutionId}/joinRequests`, (ref) =>
        ref.where('status', '==', 'pending').orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  private normalizeParticipants(raw: any): { name: string }[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      // ensure each entry is { name: string }
      return raw
        .map((x: any) =>
          typeof x === 'string'
            ? { name: x }
            : { name: (x?.name || '').toString() }
        )
        .filter((p: any) => (p.name || '').trim());
    }
    // map/object -> array
    return Object.values(raw)
      .map((v: any) => ({
        name: (typeof v === 'string' ? v : v?.name || '').toString(),
      }))
      .filter((p: any) => (p.name || '').trim());
  }

  async approveJoinRequest(
    solutionId: string,
    user: { uid: string; email: string }
  ): Promise<void> {
    const solRef = this.afs.doc(`solutions/${solutionId}`).ref;
    const reqRef = this.afs.doc(
      `solutions/${solutionId}/joinRequests/${user.uid}`
    ).ref;

    await this.afs.firestore.runTransaction(async (tx) => {
      const solSnap = await tx.get(solRef);
      const solData: any = solSnap.exists ? solSnap.data() : {};
      const participants = this.normalizeParticipants(solData.participants);

      const email = (user.email || '').trim().toLowerCase();
      const exists = participants.some(
        (p) => (p.name || '').trim().toLowerCase() === email
      );
      if (!exists) {
        participants.push({ name: email });
      }

      tx.update(solRef, { participants });
      tx.update(reqRef, {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: this.auth.currentUser?.uid || null,
      });
    });
  }
}
