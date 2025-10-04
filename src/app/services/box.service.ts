import { Injectable, OnInit } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export abstract class BoxService {
  currentDisplay: boolean = false;
  display?: Observable<any> = of(false);
  protected userRef?: AngularFirestoreDocument<any>;

  constructor(protected auth: AuthService, protected afs: AngularFirestore) {
    const uid = this.auth.currentUser?.uid;
    if (uid) {
      this.userRef = this.afs.doc(`users/${uid}`);
    }
    this.auth.user$.subscribe((user) => {
      const nextUid = user?.uid;
      this.userRef = nextUid ? this.afs.doc(`users/${nextUid}`) : undefined;
    });
  }
  formatText(value: string): string {
    if (!value) return '';

    let html = value;
    html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##  (.*?)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#   (.*?)$/gm, '<h1>$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    html = html.replace(/^\* (.*?)(?=\n|$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');

    html = html.replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a class="text-blue-500 underline" target="_blank" href="$2">$1</a>'
    );
    return html.replace(/\n/g, '<br>');
  }

  /** Copy one block as plain + rich HTML */
  copy(text: string): Promise<void> {
    const html = this.formatText(text);

    const item = new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    });

    return navigator.clipboard.write([item]);
  }

  toggle() {
    if (this.currentDisplay) {
      this.currentDisplay = false;
      this.display = of(this.currentDisplay);
      // console.log('entering here true then ', this.currentDisplay);
    } else {
      this.currentDisplay = true;
      this.display = of(this.display);
      // console.log('entering here false then ', this.currentDisplay);
    }
  }
}

@Injectable({
  providedIn: 'root',
})
export class BoxProfileCredential extends BoxService implements OnInit {
  constructor(auth: AuthService, afs: AngularFirestore) {
    super(auth, afs);
  }
  ngOnInit(): void {}
  updateUserProfileCredential(profileCred: string) {
    const data = {
      profileCredential: profileCred,
    };
    if (!this.userRef) {
      return Promise.reject(new Error('User must be logged in.'));
    }
    return this.userRef.set(data, { merge: true });
  }
}

@Injectable({
  providedIn: 'root',
})
export class BoxProfileDescription extends BoxService implements OnInit {
  constructor(auth: AuthService, afs: AngularFirestore) {
    super(auth, afs);
  }
  ngOnInit(): void {}
  updateUserDescription(description: string) {
    const data = {
      profileDescription: description,
    };
    if (!this.userRef) {
      return Promise.reject(new Error('User must be logged in.'));
    }
    return this.userRef.set(data, { merge: true });
  }
}

@Injectable({
  providedIn: 'root',
})
export class BoxEmploymentCredential extends BoxService implements OnInit {
  constructor(auth: AuthService, afs: AngularFirestore) {
    super(auth, afs);
  }
  ngOnInit(): void {}
  updateUserEmploymentCredential(employement: string) {
    const data = {
      employement: employement,
    };
    if (!this.userRef) {
      return Promise.reject(new Error('User must be logged in.'));
    }
    return this.userRef.set(data, { merge: true });
  }
}

@Injectable({
  providedIn: 'root',
})
export class BoxEducationCredential extends BoxService implements OnInit {
  constructor(auth: AuthService, afs: AngularFirestore) {
    super(auth, afs);
  }
  ngOnInit(): void {}
  updateUserEducationCredential(education: string) {
    const data = {
      education: education,
    };
    if (!this.userRef) {
      return Promise.reject(new Error('User must be logged in.'));
    }
    return this.userRef.set(data, { merge: true });
  }
}

@Injectable({
  providedIn: 'root',
})
export class BoxLocationCredential extends BoxService implements OnInit {
  constructor(auth: AuthService, afs: AngularFirestore) {
    super(auth, afs);
  }
  ngOnInit(): void {}
  updateUserLocationCredential(location: string) {
    const data = {
      location: location,
    };
    if (!this.userRef) {
      return Promise.reject(new Error('User must be logged in.'));
    }
    return this.userRef.set(data, { merge: true });
  }
}
