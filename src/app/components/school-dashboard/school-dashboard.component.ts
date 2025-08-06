/* school-dashboard.component.ts */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { firstValueFrom, map, Subscription, switchMap } from 'rxjs';
import { User, School } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { TimeService } from 'src/app/services/time.service';

interface Row {
  name: string;
  email: string;
  verified: boolean;
}
interface SchoolDoc {
  name?: string;
  website?: string;
  ownerUid?: string;
  adminUids?: string[]; // optional; for future multiple admins
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

  constructor(
    public auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService
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
          this.schoolName = school?.name ?? '';
          this.schoolWebsite = school?.website ?? '';

          const ownerUid = school?.ownerUid ?? '';
          const admins = Array.isArray(school?.adminUids)
            ? school!.adminUids!
            : [];

          this.isAdmin =
            !!me.uid && (me.uid === ownerUid || admins.includes(me.uid));

          // Load owner’s profile (name/email)
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

      // subcollection doc-id is the email
      await this.afs
        .doc(`schools/${admin.schoolId}/students/${row.email}`)
        .delete();

      // If you also keep a reverse index (e.g., users/{uid}.schoolId),
      // you could clear it here. For invites-only rows there’s no user doc yet.
    } catch (err) {
      console.error(err);
      alert('Failed to remove student. Please try again.');
    } finally {
      this.removingEmail = null;
    }
  }
}
