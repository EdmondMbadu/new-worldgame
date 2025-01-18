import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChallengesService {
  constructor(private afs: AngularFirestore) {}
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
  getChallengesByCategory(category: string) {
    return this.afs
      .collection('challenges', (ref) => ref.where('category', '==', category))
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
  deleteChallenge(challengeId: string) {
    return this.afs.doc(`challenges/${challengeId}`).delete();
  }
}
