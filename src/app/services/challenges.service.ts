import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChallengesService {
  constructor() {}
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
}
