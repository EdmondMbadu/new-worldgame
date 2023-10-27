import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Observable, of } from 'rxjs';
import { ActiveDescendantKeyManager } from '@angular/cdk/a11y';
import { Avatar, User } from '../models/user';

@Injectable({
  providedIn: 'root',
})
export class DataService implements OnInit {
  constructor(private auth: AuthService, private afs: AngularFirestore) {}

  ngOnInit(): void {}

  uploadPictureToCloudStorage(user: User, avatar: Avatar) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const data = {
      profilePicture: avatar,
    };
    return userRef.set(data, { merge: true });
  }
  getAllUsers() {
    return this.afs.collection<User>(`users`).valueChanges();
  }
}
