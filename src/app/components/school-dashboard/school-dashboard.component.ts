/* school-dashboard.component.ts */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { firstValueFrom, map, Subscription, switchMap } from 'rxjs';
import { User, School } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { TimeService } from 'src/app/services/time.service';
// at the top of school-dashboard.component.ts
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore'; // <-- REQUIRED for firebase.firestore.FieldValue
import { ActivatedRoute, Router } from '@angular/router';

interface Row {
  name: string;
  email: string;
  verified: boolean;
}
interface ClassRow {
  id: string;
  name: string;
  heading?: string;
  logoImage?: string;
  imageChallenge?: string;
  challengePageId: string;
  createdAt?: any;
}
interface SchoolDoc {
  name?: string;
  ownerUid?: string;
  adminUids?: string[];
  website?: string; // support flat form
  meta?: { website?: string; country?: string; type?: string } | any; // nested
}
@Component({
  selector: 'app-school-dashboard',
  templateUrl: './school-dashboard.component.html',
})
export class SchoolDashboardComponent implements OnInit, OnDestroy {
  schoolName = '';
  schoolWebsite = '';

  ownerName = '';
  ownerEmail = '';

  isAdmin = false;

  students: Row[] = [];
  invitedCount = 0;
  verifiedCount = 0;

  // invite modal state (unchanged)
  showInvite = false;
  inviteRaw = '';
  csvName = '';
  inviteError = '';
  sending = false;

  removingEmail: string | null = null;

  private authSub?: Subscription;
  private rosterSub?: Subscription;
  private schoolSub?: Subscription;
  private ownerSub?: Subscription;
  classes: ClassRow[] = [];
  private classesSub?: Subscription;

  constructor(
    public auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authSub = this.auth.user$.subscribe(async (me) => {
      if (!me?.schoolId) return;

      // ── Load school meta (name, website, owner/admins) ───────────────────
      this.schoolSub?.unsubscribe();
      this.schoolSub = this.afs
        .doc<SchoolDoc>(`schools/${me.schoolId}`)
        .valueChanges()
        .subscribe(async (school) => {
          console.log('current school', school);

          this.schoolName = school?.name ?? '';

          // Prefer top-level website, fallback to meta.website
          const rawSite =
            school?.website ?? (school as any)?.meta?.website ?? '';

          // normalize (add https:// if missing)
          this.schoolWebsite =
            rawSite && !/^https?:\/\//i.test(rawSite)
              ? `https://${rawSite}`
              : rawSite;

          const ownerUid = school?.ownerUid ?? '';
          const admins = Array.isArray(school?.adminUids)
            ? school!.adminUids!
            : [];
          this.isAdmin =
            !!me.uid && (me.uid === ownerUid || admins.includes(me.uid));
          if (me?.schoolId) {
            this.classesSub?.unsubscribe();
            this.classesSub = this.afs
              .collection(`schools/${me.schoolId}/classes`, (ref) =>
                ref.orderBy('createdAt', 'desc')
              )
              .valueChanges({ idField: 'id' })
              .subscribe((rows: any[]) => {
                this.classes = rows.map((r) => ({
                  id: r.id,
                  name: r.name ?? '—',
                  heading: r.heading ?? '',
                  logoImage: r.logoImage ?? '',
                  imageChallenge: r.imageChallenge ?? '',
                  challengePageId: r.challengePageId,
                  createdAt: r.createdAt ?? null,
                }));
              });
          }
          // Owner profile (if readable)
          this.ownerSub?.unsubscribe();
          if (ownerUid) {
            this.ownerSub = this.afs
              .doc<User>(`users/${ownerUid}`)
              .valueChanges()
              .subscribe((owner) => {
                const first = owner?.firstName?.trim() ?? '';
                const last = owner?.lastName?.trim() ?? '';
                this.ownerName = first || last ? `${first} ${last}`.trim() : '';
                this.ownerEmail = owner?.email ?? '';
              });
          } else {
            this.ownerName = '';
            this.ownerEmail = '';
          }

          // … roster logic unchanged …

          // ── Roster handling ───────────────────────────────────────────────
          this.rosterSub?.unsubscribe();

          if (this.isAdmin) {
            // Admin: subscribe to students and show full roster
            this.rosterSub = this.afs
              .collection(`schools/${me.schoolId}/students`)
              .valueChanges({ idField: 'id' })
              .pipe(
                map((docs: any[]) =>
                  docs.map((d) => ({
                    name: d.firstName
                      ? `${d.firstName} ${d.lastName}`.trim()
                      : '',
                    email: d.email,
                    verified: !!d.verified,
                  }))
                )
              )
              .subscribe((rows) => {
                this.students = rows;
                this.invitedCount = rows.length;
                this.verifiedCount = rows.filter((r) => r.verified).length;
              });
          } else {
            // Student: do NOT read identities; get counts only
            const col = this.afs.firestore.collection(
              `schools/${me.schoolId}/students`
            );
            const [allSnap, verifiedSnap] = await Promise.all([
              col.get(),
              col.where('verified', '==', true).get(),
            ]);
            this.students = []; // keep empty to avoid accidental rendering
            this.invitedCount = allSnap.size;
            this.verifiedCount = verifiedSnap.size;
          }
        });
    });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.schoolSub?.unsubscribe();
    this.ownerSub?.unsubscribe();
    this.rosterSub?.unsubscribe();
    this.classesSub?.unsubscribe();
  }

