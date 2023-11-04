import { Injectable } from '@angular/core';
import {
  AngularFirestoreDocument,
  AngularFirestore,
} from '@angular/fire/compat/firestore';
import { Solution } from '../models/solution';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import { Observable } from 'rxjs';
import { User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class SolutionService {
  title: string = '';
  solutionId: string = '';
  solutionRef?: Observable<Solution>;
  userRef: AngularFirestoreDocument<any>;
  allSolutions: Solution[] = [];
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService
  ) {
    this.userRef = this.afs.doc(`users/${this.auth.currentUser.uid}`);
  }
  createdNewSolution(
    title: string,
    description: string,
    participants: any,
    endDate: string
  ) {
    let formatedDate = this.time.formatDateString(endDate);
    this.solutionId = this.afs.createId().toString();
    const data = {
      solutionId: this.solutionId,
      title: title,
      authorAccountId: this.auth.currentUser.uid,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      authorEmail: this.auth.currentUser.email,
      description: description,
      participants: participants,
      endDate: endDate,
      authorProfileCredential: this.auth.currentUser.profileCredential,
      endDateFormatted: formatedDate,
      creationDate: this.time.todaysDate(),
      views: '1',
      likes: '0',
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `users/${this.auth.currentUser.uid}/solutions/${data.solutionId}`
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
    participantId: string
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
      views: '1',
      likes: '0',
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `users/${participantId}/solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  getSolution(solutionId: string) {
    return this.afs
      .doc<Solution>(
        `users/${this.auth.currentUser.uid}/solutions/${solutionId}`
      )
      .valueChanges();
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
      `users/${solution.authorAccountId}/solutions/${solution.solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  getThisUserSolution(uid: string, solutionId: string) {
    return this.afs
      .doc<Solution>(`users/${uid}/solutions/${solutionId}`)
      .valueChanges();
  }

  getAuthenticatedUserAllSolutions() {
    return this.afs
      .collection<Solution>(`users/${this.auth.currentUser.uid}/solutions/`)
      .valueChanges();
  }
  getAllSolutionsOfThisUser(uid: string) {
    return this.afs
      .collection<Solution>(`users/${uid}/solutions/`)
      .valueChanges();
  }

  getAllSolutionsFromAllAccounts() {
    // const allSolutionsRef = this.afs
    //   .collectionGroup<Solution>(`solutions`)
    //   .valueChanges();
    //   allSolutionsRef.
    return this.afs.collectionGroup<Solution>(`solutions`).valueChanges();
  }

  updateFeedbackRequestAfterEvaluation(
    feedbackRequest: any,
    solutionId: string
  ) {
    const data = {
      feedbackRequest: feedbackRequest,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `users/${this.auth.currentUser.uid}/solutions/${solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  addEvaluation(evaluation: any, n: string, uid: string, solutionId: string) {
    const data = {
      evaluation: evaluation,
      numberofTimesEvaluated: n,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `users/${uid}/solutions/${solutionId}`
    );
    return solutionRef.set(data, { merge: true });
  }
  populateArrayOfSolutions() {}
  saveSolutionStatus(solutionId: string, status: any) {
    const data = {
      status: status,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `users/${this.auth.currentUser.uid}/solutions/${solutionId}`
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
      `users/${this.auth.currentUser.uid}/solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }

  sendSolutionRequestForEvaluation(
    participantId: string,
    solutionId: string,
    feedbackRequest: any
  ) {
    const data = {
      feedbackRequest: feedbackRequest,
    };
    const solutionRef: AngularFirestoreDocument<Solution> = this.afs.doc(
      `users/${participantId}/solutions/${solutionId}`
    );

    return solutionRef.set(data, { merge: true });
  }
}
