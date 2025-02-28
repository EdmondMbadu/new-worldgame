import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { ChallengePage } from '../models/user';
import { AuthService } from './auth.service';
import { TimeService } from './time.service';
import { SolutionService } from './solution.service';

@Injectable({
  providedIn: 'root',
})
export class ChallengesService {
  constructor(
    private afs: AngularFirestore,
    private auth: AuthService,
    private time: TimeService,
    private solution: SolutionService
  ) {}
  private selectedChallengeItemSource = new BehaviorSubject<any>(null);
  selectedChallengeItem$ = this.selectedChallengeItemSource.asObservable();

  setSelectedChallengeItem(challengeItem: any) {
    this.selectedChallengeItemSource.next(challengeItem);
    this.saveSelectedChallengeItemToStorage(challengeItem);
  }
  saveSelectedChallengeItemToStorage(challengeItem: any) {
    localStorage.setItem(
      'selectedChallengeItem',
      JSON.stringify(challengeItem)
    );
  }

  getSelectedChallengeItemFromStorage() {
    const storedItem = localStorage.getItem('selectedChallengeItem');
    return storedItem ? JSON.parse(storedItem) : null;
  }
  clearSelectedChallengeItem() {
    this.selectedChallengeItemSource.next(null);
    localStorage.removeItem('selectedChallengeItem');
  }
  getAllChallenges() {
    return this.afs.collection('challenges').valueChanges(); // Retrieves all challenges
  }
  // getThisUserChallenges(
  //   userId: string,
  // ): Observable<any[]> {
  //   if (userId) {
  //     return this.afs
  //       .collection('user-challenges', (ref) =>
  //         ref.where('authorId', '==', userId)
  //       )
  //       .valueChanges();
  //   } else {
  //     // Return an empty array if the user is not authenticated
  //     return of([]);
  //   }
  // }

  getThisUserChallenges(
    userId: string,
    challengePageId: string
  ): Observable<any[]> {
    if (userId) {
      return this.afs
        .collection('user-challenges', (ref) =>
          ref
            .where('authorId', '==', userId)
            .where('challengePageId', '==', challengePageId)
        )
        .valueChanges();
    } else {
      // Return an empty array if the user is not authenticated
      return of([]);
    }
  }

  getChallengeById(challengeId: string) {
    return this.afs.doc(`challenges/${challengeId}`).valueChanges();
  }

  getChallengesByCategory(category: string) {
    return this.afs
      .collection('challenges', (ref) => ref.where('category', '==', category))
      .valueChanges();
  }
  getUserChallengesByCategory(category: string) {
    return this.afs
      .collection('user-challenges', (ref) =>
        ref.where('category', '==', category)
      )
      .valueChanges();
  }
  extractCategories() {
    this.afs
      .collection('challenges')
      .valueChanges()
      .subscribe((challenges: any[]) => {
        // Extract categories and ensure uniqueness
        const uniqueCategories = Array.from(
          new Set(challenges.map((challenge) => challenge.category))
        );
        return uniqueCategories;
      });
  }
  extractUserCategories() {
    this.afs
      .collection('user-challenges')
      .valueChanges()
      .subscribe((challenges: any[]) => {
        // Extract categories and ensure uniqueness
        const uniqueCategories = Array.from(
          new Set(challenges.map((challenge) => challenge.category))
        );
        return uniqueCategories;
      });
  }

  addChallenge(challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string;
  }) {
    const challengeRef: AngularFirestoreDocument<any> = this.afs.doc(
      `challenges/${challenge.id}`
    );
    const data = {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      category: challenge.category,
      image: challenge.image,
    };
    return challengeRef.set(data, { merge: true });
  }
  addUserChallenge(challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string;
    challengePageId: any;
  }): Promise<void> {
    const user = this.auth.currentUser;
    if (user && user.uid) {
      const challengeRef: AngularFirestoreDocument<any> = this.afs.doc(
        `user-challenges/${challenge.id}`
      );
      const data = {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        image: challenge.image,
        authorId: user.uid,
        challengePageId: challenge.challengePageId,
      };
      return challengeRef.set(data, { merge: true });
    } else {
      // Reject the promise if the user is not authenticated
      return Promise.reject('User not authenticated');
    }
  }

  addParticipantToChallengePage(challengeId: string, participants: string[]) {
    const challengeRef: AngularFirestoreDocument<any> = this.afs.doc(
      `challengePages/${challengeId}`
    );
    const data = {
      participants: participants,
    };
    return challengeRef.set(data, { merge: true });
  }
  deleteChallenge(challengeId: string) {
    return this.afs.doc(`challenges/${challengeId}`).delete();
  }
  deleteUserChallenge(challengeId: string) {
    return this.afs.doc(`user-challenges/${challengeId}`).delete();
  }
  async createChallengePage(challengePage: ChallengePage): Promise<void> {
    const user = this.auth.currentUser;
    if (user && user.uid) {
      const data = {
        challengePageId: challengePage.challengePageId,
        name: challengePage.name,
        heading: challengePage.heading,
        subHeading: challengePage.subHeading,
        description: challengePage.description,
        imageChallenge: challengePage.imageChallenge,
        logoImage: challengePage.logoImage,
        authorId: user.uid,
        restricted: challengePage.restricted,
        participants: challengePage.participants,
        creationDate: this.time.todaysDate(),
      };

      const challengePageRef: AngularFirestoreDocument<ChallengePage> =
        this.afs.doc(`challengePages/${challengePage.challengePageId}`);

      await challengePageRef.set(data, { merge: true });
      // Asynchronously create the meeting link without awaiting
      this.solution
        .createMeetLink(challengePage.challengePageId!, challengePage.name!)
        .toPromise()
        .then((dataMeeting) => {
          const meetLink = dataMeeting.hangoutLink;
          console.log('Meeting link', meetLink);

          // Update the Firestore document with the meetLink
          return challengePageRef.update({ meetLink });
        })
        .catch((error) => {
          console.error('Error creating meeting link:', error);
          // Optionally handle the error, e.g., notify the user or retry
        });

      // Optionally return the solution data or a confirmation
      // return {
      //   status: 'Solution created. Meeting link is being generated.',
      // };
    } else {
      // Reject the promise if the user is not authenticated
      return Promise.reject('User not authenticated');
    }
  }
  getAllChallengePagesByThisUser(): Observable<ChallengePage[]> {
    const user = this.auth.currentUser;
    if (user && user.uid) {
      const currentUserId = user.uid;
      return this.afs
        .collection<ChallengePage>('challengePages', (ref) =>
          ref.where('authorId', '==', currentUserId)
        )
        .valueChanges();
    } else {
      // Return an empty array if the user is not authenticated
      return of([]);
    }
  }

  // Get all challengePages where this user is participant
  getAllChallengesWhereUserIsParticipant(): Observable<ChallengePage[]> {
    const user = this.auth.currentUser;
    if (user && user.email) {
      const currentUserEmail = user.email;
      return this.afs
        .collection<ChallengePage>('challengePages', (ref) =>
          ref.where('participants', 'array-contains', currentUserEmail)
        )
        .valueChanges();
    } else {
      // Return an empty array if the user is not authenticated or no email
      return of([]);
    }
  }

  getChallengePageById(challengePageId: string) {
    return this.afs.doc(`challengePages/${challengePageId}`).valueChanges();
  }
  deleteChallengePage(challengePageId: string): Promise<void> {
    const challengePageRef: AngularFirestoreDocument<ChallengePage> =
      this.afs.doc(`challengePages/${challengePageId}`);

    return challengePageRef.delete();
  }
}
