import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService implements OnInit {
  display?: Observable<any>;
  currentDsiplay: boolean = false;
  constructor(private auth: AuthService, private afs: AngularFirestore) {}

  ngOnInit(): void {
    this.display?.subscribe((data) => {
      this.currentDsiplay = data;
    });
  }

  toggle() {
    console.log('enter here', this.currentDsiplay);
    if (this.currentDsiplay) {
      this.currentDsiplay = false;
      this.display = of(this.currentDsiplay);
    } else {
      this.currentDsiplay = true;
      this.display = of(this.currentDsiplay);
    }
  }
  updateUserProfileCredential(profileCred: string) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${this.auth.currentUser.uid}`
    );
    const data = {
      profileCredential: profileCred,
    };
    return userRef.set(data, { merge: true });
  }
  updateUserDescription(description: string) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${this.auth.currentUser.uid}`
    );
    const data = {
      profileCredential: description,
    };
    return userRef.set(data, { merge: true });
  }
}
