import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService,
    private time: TimeService,
    private data: DataService,
    private fns: AngularFireFunctions,
    private afs: AngularFirestore //
  ) {}
  searchTerm: string = '';
  showActionDropDown: boolean = false;
  userDetails: boolean[] = [];
  showSolutions: boolean[] = [];
  userSolutions: Solution[] = [];
  userFinishedSolutions: Solution[] = [];
  userUnfinishedSolutions: Solution[] = [];
  allUsers: User[] = [];
  everySolution: Solution[] = [];

  // Unsubscribes state
  unsubscribedRows: Array<{ email: string; reason?: string; updatedAt: Date }> =
    [];
  unsubscribedEmails: string[] = [];
  unsubSet = new Set<string>();

  // UI toggle: default = respect unsubscribes (do NOT send to them)
  disregardUnsubs = false;

  // Normalize helper
  private normalizeEmail(e: unknown): string {
    return String(e || '')
      .trim()
      .toLowerCase();
  }

  // Convenience
  isUnsubscribed(email?: string | null): boolean {
    return email ? this.unsubSet.has(this.normalizeEmail(email)) : false;
  }

  private userDirectory = new Map<string, { name: string; email: string }>();

  selected = new Set<string>(); // emails
  allSelected = false;
  // ===== State for reminders =====
  reminderOpen = false;
  sending = false;
  targetMode: 'selected' | 'all' = 'selected';

  reminderSubject = 'Your weekly NewWorld Game progress';
  reminderIntroHtml =
    '<p>Keep the momentum going—here are your in-progress solutions.</p>';

  // component.ts
  solutionTab: ('all' | 'finished' | 'unfinished')[] = [];
  toggleSolutions(email: string, i: number) {
    // Load data first
    this.findSolutionsByEmail(email, i);

    // Toggle ONLY here
    this.showSolutions = this.showSolutions.map(
      (open, idx) => (idx === i ? !open : false) // optional: close others; use just "!open" if you want multiple open
    );

    if (!this.solutionTab[i]) this.solutionTab[i] = 'all';
  }

  setSolutionTab(i: number, tab: 'all' | 'finished' | 'unfinished') {
    this.solutionTab[i] = tab;
  }

  ngOnInit(): void {
    this.auth.getALlUsers().subscribe((data) => {
      this.allUsers = data.sort((a, b) => {
        const dateA = this.data.parseDateMMDDYYYY(a.dateJoined!);
        const dateB = this.data.parseDateMMDDYYYY(b.dateJoined!);
        return dateB - dateA; // descending
      });

      // Build directory: email -> {name,email}
      this.userDirectory.clear();
      for (const u of this.allUsers) {
        const email = (u.email || '').trim().toLowerCase();
        if (!email) continue;
        const first = (u.firstName || '').trim();
        const last = (u.lastName || '').trim();
        const fullName =
          first || last
            ? `${first} ${last}`.trim()
            : (u.firstName || '').trim();
        this.userDirectory.set(email, {
          name: fullName || email,
          email,
        });
      }
      this.userDetails = Array.from(
        { length: this.allUsers.length },
        () => false
      );
      this.showSolutions = Array.from(
        { length: this.allUsers.length },
        () => false
      );

      // fetch solutions
      this.solution.getAllSolutionsFromAllAccounts().subscribe((solutions) => {
        this.everySolution = solutions;
        // do your existing logic for counting solutions, etc.
        for (let user of this.allUsers) {
          let solutionCount = 0;
          let solutionSubmittedCount = 0;
          const normalizedUserEmail = user.email!.trim().toLowerCase();

          for (let sol of this.everySolution) {
            if (sol.participants && Array.isArray(sol.participants)) {
              const isParticipant = sol.participants.some(
                (p: { name: string }) =>
                  p.name.trim().toLowerCase() === normalizedUserEmail
              );
              if (isParticipant) {
                solutionCount++;
                if (sol.finished === 'true') {
                  solutionSubmittedCount++;
                }
              }
            }
          }
          user.tempSolutionstarted = solutionCount.toString();
          user.tempSolutionSubmitted = solutionSubmittedCount.toString();
        }
      });
    });

    this.subscribeUnsubscribes();
  }

  // A simple computed property that filters users by the search term.
  get filteredUsers(): User[] {
    if (!this.searchTerm.trim()) {
      return this.allUsers;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.allUsers.filter((user) => {
      const first = user.firstName?.toLowerCase() || '';
      const last = user.lastName?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return (
        first.includes(lowerTerm) ||
        last.includes(lowerTerm) ||
        email.includes(lowerTerm)
      );
    });
  }

  toggleUserDetails(index: number) {
    this.userDetails[index] = !this.userDetails[index];
  }
  public findSolutionsByEmail(email: string, index: number) {
    const normalizedEmail = email.trim().toLowerCase();
    this.userSolutions = this.everySolution.filter(
      (solution) =>
        solution.participants &&
        Array.isArray(solution.participants) &&
        solution.participants.some(
          (participant: { name: string }) =>
            participant.name.trim().toLowerCase() === normalizedEmail
        )
    );
    this.userFinishedSolutions = this.userSolutions.filter(
      (solution) => solution.finished === 'true'
    );
    this.userUnfinishedSolutions = this.userSolutions.filter(
      (solution) => solution.finished !== 'true'
    );

    // ❌ remove this — it caused double toggle
    // this.toggleShowSolution(index);
  }

  toggleActionDropDown() {
    this.showActionDropDown = !this.showActionDropDown;
  }
  downloadCSV(): void {
    // Define the headers for the CSV file
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Date Joined',
      'Goal',
      'Location',
      'Solutions Started',
      'Solutions Submitted',
    ];

    // Map user data to match the headers
    const rows = this.allUsers.map((user) => [
      user.firstName,
      user.lastName,
      user.email,
      user.dateJoined,
      user.goal,
      user.location,
      user.tempSolutionstarted || '0', // Default to '0' if undefined
      user.tempSolutionSubmitted || '0', // Default to '0' if undefined
    ]);

    // Combine headers and rows into CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create a Blob for the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'user_details.csv');
    link.style.visibility = 'hidden';

    // Append the link, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  asNum(v: unknown): number {
    if (typeof v === 'number') return v;
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  finishedCount(u: any): number {
    return this.asNum(u?.tempSolutionSubmitted);
  }

  inProgressCount(u: any): number {
    const started = this.asNum(u?.tempSolutionstarted);
    const submitted = this.asNum(u?.tempSolutionSubmitted);
    return Math.max(0, started - submitted);
  }

  toggleSelectAll(checked: boolean) {
    this.allSelected = checked;
    this.selected.clear();
    if (checked) {
      this.filteredUsers.forEach((u) => {
        if (u.email) this.selected.add(this.normalizeEmail(u.email));
      });
    }
  }

  toggleSelect(email: string, checked: boolean) {
    const norm = this.normalizeEmail(email);
    if (checked) this.selected.add(norm);
    else this.selected.delete(norm);

    this.allSelected = this.filteredUsers.every(
      (u) => u.email && this.selected.has(this.normalizeEmail(u.email))
    );
  }
  getPendingSolutions(email: string) {
    const normalized = (email || '').trim().toLowerCase();

    const mine = this.everySolution.filter((sol) => {
      const emails = this.normalizeParticipantEmails((sol as any).participants);
      return emails.includes(normalized);
    });

    const unfinished = mine.filter(
      (sol) => !(sol as any).finished || (sol as any).finished === 'false'
    );

    return unfinished.map((sol) => {
      const fallbackImg =
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2Fgeneric-image.jpg?alt=media&token=c4e8d393-50e6-4080-bfcd-923848db7007';

      const rawTime: any =
        (sol as any).updatedAt ?? (sol as any).createdAt ?? '';
      const lastUpdated =
        rawTime && typeof rawTime.toDate === 'function'
          ? rawTime.toDate().toISOString()
          : rawTime;

      // Resolve participants to {name,email}[]
      const emails = this.normalizeParticipantEmails((sol as any).participants);
      const participants = emails.map((e) => {
        const fromDir = this.userDirectory.get(e);
        return {
          name: fromDir?.name || e,
          email: e,
        };
      });

      const meetLink =
        (sol as any).meetLink ||
        (sol as any).meetingLink ||
        (sol as any).meetURL ||
        '';

      return {
        title: (sol as any).title ?? 'Untitled',
        summary: ((sol as any).description ?? '').slice(0, 220),
        image: (sol as any).image ?? fallbackImg,
        lastUpdated,
        ctaUrl: `https://newworld-game.org/dashboard/${
          (sol as any).solutionId
        }`,
        participants, // NEW
        meetLink: String(meetLink || ''), // NEW
      };
    });
  }

  openReminderModal(mode: 'selected' | 'all' = 'selected') {
    this.targetMode = mode;
    this.reminderOpen = true;
  }

  closeReminderModal() {
    this.reminderOpen = false;
  }

  // Small helper: nice first name
  private firstNameOf(u: any): string {
    return (u?.firstName || (u?.displayName || '')?.split(' ')[0] || '').trim();
  }

  // Build the HTML content that your SendGrid template will inject as {{content}}
  private buildWeeklyContentHTML(user: any, introHtml: string) {
    const homeUrl = 'https://newworld-game.org/';
    const pending = this.getPendingSolutions(user.email || '');
    const fname = this.firstNameOf(user) || 'there';

    const safe = (s: string) => (s || '').replace(/<script/gi, '&lt;script');

    const cards = pending
      .slice(0, 8)
      .map((p) => {
        const img =
          p.image ||
          'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/blogs%2Fgeneric-image.jpg?alt=media&token=c4e8d393-50e6-4080-bfcd-923848db7007';
        return `
      <tr>
        <td style="padding:12px;border:1px solid #e5e7eb;border-radius:12px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td width="72" valign="top" style="padding-right:12px">
                <img src="${img}" alt="" width="72" height="72" style="border-radius:8px;display:block;object-fit:cover"/>
              </td>
              <td valign="top">
                <div style="font-weight:600;color:#0f172a">${safe(
                  p.title
                )}</div>
                <div style="font-size:12px;line-height:1.5;color:#475569;margin:6px 0 10px">${safe(
                  p.summary
                )}</div>
                <a href="${
                  p.ctaUrl
                }" style="display:inline-block;background:#059669;color:#ffffff;
                   text-decoration:none;border-radius:8px;padding:6px 10px;font-size:12px">Continue</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
      })
      .join('');

    const listSection = pending.length
      ? `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:0 12px">
        ${cards}
      </table>`
      : `
      <div style="margin-top:8px;font-size:14px;color:#475569">
        <p>You have no pending solutions — great! Explore new challenges and start something bold:</p>
      </div>
      <p>
        <a href="${homeUrl}" style="display:inline-block;background:#111827;color:#ffffff;
           text-decoration:none;border-radius:10px;padding:10px 14px;font-weight:600">Go to NewWorld Game</a>
      </p>`;

    return `
  <div style="font-family:Inter,ui-sans-serif,system-ui,Arial,sans-serif">
    <p style="margin:0 0 10px;color:#0f172a">Hi ${safe(fname)},</p>
    <div style="margin-bottom:12px;color:#334155;font-size:14px;line-height:1.6">
      ${introHtml || ''}
    </div>
    ${listSection}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
    <p style="font-size:12px;color:#64748b">Sent by NewWorld Game • <a href="${homeUrl}" style="color:#059669;text-decoration:none">newworld-game.org</a></p>
  </div>`;
  }

  // Send flow: builds personalized content per recipient and calls the CF
  private formatDateForEmail(raw: any): string {
    // Accept ISO string or Firestore Timestamp
    const d =
      raw && typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw);
    if (!d || isNaN(d.getTime())) return '';
    // e.g., Sep 4, 2025
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async sendWeeklyReminders() {
    if (this.sending) return;
    this.sending = true;

    try {
      const basePool =
        this.targetMode === 'all'
          ? this.allUsers
          : this.allUsers.filter(
              (u) => u.email && this.selected.has(this.normalizeEmail(u.email))
            );

      // Respect unsubscribes unless explicitly overridden
      const pool = this.disregardUnsubs
        ? basePool
        : basePool.filter((u) => !this.isUnsubscribed(u.email));

      const skipped = basePool.length - pool.length;

      const weeklyReminder = this.fns.httpsCallable('weeklyReminder');

      for (const u of pool) {
        const email = this.normalizeEmail(u.email);
        if (!email) continue;

        const pending = this.getPendingSolutions(email)
          .slice(0, 8)
          .map((p) => ({
            title: p.title,
            summary: p.summary,
            image: p.image,
            lastUpdated: p.lastUpdated
              ? this.formatDateForEmail(p.lastUpdated)
              : '',
            ctaUrl: p.ctaUrl,
            meetLink: p.meetLink || '',
            participants: p.participants || [],
          }));

        const payload = {
          email,
          subject: this.reminderSubject,
          userFirstName: this.firstNameOf(u) || 'there',
          intro_html: this.reminderIntroHtml,
          solutions: pending,
          hasSolutions: pending.length > 0,
          homeUrl: 'https://newworld-game.org',
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          unsubscribeUrl: this.unsubscribeUrlFor(email),
        };

        console.log(
          'Send weeklyReminder ->',
          email,
          'solutions:',
          pending.length
        );
        await firstValueFrom(weeklyReminder(payload));
        await new Promise((res) => setTimeout(res, 80));
      }

      alert(
        `Weekly reminder sent to ${pool.length} recipient(s).` +
          (skipped > 0 && !this.disregardUnsubs
            ? ` Skipped ${skipped} unsubscribed.`
            : '')
      );
      this.closeReminderModal();
    } catch (e) {
      console.error('weekly reminder error', e);
      alert('An error occurred while sending reminders. Check console/logs.');
    } finally {
      this.sending = false;
    }
  }

  private normalizeParticipantEmails(input: unknown): string[] {
    if (!input) return [];
    // Array<string> or Array<{name:string}>
    if (Array.isArray(input)) {
      return input
        .map((item: any) => {
          if (typeof item === 'string') return item.trim();
          if (
            item &&
            typeof item === 'object' &&
            typeof item.name === 'string'
          ) {
            return item.name.trim(); // in your current data, "name" holds the email
          }
          return '';
        })
        .filter(Boolean)
        .map((e) => e.toLowerCase());
    }
    // Object map { key: email }
    if (typeof input === 'object') {
      return Object.values(input as Record<string, string>)
        .filter(Boolean)
        .map((e) => e.trim().toLowerCase());
    }
    return [];
  }

  private subscribeUnsubscribes() {
    this.afs
      .collection('mailing_unsubscribes', (ref) =>
        ref.orderBy('updatedAt', 'desc').limit(5000)
      )
      .valueChanges({ idField: 'id' })
      .subscribe((rows: any[]) => {
        const list = (rows || []).map((r) => {
          const updatedAt =
            r.updatedAt?.toDate?.() ??
            (r.updatedAt instanceof Date ? r.updatedAt : new Date());
          const email = this.normalizeEmail(r.email);
          return { email, reason: r.reason || '', updatedAt };
        });

        // de-dupe keep most recent
        const latestByEmail = new Map<
          string,
          { email: string; reason?: string; updatedAt: Date }
        >();
        for (const row of list) {
          const prev = latestByEmail.get(row.email);
          if (!prev || prev.updatedAt < row.updatedAt)
            latestByEmail.set(row.email, row);
        }

        this.unsubscribedRows = Array.from(latestByEmail.values()).sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
        );
        this.unsubscribedEmails = this.unsubscribedRows.map((r) => r.email);
        this.unsubSet = new Set(this.unsubscribedEmails);
      });
  }
  get recipientCounts() {
    const basePool =
      this.targetMode === 'all'
        ? this.allUsers
        : this.allUsers.filter(
            (u) => u.email && this.selected.has(this.normalizeEmail(u.email))
          );

    const unsubCount = basePool.filter((u) =>
      this.isUnsubscribed(u.email)
    ).length;
    const finalCount = this.disregardUnsubs
      ? basePool.length
      : basePool.length - unsubCount;

    return {
      baseCount: basePool.length,
      unsubCount,
      finalCount,
    };
  }
  // Build: https://newworld-game.org/unsubscribe?e=<email>
  private unsubscribeUrlFor(email: string): string {
    const base = 'https://newworld-game.org/unsubscribe';
    const norm = this.normalizeEmail(email);
    return `${base}?e=${encodeURIComponent(norm)}`;
  }
}
