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
import { NewUser, PlanKey, PRICE_BOOK, School, User } from '../models/user';
import { TimeService } from './time.service';
import { DemoBooking } from '../models/tournament';
import { serverTimestamp } from 'firebase/firestore';
import firebase from 'firebase/compat/app';
// Add this where you keep shared types (optional)

interface RegisterSchoolMeta {
  plan: PlanKey;
  currency: string; // e.g., 'USD'
  extraTeams: number; // integer
  schoolCountry?: string;
  schoolType?: string; // 'Public' | 'Private' | 'IB' | 'Other'
  schoolWebsite?: string;
  courseType?: string;
  coursePurpose?: string;
  specificFocus?: string;
}

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

  async SignIn(email: string, password: string): Promise<void> {
    this.logingError = of(null);
    try {
      const cred = await this.fireauth.signInWithEmailAndPassword(
        email,
        password
      );
      await this.finishInteractiveSignIn(cred.user ?? null);
    } catch (err) {
      this.logingError = of(err);
      throw err;
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.logingError = of(null);
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const cred = await this.fireauth.signInWithPopup(provider);
      if (cred.user) {
        await this.ensureUserProfileDocument(cred.user);
      }
      await this.finishInteractiveSignIn(cred.user ?? null);
    } catch (err) {
      this.logingError = of(err);
      throw err;
    }
  }

  async signInWithFacebook(): Promise<void> {
    this.logingError = of(null);
    const provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('email');
    try {
      const cred = await this.fireauth.signInWithPopup(provider);
      if (cred.user) {
        await this.ensureUserProfileDocument(cred.user);
      }
      await this.finishInteractiveSignIn(cred.user ?? null);
    } catch (err) {
      this.logingError = of(err);
      throw err;
    }
  }

  async signInWithTwitter(): Promise<void> {
    this.logingError = of(null);
    const provider = new firebase.auth.TwitterAuthProvider();
    provider.setCustomParameters({ include_email: 'true' });
    try {
      const cred = await this.fireauth.signInWithPopup(provider);
      if (cred.user) {
        await this.ensureUserProfileDocument(cred.user);
      }
      await this.finishInteractiveSignIn(cred.user ?? null, {
        fallbackVerify: true,
      });
    } catch (err) {
      this.logingError = of(err);
      throw err;
    }
  }

  async signInWithApple(): Promise<void> {
    this.logingError = of(null);
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    provider.setCustomParameters({ locale: 'en_US' });
    try {
      const cred = await this.fireauth.signInWithPopup(provider);
      const givenName =
        (cred.additionalUserInfo?.profile as { given_name?: string } | null)
          ?.given_name || '';
      const familyName =
        (cred.additionalUserInfo?.profile as { family_name?: string } | null)
          ?.family_name || '';
      if (cred.user && !cred.user.displayName && (givenName || familyName)) {
        await cred.user.updateProfile({
          displayName: `${givenName} ${familyName}`.trim(),
        });
      }
      if (cred.user) {
        await this.ensureUserProfileDocument(cred.user);
      }
      await this.finishInteractiveSignIn(cred.user ?? null);
    } catch (err) {
      this.logingError = of(err);
      throw err;
    }
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
    schoolName: string,
    meta?: RegisterSchoolMeta
  ): Promise<void> {
    return this.fireauth
      .createUserWithEmailAndPassword(email, password)
      .then(async (cred) => {
        await this.sendEmailForVerification(cred.user);

        // ---- derive pricing server-side (do NOT trust client) ----
        const plan: PlanKey = meta?.plan ?? 'tournament'; // sensible default
        const basePrice = PRICE_BOOK[plan];
        const extraTeams = Math.max(0, meta?.extraTeams ?? 0);
        const currency = meta?.currency || 'USD';
        const addOns = extraTeams * 30;
        const total = basePrice + addOns;

        // 1) create school doc
        const schoolRef = this.afs.collection('schools').doc();
        await schoolRef.set({
          id: schoolRef.ref.id,
          name: schoolName,
          ownerUid: cred.user!.uid,
          createdAt: this.time.getCurrentDate(),

          // optional metadata
          meta: {
            country: meta?.schoolCountry || null,
            type: meta?.schoolType || null,
            website: meta?.schoolWebsite || null,
            courseType: meta?.courseType || null,
            coursePurpose: meta?.coursePurpose || null,
            specificFocus: meta?.specificFocus || null, // NEW
          },

          // billing snapshot at signup
          billing: {
            plan,
            currency,
            basePrice,
            extraTeams,
            addOns,
            total,
            paymentStatus: basePrice === 0 ? 'paid' : 'pending', // free = auto-paid
            // you can add: checkoutSessionId, provider, etc.
          },
        });

        // 2) create admin user tied to the school
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
        throw err;
      });
  }

  getSchoolDoc(id: string) {
    return this.afs.doc<School>(`schools/${id}`).valueChanges();
  }

  getStudentsInSchool(schoolId: string) {
    return this.afs
      .collection<User>(
        'users',
        (ref) =>
          ref.where('schoolId', '==', schoolId).where('role', '==', 'student') // admins excluded
      )
      .valueChanges();
  }
  // AuthService additions
  async getUid(): Promise<string | null> {
    const u = await this.fireauth.currentUser;
    return u?.uid ?? null;
  }

  async fetchSignInMethods(email: string): Promise<string[]> {
    return this.fireauth.fetchSignInMethodsForEmail(email);
  }

  // Silent sign-in that RETURNS uid and DOES NOT navigate
  async signInForCheckout(email: string, password: string): Promise<string> {
    const cred = await this.fireauth.signInWithEmailAndPassword(
      email,
      password
    );
    return cred.user!.uid;
  }

  async createAuthUserOnly(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<string> {
    const cred = await this.fireauth.createUserWithEmailAndPassword(
      email,
      password
    );
    await this.sendEmailForVerification(cred.user);

    // optional: create a user profile document now
    await this.afs.doc(`users/${cred.user!.uid}`).set(
      {
        uid: cred.user!.uid,
        firstName,
        lastName,
        email,
        role: 'schoolAdmin', // provisional
        createdAt: this.time.getCurrentDate(),
        status: 'pendingPayment',
        dateJoined: this.time.getCurrentDate(),
      },
      { merge: true }
    );

    return cred.user!.uid;
  }
  // Sign-in helpers
  private async finishInteractiveSignIn(
    user: firebase.User | null,
    opts: { fallbackVerify?: boolean } = {}
  ): Promise<void> {
    if (!user) {
      return;
    }

    const providerIds = user.providerData
      .map((p) => p?.providerId)
      .filter((id): id is string => !!id);
    const isSocialProvider = providerIds.some((pid) => pid !== 'password');
    const consideredVerified =
      user.emailVerified || isSocialProvider || opts.fallbackVerify === true;

    if (consideredVerified) {
      await this.markUserVerified(user.uid);
      const dest = this.popRedirect();
      this.router.navigateByUrl(dest);
    } else {
      this.router.navigate(['/verify-email']);
    }
  }

  private async markUserVerified(uid: string): Promise<void> {
    const userRef = this.afs.doc<User>(`users/${uid}`);
    const snap = await userRef.ref.get();
    const data = snap.data();
    if (!data?.verified) {
      await userRef.set({ verified: true } as Partial<User>, { merge: true });
    }
  }

  private async ensureUserProfileDocument(user: firebase.User): Promise<void> {
    const userRef = this.afs.doc<User>(`users/${user.uid}`);
    const snap = await userRef.ref.get();
    const email =
      user.email ||
      user.providerData.find((p) => !!p?.email)?.email ||
      '';
    const displayName = user.displayName?.trim() || '';
    const [firstRaw, ...rest] = displayName.split(' ').filter(Boolean);
    const firstName =
      firstRaw || this.deriveNameFromEmail(email) || 'Creator';
    const lastName = rest.join(' ');

    if (!snap.exists) {
      await userRef.set(
        {
          uid: user.uid,
          email,
          firstName,
          lastName,
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
          goal: '',
          sdgsSelected: [],
          profilePicPath: '',
        },
        { merge: true }
      );
      return;
    }

    const current = snap.data() as User | undefined;
    const updates: Partial<User> = {};

    if (email && !current?.email) {
      updates.email = email;
    }
    if (!current?.firstName && firstName) {
      updates.firstName = firstName;
    }
    if (!current?.lastName && lastName) {
      updates.lastName = lastName;
    }

    if (Object.keys(updates).length) {
      await userRef.set(updates, { merge: true });
    }
  }

  private deriveNameFromEmail(email: string): string {
    if (!email) {
      return '';
    }
    const [localPart] = email.split('@');
    if (!localPart) {
      return '';
    }
    return localPart.replace(/[._-]+/g, ' ').trim();
  }

  // AuthService
  userDoc$(uid: string) {
    return this.afs.doc<any>(`users/${uid}`).valueChanges();
  }

  schoolDoc$(schoolId: string) {
    return this.afs.doc<any>(`schools/${schoolId}`).valueChanges();
  }

  // AuthService
  private popRedirect(): string {
    // 1) in-memory (setRedirectUrl called by guards or components)
    let target = (this.redirectUrl || '').trim();

    // 2) query param on the current URL (e.g. /login?redirectTo=/avatar/albert-einstein)
    if (!target) {
      const tree = this.router.parseUrl(this.router.url);
      const qp = tree.queryParams?.['redirectTo'];
      if (qp) {
        try {
          target = decodeURIComponent(qp);
        } catch {
          target = qp;
        }
      }
    }

    // 3) sessionStorage fallback (survives refresh)
    if (!target) {
      const ss = sessionStorage.getItem('redirectTo');
      if (ss) {
        try {
          target = decodeURIComponent(ss);
        } catch {
          target = ss;
        }
        sessionStorage.removeItem('redirectTo');
      }
    }

    // sanitize + clear
    if (!target || !target.startsWith('/')) target = '/home';
    this.redirectUrl = '';
    return target;
  }
}
