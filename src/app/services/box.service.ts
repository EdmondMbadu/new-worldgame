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
  userRef: AngularFirestoreDocument<any>;
  constructor(private auth: AuthService, private afs: AngularFirestore) {
    this.userRef = this.afs.doc(`users/${this.auth.currentUser.uid}`);
  }

  toggle() {
    if (this.currentDisplay) {
      this.currentDisplay = false;
      this.display = of(this.currentDisplay);
      console.log('entering here true then ', this.currentDisplay);
    } else {
      this.currentDisplay = true;
      this.display = of(this.display);
      console.log('entering here false then ', this.currentDisplay);
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
    return this.userRef.set(data, { merge: true });
  }
}
