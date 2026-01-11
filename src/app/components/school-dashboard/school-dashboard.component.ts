/* school-dashboard.component.ts */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { combineLatest, firstValueFrom, map, Subscription, switchMap } from 'rxjs';
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
  verified?: boolean | null;
  inRoster?: boolean;
  classNames?: string[];
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
  private rosterStudents: Row[] = [];
  invitedCount = 0;
  verifiedCount = 0;

  // invite modal state (unchanged)
  showInvite = false;
  inviteRaw = '';
  csvName = '';
  inviteError = '';
  sending = false;

  removingEmail: string | null = null;

  // Delete school state
  showDeleteConfirm = false;
  deleting = false;

  private authSub?: Subscription;
  private rosterSub?: Subscription;
  private schoolSub?: Subscription;
  private ownerSub?: Subscription;
  classes: ClassRow[] = [];
  private classesSub?: Subscription;
  private classParticipantsSub?: Subscription;
  private classProfilesSub?: Subscription;
  private classParticipantsById: Record<string, string[]> = {};
  classStudentsById: Record<string, Row[]> = {};
  private classProfileNameByEmail: Record<string, string> = {};
  copiedClassId: string | null = null;
  copyNotice = '';

  constructor(
    public auth: AuthService,
    private afs: AngularFirestore,
    private time: TimeService,
    private router: Router,
    private route: ActivatedRoute,
    private fns: AngularFireFunctions
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
                this.subscribeClassParticipants();
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
                    inRoster: true,
                  }))
                )
              )
              .subscribe((rows) => {
                this.rosterStudents = rows;
                this.invitedCount = rows.length;
                this.verifiedCount = rows.filter((r) => r.verified).length;
                this.refreshStudentsWithClasses();
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
            this.rosterStudents = [];
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
    this.classParticipantsSub?.unsubscribe();
    this.classProfilesSub?.unsubscribe();
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
    // open the generator and carry the schoolId along with class mode
    this.router.navigate(['/generate-challenges'], {
      queryParams: { sid: (this.auth.currentUser as any)?.schoolId, mode: 'class' },
    });
  }

  async deleteClass(c: ClassRow) {
    if (!confirm(`Delete "${c.name}"? This will remove the class from this school.`)) {
      return;
    }

    try {
      const schoolId = (this.auth.currentUser as any)?.schoolId;
      if (!schoolId) throw new Error('No school ID');

      const batch = this.afs.firestore.batch();

      // Delete from school's classes subcollection
      const schoolClassRef = this.afs.firestore.doc(
        `schools/${schoolId}/classes/${c.challengePageId}`
      );
      batch.delete(schoolClassRef);

      // Also delete the main challengePage document
      const challengePageRef = this.afs.firestore.doc(
        `challengePages/${c.challengePageId}`
      );
      batch.delete(challengePageRef);

      await batch.commit();
      console.log('Class deleted successfully');
    } catch (err) {
      console.error('Error deleting class:', err);
      alert('Failed to delete class. Please try again.');
    }
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

      // Get school info for email
      const schoolDoc = await firstValueFrom(
        this.afs.doc(`schools/${admin.schoolId}`).get()
      );
      const schoolData = schoolDoc.data() as any;
      const schoolName = schoolData?.name || 'New World Game School';
      const schoolWebsite = schoolData?.website || schoolData?.meta?.website || '';

      // Build the school page URL
      const schoolPageUrl = `${window.location.origin}/school-admin?sid=${admin.schoolId}`;

      const batch = this.afs.firestore.batch();
      const colRef = this.afs.collection(
        `schools/${admin.schoolId}/students`
      ).ref;

      // Prepare email sending
      const genericEmail = this.fns.httpsCallable('genericEmail');
      const nonUserEmail = this.fns.httpsCallable('nonUserEmail');

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

      // Send emails to all invited students
      const emailPromises = emails.map(async (rawEmail) => {
        const email = rawEmail.toLowerCase().trim();
        if (email.includes('/')) return;

        try {
          // Check if user exists
          const users = await firstValueFrom(
            this.auth.getUserFromEmail(email)
          );

          const adminName = admin.firstName && admin.lastName
            ? `${admin.firstName} ${admin.lastName}`
            : admin.email || 'School Administrator';

          const emailData = {
            email,
            subject: `You've been invited to join ${schoolName} on New World Game`,
            title: `Welcome to ${schoolName}`,
            description: `You have been invited by ${adminName} to join ${schoolName} on New World Game. New World Game is an innovative platform for collaborative problem-solving and learning.`,
            path: schoolPageUrl,
            image: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/emails-hero%2Fhero-college-2.png?alt=media&token=3242573b-13b5-40ef-a29d-8a46f9ed2812',
            author: adminName,
            user: users && users.length > 0
              ? `${users[0].firstName || ''} ${users[0].lastName || ''}`.trim() || email
              : undefined,
          };

          // Use genericEmail if user exists, nonUserEmail if not
          if (users && users.length > 0) {
            await firstValueFrom(genericEmail(emailData));
          } else {
            await firstValueFrom(nonUserEmail(emailData));
          }
        } catch (emailErr) {
          console.error(`Failed to send email to ${email}:`, emailErr);
          // Don't throw - continue with other emails
        }
      });

      // Wait for all emails to be sent (or fail silently)
      await Promise.allSettled(emailPromises);

      this.closeInvite();
    } catch (err: any) {
      console.error(err);
      this.inviteError = err?.message ?? 'Failed to create invites.';
    } finally {
      this.sending = false;
    }
  }

  async removeStudent(row: Row) {
    if (!row.inRoster) {
      return;
    }
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

  private subscribeClassParticipants(): void {
    this.classParticipantsSub?.unsubscribe();

    if (!this.isAdmin || this.classes.length === 0) {
      this.classParticipantsById = {};
      this.subscribeClassProfiles([]);
      this.refreshStudentsWithClasses();
      return;
    }

    const classDocs = this.classes
      .map((c) => ({ id: c.challengePageId, name: c.name }))
      .filter((c) => !!c.id);

    if (classDocs.length === 0) {
      this.classParticipantsById = {};
      this.refreshStudentsWithClasses();
      return;
    }

    this.classParticipantsSub = combineLatest(
      classDocs.map((c) =>
        this.afs
          .doc(`challengePages/${c.id}`)
          .valueChanges()
          .pipe(
            map((page: any) => ({
              classId: c.id,
              participants: Array.isArray(page?.participants)
                ? page.participants
                : [],
            }))
          )
      )
    ).subscribe((entries) => {
      const next: Record<string, string[]> = {};
      const allParticipants: string[] = [];
      entries.forEach((entry) => {
        next[entry.classId] = entry.participants;
        allParticipants.push(...entry.participants);
      });
      this.classParticipantsById = next;
      this.subscribeClassProfiles(allParticipants);
      this.refreshStudentsWithClasses();
    });
  }

  private subscribeClassProfiles(emails: string[]): void {
    this.classProfilesSub?.unsubscribe();

    const normalized = Array.from(
      new Set(emails.map((email) => this.normalizeEmail(email)))
    ).filter((email) => !!email);

    if (!this.isAdmin || normalized.length === 0) {
      this.classProfileNameByEmail = {};
      return;
    }

    const chunks: string[][] = [];
    for (let i = 0; i < normalized.length; i += 10) {
      chunks.push(normalized.slice(i, i + 10));
    }

    this.classProfilesSub = combineLatest(
      chunks.map((chunk) =>
        this.afs
          .collection<User>('users', (ref) =>
            ref.where('email', 'in', chunk)
          )
          .valueChanges()
      )
    ).subscribe((rows) => {
      const next: Record<string, string> = {};
      rows.flat().forEach((user) => {
        const email = this.normalizeEmail(user?.email || '');
        if (!email) return;
        const first = user?.firstName?.trim() ?? '';
        const last = user?.lastName?.trim() ?? '';
        const fullName = `${first} ${last}`.trim();
        if (fullName) {
          next[email] = fullName;
        }
      });
      this.classProfileNameByEmail = next;
      this.refreshStudentsWithClasses();
    });
  }

  private refreshStudentsWithClasses(): void {
    const rosterByEmail = new Map<string, Row>();
    this.rosterStudents.forEach((row) => {
      const email = this.normalizeEmail(row.email);
      if (email) {
        rosterByEmail.set(email, row);
      }
    });

    const classMembershipByEmail: Record<string, string[]> = {};
    const classStudentsById: Record<string, Row[]> = {};

    this.classes.forEach((c) => {
      const classId = c.challengePageId;
      if (!classId) return;

      const rawParticipants = this.classParticipantsById[classId] || [];
      const uniqueEmails = Array.from(
        new Set(rawParticipants.map((email) => this.normalizeEmail(email)))
      ).filter((email) => !!email);

      classStudentsById[classId] = uniqueEmails.map((email) => {
        const rosterRow = rosterByEmail.get(email);
        const profileName = this.classProfileNameByEmail[email];
        return {
          name: rosterRow?.name || profileName || '',
          email,
          verified: rosterRow?.verified ?? null,
          inRoster: !!rosterRow,
        };
      });

      uniqueEmails.forEach((email) => {
        const list = classMembershipByEmail[email] || [];
        if (!list.includes(c.name)) {
          list.push(c.name);
        }
        classMembershipByEmail[email] = list;
      });
    });

    const combinedRows: Row[] = [];
    const seen = new Set<string>();

    this.rosterStudents.forEach((row) => {
      const email = this.normalizeEmail(row.email);
      if (!email || seen.has(email)) return;
      seen.add(email);
      combinedRows.push({
        ...row,
        email,
        inRoster: true,
        classNames: classMembershipByEmail[email] || [],
      });
    });

    Object.keys(classMembershipByEmail).forEach((email) => {
      if (seen.has(email)) return;
      const profileName = this.classProfileNameByEmail[email];
      combinedRows.push({
        name: profileName || this.fallbackNameFromEmail(email),
        email,
        verified: null,
        inRoster: false,
        classNames: classMembershipByEmail[email],
      });
    });

    this.classStudentsById = classStudentsById;
    this.students = combinedRows;
  }

  private normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  private fallbackNameFromEmail(email: string): string {
    const local = (email || '').split('@')[0] || '';
    if (!local) return '';
    return local
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getStudentStatus(row: Row): string {
    if (row.inRoster) {
      return row.verified ? 'Verified' : 'Invited';
    }
    if (row.classNames && row.classNames.length > 0) {
      return 'In class';
    }
    return '—';
  }

  getStudentStatusClasses(row: Row): string {
    if (row.inRoster) {
      return row.verified
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    }
    if (row.classNames && row.classNames.length > 0) {
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
    }
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  }

  formatClassList(row: Row): string {
    return row.classNames && row.classNames.length > 0
      ? row.classNames.join(', ')
      : '—';
  }

  // ===== Delete School Functionality =====
  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  async confirmDelete(): Promise<void> {
    if (this.deleting) return;

    const me = await firstValueFrom(this.auth.user$);
    if (!me?.schoolId) {
      alert('No school ID found.');
      return;
    }

    this.deleting = true;

    try {
      const schoolId = me.schoolId;

      // Get school document to find owner and all admins
      const schoolDoc = await firstValueFrom(
        this.afs.doc(`schools/${schoolId}`).get()
      );
      const schoolData = schoolDoc.data() as SchoolDoc;
      const ownerUid = schoolData?.ownerUid;
      const adminUids = Array.isArray(schoolData?.adminUids)
        ? schoolData.adminUids
        : [];

      // 1. Delete the school document
      await this.afs.doc(`schools/${schoolId}`).delete();

      // 2. Find all users with this schoolId and remove it
      const usersWithSchoolId = await firstValueFrom(
        this.afs
          .collection<User>('users', (ref) =>
            ref.where('schoolId', '==', schoolId).limit(100)
          )
          .get()
      );

      const batch = this.afs.firestore.batch();
      const processedUids = new Set<string>();

      // Update all users found in the query
      usersWithSchoolId.docs.forEach((doc) => {
        const userRef = doc.ref;
        processedUids.add(doc.id);
        batch.update(userRef, {
          schoolId: firebase.firestore.FieldValue.delete(),
          role: 'individual',
        });
      });

      // Also update owner if not already processed
      if (ownerUid && !processedUids.has(ownerUid)) {
        const ownerRef = this.afs.firestore.doc(`users/${ownerUid}`);
        // Use set with merge to avoid errors if document doesn't exist
        batch.set(
          ownerRef,
          {
            schoolId: firebase.firestore.FieldValue.delete(),
            role: 'individual',
          },
          { merge: true }
        );
      }

      // Update all admin users if not already processed
      adminUids.forEach((adminUid) => {
        if (adminUid && !processedUids.has(adminUid)) {
          const adminRef = this.afs.firestore.doc(`users/${adminUid}`);
          batch.set(
            adminRef,
            {
              schoolId: firebase.firestore.FieldValue.delete(),
              role: 'individual',
            },
            { merge: true }
          );
        }
      });

      if (processedUids.size > 0 || ownerUid || adminUids.length > 0) {
        await batch.commit();
      }

      // Close modal and navigate away
      this.showDeleteConfirm = false;
      this.router.navigate(['/home']);
    } catch (err: any) {
      console.error('Error deleting school:', err);
      alert(`Failed to delete school: ${err?.message || 'Unknown error'}`);
    } finally {
      this.deleting = false;
    }
  }

  async removeStudentFromClass(classRow: ClassRow, student: Row): Promise<void> {
    if (!this.isAdmin) return;

    const email = this.normalizeEmail(student.email);
    if (!email || !classRow?.challengePageId) return;

    const ok = confirm(
      `Remove ${email} from "${classRow.name}"?\n\nThey will lose access to this class.`
    );
    if (!ok) return;

    try {
      await this.afs
        .doc(`challengePages/${classRow.challengePageId}`)
        .update({
          participants: firebase.firestore.FieldValue.arrayRemove(email),
        });
    } catch (err) {
      console.error('Failed to remove student from class:', err);
      alert('Failed to remove student from class. Please try again.');
    }
  }

  async copyClassInviteLink(classRow: ClassRow): Promise<void> {
    const schoolId = (this.auth.currentUser as any)?.schoolId || '';
    if (!classRow?.challengePageId) return;

    const url = `/home-challenge/${classRow.challengePageId}${
      schoolId ? `?sid=${schoolId}` : ''
    }`;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      this.copiedClassId = classRow.challengePageId;
      this.copyNotice = `Copied link for "${classRow.name}".`;
      setTimeout(() => {
        if (this.copiedClassId === classRow.challengePageId) {
          this.copiedClassId = null;
        }
        this.copyNotice = '';
      }, 2500);
    } catch (err) {
      console.error('Failed to copy class link:', err);
      alert('Could not copy the class link. Please copy it manually.');
    }
  }
}
