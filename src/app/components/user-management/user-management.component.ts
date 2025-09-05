import { Component, OnInit } from '@angular/core';
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
    private fns: AngularFireFunctions
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
        if (u.email) this.selected.add(u.email);
      });
    }
  }

  toggleSelect(email: string, checked: boolean) {
    if (checked) this.selected.add(email);
    else this.selected.delete(email);

    // keep "Select all" in sync
    this.allSelected = this.filteredUsers.every(
      (u) => u.email && this.selected.has(u.email)
    );
  }
  getPendingSolutions(email: string) {
    const normalized = email.trim().toLowerCase();

    const mine = this.everySolution.filter((sol) => {
      const p = sol.participants as unknown;

      // Normalize participants -> string[] of emails
      let emails: string[] = [];

      if (Array.isArray(p)) {
        // supports [{name:string}] or [string]
        emails = p
          .map((item: any) =>
            typeof item === 'string' ? item : item?.name ?? ''
          )
          .filter(Boolean);
      } else if (p && typeof p === 'object') {
        // supports { [key]: string }
        emails = Object.values(p as Record<string, string>).filter(Boolean);
      }

      return emails.some((e) => e.trim().toLowerCase() === normalized);
    });

    // finished can be 'true' or true
    const unfinished = mine.filter(
      (sol) => !(sol as any).finished || (sol as any).finished === 'false'
    );

    return unfinished.map((sol) => {
      const fallbackImg =
        'https://newworld-game.org/assets/solution-placeholder.png';

      const rawTime: any =
        (sol as any).updatedAt ?? (sol as any).createdAt ?? '';
      // If Firestore Timestamp, convert; else pass through
      const lastUpdated =
        rawTime && typeof rawTime.toDate === 'function'
          ? rawTime.toDate().toISOString()
          : rawTime;

      return {
        title: sol.title ?? 'Untitled',
        summary: (sol.description ?? '').slice(0, 220),
        image: sol.image ?? fallbackImg,
        lastUpdated,
        ctaUrl: `https://newworld-game.org/playground-steps/${sol.solutionId}`,
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
          'https://newworld-game.org/assets/solution-placeholder.png';
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
  async sendWeeklyReminders() {
    if (this.sending) return;
    this.sending = true;

    try {
      const pool =
        this.targetMode === 'all'
          ? this.allUsers
          : this.allUsers.filter((u) => u.email && this.selected.has(u.email));

      const weeklyReminder = this.fns.httpsCallable('weeklyReminder');

      for (const u of pool) {
        const email = (u.email || '').trim();
        if (!email) continue;

        const content = this.buildWeeklyContentHTML(u, this.reminderIntroHtml);

        const payload: any = {
          email,
          subject: this.reminderSubject,
          content, // <-- IMPORTANT: we send full HTML content
          user: this.firstNameOf(u) || 'there',
        };

        await firstValueFrom(weeklyReminder(payload));
        // Optional: tiny delay to avoid rate bursts
        await new Promise((res) => setTimeout(res, 80));
      }

      alert(`Weekly reminder sent to ${pool.length} recipient(s).`);
      this.closeReminderModal();
    } catch (e) {
      console.error('weekly reminder error', e);
      alert('An error occurred while sending reminders. Check console/logs.');
    } finally {
      this.sending = false;
    }
  }
}
