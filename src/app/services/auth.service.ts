import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  AngularFirestoreDocument,
  DocumentReference,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { NewUser, School, User } from '../models/user';
import { TimeService } from './time.service';
import { DemoBooking } from '../models/tournament';
import { serverTimestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<any>;
  email?: Observable<any>;
  currentUser: any = {};
  newUser: NewUser = {};
  logingError?: Observable<any>;
  private redirectUrl: string = '';

  constructor(
    private fireauth: AngularFireAuth,
    private afs: AngularFirestore,
    private router: Router,
    private time: TimeService
  ) {
    this.newUser = {
      firstName: '',
      lastname: '',
      password: '',
      goal: '',
      sdgsSelected: [],
    };
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
  setRedirectUrl(url: string) {
    this.redirectUrl = url;
  }
  getRedirectUrl(): string {
    return this.redirectUrl;
  }

  getCurrentUserPromise() {
    return new Promise((resolve) => {
      this.user$.subscribe((user) => {
        this.currentUser = user;
        resolve(user);
      });
    });
  }

  updateStatusOnline(userId: string) {
    console.log('Updating status online for userId:', userId);
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${userId}`
    );
    const data = {
      status: 'online',
    };
    userRef.set(data, { merge: true });
  }
  updateStatusOffline() {
    console.log(
      'Updating status offline for currentUser UID:',
      this.currentUser?.uid
    );
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
      `users/${this.currentUser.uid}`
    );
    const data = {
      status: 'offline',
    };
    userRef.set(data, { merge: true });
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
    password: string,
    goal: string,
    sdgsSelected: string[]
  ) {
    this.fireauth
      .createUserWithEmailAndPassword(email, password)
      .then(
        (res) => {
          // alert('Registration was Successful');
          this.newUser.success = true;
          this.sendEmailForVerification(res.user);

          this.addNewUser(firstName, lastName, res.user, goal, sdgsSelected);
          // this.router.navigate(['/verify-email']);
        },
        (err) => {
          this.newUser.success = false;
          this.newUser.errorMessage = err.message;
          // alert(err.message);
        }
      )
      .catch((error) => {
        this.newUser.success = false;
        this.newUser.errorMessage = error.message;
        // alert('Something went wrong');
        // this.router.navigate(['/']);
        // ...
      });
  }

  sendEmailForVerification(user: any) {
    user
      .sendEmailVerification()
      .then(
        (res: any) => {
          console.log('verify your email');
          // this.router.navigate(['verify-email']);
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
  getALlUsers() {
    return this.afs.collection<User>(`users`).valueChanges();
  }

  getUserFromEmail(email: string) {
    return this.afs
      .collection<User>(`users`, (ref) => ref.where('email', '==', email))
      .valueChanges();
  }
  getAllOtherUsers(email: string) {
    return this.afs
      .collection<User>(`users`, (ref) =>
        ref.where('email', '!=', email).limit(10)
      )
      .valueChanges();
  }

  addNewUser(
    firstName: string,
    lastName: string,
    user: any,
    goal: string,
    sdgsSelected: string[]
  ) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
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
      status: '',
      profileCredential: '',
      profileDescription: '',
      education: '',
      location: '',
      profilePicture: {},
      dateJoined: this.time.getCurrentDate(),
      contentViews: '0',
      goal: goal,
      sdgsSelected: sdgsSelected,
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
          // this.updateStatusOffline();
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
            // this is the redirect flow here.
            if (this.redirectUrl) {
              this.router.navigateByUrl(this.redirectUrl); // ← replace navigate()
              this.redirectUrl = '';
            } else {
              this.router.navigate(['/home']);
            }
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
  private col = this.afs.collection<DemoBooking>('demoBookings');
  /** Write one booking and return the document reference */
  addDemoScheduled(
    booking: DemoBooking
  ): Promise<DocumentReference<DemoBooking>> {
    return this.col.add({
      ...booking,
      createdAt: serverTimestamp() as any, // keeps clock authority on server
    });
  }

  /** Live list for the admin component, ordered by slot */
  listAll() {
    return this.afs
      .collection<DemoBooking>('demoBookings', (ref) =>
        ref.orderBy('demoDateTime', 'asc')
      )
      .valueChanges({ idField: 'id' });
  }

  addNewUserSchoolAdmin(
    firstName: string,
    lastName: string,
    user: any,
    goal: string,
    sdgsSelected: string[],

    role: 'individual' | 'schoolAdmin' = 'individual',
    schoolId?: string
  ) {
    const userRef: AngularFirestoreDocument<User> = this.afs.doc(
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
      status: '',
      profileCredential: '',
      profileDescription: '',
      education: '',
      location: '',
      profilePicture: {},
      dateJoined: this.time.getCurrentDate(),
      contentViews: '0',
      goal: goal,
      sdgsSelected: sdgsSelected,
      profilePicPath: '',
      role,
      schoolId: schoolId || '',
    };
    return userRef.set(data, { merge: true });
  }
  /** AuthService */
  registerSchool(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    schoolName: string
  ): Promise<void> {
    // ← return a Promise the caller can await
    return this.fireauth
      .createUserWithEmailAndPassword(email, password)
      .then(async (cred) => {
        await this.sendEmailForVerification(cred.user);

        // 1. create school
        const schoolRef = this.afs.collection<School>('schools').doc();
        await schoolRef.set({
          id: schoolRef.ref.id,
          name: schoolName,
          ownerUid: cred.user!.uid,
          createdAt: this.time.getCurrentDate(),
        });

        // 2. create admin user
        await this.addNewUserSchoolAdmin(
          firstName,
          lastName,
          cred.user,
          '',
          [],
          'schoolAdmin',
          schoolRef.ref.id
        );
      })
      .catch((err) => {
        // surface the error to the caller
        throw err;
      });
  }
}
