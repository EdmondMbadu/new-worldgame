import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { User } from '../models/user';
import { TimeService } from './time.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<any>;
  email?: Observable<any>;
  currentUser: any = {};
  logingError?: Observable<any>;

  constructor(
    private fireauth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private time: TimeService
  ) {
    this.user$ = this.fireauth.authState.pipe(
      switchMap((user) => {
        if (user) {
          this.email = of(user.email);
          return this.afs.doc<User>(`users/${user.uid}`).valueChanges();
        } else {
          return of(null);
        }
      })
    );
    this.getCurrentUser();
  }

  getCurrentUser() {
    this.user$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  getObservableUser() {
    return this.user$;
  }
  register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) {
    this.fireauth
      .createUserWithEmailAndPassword(email, password)
      .then(
        (res) => {
          alert('Registration was Successful');
          this.sendEmailForVerification(res.user);

          this.addNewUser(firstName, lastName, res.user);
          this.router.navigate(['/verify-email']);
        },
        (err) => {
          alert(err.message);
        }
      )
      .catch((error) => {
        alert('Something went wrong');
        this.router.navigate(['/']);
        // ...
      });
  }

  sendEmailForVerification(user: any) {
    user
      .sendEmailVerification()
      .then(
        (res: any) => {
          this.router.navigate(['verify-email']);
        },
        (err: any) => {
          alert('Something went wrong. Unable to send you an email');
        }
      )
      .catch((error: any) => {
        alert('Something went wrong');
        this.router.navigate(['/']);
        // ...
      });
  }
  getAUser(uid: string) {
    return this.afs.doc<User>(`users/${uid}`).valueChanges();
  }

  getUserFromEmail(email: string) {
    return this.afs
      .collection<User>(`users`, (ref) => ref.where('email', '==', email))
      .valueChanges();
  }

  addNewUser(firstName: string, lastName: string, user: any) {
    const userRef: AngularFirestoreDocument<any> = this.afs.doc(
      `users/${user.uid}`
    );
    const data = {
      uid: user.uid,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
      followers: '0',
      following: '0',
      employement: '',
      profileCredential: '',
      profileDescription: '',
      education: '',
      location: '',
      profilePicture: {},
      dateJoined: this.time.getCurrentDate(),
      contentViews: '0',
      profilePicPath: '',
    };
    return userRef.set(data, { merge: true });
  }

  logout() {
    this.email = of('');
    this.fireauth
      .signOut()
      .then(
        () => {
          this.router.navigate(['/']);
        },
        (err) => {
          alert(err.message);
        }
      )
      .catch((error) => {
        alert('Something went wrong');
        this.router.navigate(['/']);
        // ...
      });
  }

  SignIn(email: string, password: string) {
    this.fireauth
      .signInWithEmailAndPassword(email, password)
      .then(
        (res) => {
          if (res.user?.emailVerified == true) {
            this.router.navigate(['/home']);
          } else {
            this.router.navigate(['/verify-email']);
          }
        },
        (err) => {
          // alert('Something went wrong');
          this.logingError = of(err);
          // this.router.navigate(['/']);
        }
      )
      .catch((error) => {
        // alert('Something went wrong');
        this.logingError = of(error);
        // this.router.navigate(['/']);
        // ...
      });
  }

  forgotPassword(email: string) {
    this.fireauth
      .sendPasswordResetEmail(email)
      .then(
        () => {
          this.router.navigate(['verify-email']);
        },
        (err) => {
          alert('Something went wrong');
        }
      )
      .catch((error) => {
        alert('Something went wrong');
        this.router.navigate(['/']);
        // ...
      });
  }
}
