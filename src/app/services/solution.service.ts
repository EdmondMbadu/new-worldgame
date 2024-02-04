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

  // share(social: string,solution:Solution) {
  //   if (social === 'facebook') {
  //     const facebookUrl = `https://new-worldgame.web.app/solution-view-external/${solution.solutionId}`;
  //     const encodedFacebookUrl = encodeURIComponent(facebookUrl);
  //     const facebookMessage = `Hi! I've recently developed a solution titled ${solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness.`;
  //     const encodedFacebookMessage = encodeURIComponent(facebookMessage);
  //     const url = `https://www.facebook.com/sharer/sharer.php?u=${encodedFacebookUrl}&quote=${encodedFacebookMessage}`;

  //     window.open(url, '_blank');
  //   } else if (social === 'twitter') {
  //     const message = `Hi! I've recently developed a NewWorld Game solution titled ${solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness`;
  //     const encodedMessage = encodeURIComponent(message);
  //     const url = `https://twitter.com/intent/tweet?url=https://new-worldgame.web.app/solution-view-external/${solution.solutionId}&text=${encodedMessage}`;

  //     window.open(url, '_blank');
  //   } else if (social === 'email') {
  //     const url = `mailto:?subject=NewWorld Game Solution Invitation &body=Hi! I've recently developed a solution titled ${solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness! https://new-worldgame.web.app/solution-view-external/${solution.solutionId}`;
  //     window.open(url, '_blank');
  //   } else if (social === 'linkedin') {
  //     const linkedInMessage = `Hi! I've recently developed a solution titled ${solution.title}. I would greatly appreciate your insights and feedback to enhance its effectiveness. Check it out here: https://new-worldgame.web.app/solution-view-external/${solution.solutionId}`;
  //     const encodedLinkedInMessage = encodeURIComponent(linkedInMessage);
  //     const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLinkedInMessage}`;
  //     window.open(url, '_blank');
  //   } else {
  //     this.copyToClipboard();
  //   }
  //   this.addNumShare(solution);
  // }
}
