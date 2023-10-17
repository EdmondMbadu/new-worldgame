import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AuthService } from './auth.service';
import { Post } from '../models/post';

@Injectable({
  providedIn: 'root',
})
export class PlaygroundService {
  title: string = '';
  userRef: AngularFirestoreDocument<any>;
  constructor(private auth: AuthService, private afs: AngularFirestore) {
    this.userRef = this.afs.doc(`users/${this.auth.currentUser.uid}`);
  }
  newPost() {
    const data = {
      postid: this.afs.createId().toString(),
    };
    const clientRef: AngularFirestoreDocument<Post> = this.afs.doc(
      `users/${this.auth.currentUser.uid}/posts/${data.postid}`
    );
    return clientRef.set(data, { merge: true });
  }
}
