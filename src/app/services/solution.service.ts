import { Injectable } from '@angular/core';
import {
  AngularFirestoreDocument,
  AngularFirestore,
} from '@angular/fire/compat/firestore';
import { Evaluation, Solution } from '../models/solution';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import { Observable } from 'rxjs';
import { User } from '../models/user';
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
  constructor(
    private auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService
  ) {}

  createdNewSolution(
    title: string,
    description: string,
    participants: any,
    evaluators: any,
    endDate: string,

    sdgs: string[]
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
      evaluators: evaluators,
      endDate: endDate,
      authorProfileCredential: this.auth.currentUser.profileCredential,
      endDateFormatted: formatedDate,
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
    return this.afs
      .collection<Solution>(`solutions`, (ref) =>
        ref.where('evaluators', 'array-contains', {
          name: this.auth.currentUser.email,
        })
      )
      .valueChanges();
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

  populateArrayOfSolutions() {}
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
  updateSolutionTitle(solutionId: string, title: string) {
    const data = {
      title: title,
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
}