  /* ───────── invite modal helpers ───────── */
  inviteStudent() {
    this.showInvite = true;
  }
  closeInvite() {
    this.showInvite = false;
    this.inviteRaw = this.csvName = this.inviteError = '';
  }

  private parseEmails(raw: string): string[] {
    return raw
      .split(/[\s,;\n]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(e));
  }

  loadCsv(evt: Event) {
    const f = (evt.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.csvName = f.name;
    const r = new FileReader();
    r.onload = () => (this.inviteRaw += '\n' + r.result);
    r.readAsText(f);
  }

  // optional: put near other helpers
  toDate(d: any): Date | null {
    if (!d) return null;
    // Firestore Timestamp
    if (typeof d.toDate === 'function') return d.toDate();
    // {seconds, nanoseconds}
    if (typeof d.seconds === 'number') {
      return new Date(
        d.seconds * 1000 + Math.floor((d.nanoseconds || 0) / 1e6)
      );
    }
    // JS Date
    if (d instanceof Date) return d;
    // ISO/string/number
    const t = Date.parse(String(d));
    return Number.isNaN(t) ? null : new Date(t);
  }

  createClass() {
    // open the generator and carry the schoolId along
    this.router.navigate(['/generate-challenges'], {
      queryParams: { sid: (this.auth.currentUser as any)?.schoolId },
    });
  }

  async sendInvites() {
    const emails = Array.from(new Set(this.parseEmails(this.inviteRaw)));
    if (emails.length === 0) {
      this.inviteError = 'Enter at least one email.';
      return;
    }

    this.inviteError = '';
    this.sending = true;

    try {
      const admin = await firstValueFrom(this.auth.user$); // ← key change
      if (!admin?.schoolId) throw new Error('schoolId missing');

      const batch = this.afs.firestore.batch();
      const colRef = this.afs.collection(
        `schools/${admin.schoolId}/students`
      ).ref;

      emails.forEach((rawEmail) => {
        const email = rawEmail.toLowerCase().trim();
        // Firestore doc IDs cannot contain "/" — everything else (like "." or "@") is fine.
        if (email.includes('/')) return;

        const doc = colRef.doc(email); // doc-id = email
        batch.set(
          doc,
          {
            email,
            invitedBy: admin.uid,
            invitedAt: this.time.getCurrentDate(),
            verified: false,
          },
          { merge: true }
        );
      });

      await batch.commit();
      this.closeInvite();
    } catch (err: any) {
      console.error(err);
      this.inviteError = err?.message ?? 'Failed to create invites.';
    } finally {
      this.sending = false;
    }
  }

  async removeStudent(row: Row) {
    const ok = confirm(
      `Remove ${row.email} from this school?\n\nThey will no longer appear in the roster.`
    );
    if (!ok) return;

    try {
      this.removingEmail = row.email;

      const admin = await firstValueFrom(this.auth.user$);
      if (!admin?.schoolId) throw new Error('schoolId missing');

      const schoolId = admin.schoolId;
      const batch = this.afs.firestore.batch();

      // 1) delete from roster (doc-id = email)
      const rosterRef = this.afs.firestore.doc(
        `schools/${schoolId}/students/${row.email}`
      );
      batch.delete(rosterRef);

      // 2) find the user by email (if they have a users/* doc)
      const usersSnap = await firstValueFrom(
        this.afs
          .collection<User>('users', (ref) =>
            ref.where('email', '==', row.email.toLowerCase()).limit(1)
          )
          .get()
      );

      if (!usersSnap.empty) {
        const userDoc = usersSnap.docs[0];
        const userRef = userDoc.ref;
        const currentSchoolId = userDoc.get('schoolId');

        // only clear if they still point to THIS school (don’t wipe newer memberships)
        if (currentSchoolId === schoolId) {
          batch.update(userRef, {
            schoolId: firebase.firestore.FieldValue.delete(),
            // optionally clear role/status if they’re school-scoped:
            // role: firebase.firestore.FieldValue.delete(),
            // status: firebase.firestore.FieldValue.delete(),
          });
        }
      }

      await batch.commit();
    } catch (err) {
      console.error(err);
      alert('Failed to remove student. Please try again.');
    } finally {
      this.removingEmail = null;
    }
  }
}
