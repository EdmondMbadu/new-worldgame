// school.service.ts (or inside AuthService if you prefer)
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { combineLatest, map, of, switchMap } from 'rxjs';

export interface PendingInvite {
  schoolId: string;
  schoolName: string;
  invitedAt?: string;
  invitedBy?: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class SchoolService {
  constructor(private afs: AngularFirestore) {}

  /** Stream pending invites for a specific email */
  getPendingInvitesForEmail(email: string) {
    return this.afs
      .collectionGroup('students', (ref) =>
        ref.where('email', '==', email).where('verified', '==', false)
      )
      .snapshotChanges()
      .pipe(
        // enrich with schoolId + schoolName
        switchMap((snaps) => {
          if (snaps.length === 0) return of<PendingInvite[]>([]);
          const items$ = snaps.map((a) => {
            const doc = a.payload.doc;
            const data = doc.data() as any;
            const schoolId = doc.ref.parent!.parent!.id;
            // fetch school name
            return this.afs
              .doc(`schools/${schoolId}`)
              .valueChanges()
              .pipe(
                map((s: any) => ({
                  schoolId,
                  schoolName: s?.name ?? '(Unnamed school)',
                  invitedAt: data?.invitedAt,
                  invitedBy: data?.invitedBy,
                  email: data?.email,
                }))
              );
          });
          return combineLatest(items$);
        })
      );
  }

  /** Accept: mark verified + attach user to the school */
  async acceptInvite(opts: {
    schoolId: string;
    email: string;
    uid: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { schoolId, email, uid, firstName = '', lastName = '' } = opts;

    const batch = this.afs.firestore.batch();
    const studentRef = this.afs.doc(
      `schools/${schoolId}/students/${email}`
    ).ref;
    const userRef = this.afs.doc(`users/${uid}`).ref;

    batch.set(
      studentRef,
      { verified: true, uid, firstName, lastName },
      { merge: true }
    );
    batch.set(
      userRef,
      { schoolId, role: 'student', verified: true }, // keep your existing structure
      { merge: true }
    );

    await batch.commit();
  }

  /** Ignore: simply remove the invite row */
  async ignoreInvite(schoolId: string, email: string) {
    await this.afs.doc(`schools/${schoolId}/students/${email}`).delete();
  }
}
