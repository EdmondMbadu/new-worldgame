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

  // ===== AI Insights Email Section =====
  aiInsightsSelectedUserData: { user: User; solutions: Solution[] } | null =
    null;
  aiInsightsSelectedSolution: Solution | null = null;
  aiInsightsSending = false;
  aiInsightsSent = false;
  aiInsightsError = '';
  usersWithInProgressSolutions: { user: User; solutions: Solution[] }[] = [];
  aiInsightsMode: 'single' | 'bulk' = 'single';
  aiInsightsBulkCriteria: 'most_recent' | 'second_recent' | 'random' =
    'most_recent';
  aiInsightsBulkSelections: Array<{
    email: string;
    name: string;
    solution: Solution;
    solutionTitle: string;
  }> = [];
  aiInsightsBulkSending = false;
  aiInsightsBulkSent = false;
  aiInsightsBulkError = '';
  aiInsightsBulkIncludeUnsubscribed = false;
  aiInsightsBulkStats = {
    totalParticipants: 0,
    noSolutions: 0,
    unsubscribed: 0,
    finalRecipients: 0,
  };
  aiInsightsSendLogs: Array<{
    id: string;
    mode: 'single' | 'bulk';
    subject: string;
    createdBy: string;
    recipients: Array<{ email: string; solutionId: string; solutionTitle: string }>;
    total: number;
    successCount: number;
    failureCount: number;
    failures?: string[];
    sentAt?: any;
  }> = [];

  // Searchable dropdown state
  aiInsightsUserSearch = '';
  aiInsightsSolutionSearch = '';
  showAIInsightsUserDropdown = false;
  showAIInsightsSolutionDropdown = false;
  filteredAIInsightsUsers: { user: User; solutions: Solution[] }[] = [];
  filteredAIInsightsSolutions: Solution[] = [];

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
      // Filter out invalid/empty users (no email or empty email)
      const validUsers = data.filter((user) => {
        const email = (user.email || '').trim();
        return email.length > 0; // Only include users with a valid email
      });

      this.allUsers = validUsers.sort((a, b) => {
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

        // Compute users with in-progress solutions for AI Insights feature
        this.computeUsersWithInProgressSolutions();
      });
    });

    this.subscribeUnsubscribes();
    this.subscribeAIInsightsLogs();
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

  // ===== Dashboard Stats =====
  get dashboardStats() {
    const totalUsers = this.allUsers.length;
    const totalSolutions = this.everySolution.length;

    // Count unique finished and in-progress solutions
    const totalFinished = this.everySolution.filter(
      (sol) => sol.finished === 'true'
    ).length;
    const totalInProgress = this.everySolution.filter(
      (sol) => sol.finished !== 'true'
    ).length;

    const completionRate =
      totalSolutions > 0
        ? Math.round((totalFinished / totalSolutions) * 100)
        : 0;
    const unsubscribedCount = this.unsubscribedEmails.length;

    // Users with at least one solution
    const activeUsers = this.allUsers.filter(
      (u) => this.asNum(u.tempSolutionstarted) > 0
    ).length;

    // Engagement rate
    const engagementRate =
      totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;

    return {
      totalUsers,
      totalSolutions,
      totalFinished,
      totalInProgress,
      completionRate,
      unsubscribedCount,
      activeUsers,
      engagementRate,
    };
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

  // ===== AI Insights Email Methods =====

  // Compute users who are authors of in-progress solutions
  computeUsersWithInProgressSolutions() {
    const userSolutionsMap = new Map<
      string,
      { user: User; solutions: Solution[] }
    >();

    for (const solution of this.everySolution) {
      // Only include in-progress solutions where user is the author
      if (solution.finished !== 'true' && solution.authorEmail) {
        const normalizedAuthorEmail = solution.authorEmail.trim().toLowerCase();
        const user = this.allUsers.find(
          (u) => u.email?.trim().toLowerCase() === normalizedAuthorEmail
        );

        if (user) {
          if (!userSolutionsMap.has(normalizedAuthorEmail)) {
            userSolutionsMap.set(normalizedAuthorEmail, { user, solutions: [] });
          }
          userSolutionsMap.get(normalizedAuthorEmail)!.solutions.push(solution);
        }
      }
    }

    this.usersWithInProgressSolutions = Array.from(
      userSolutionsMap.values()
    ).sort((a, b) => {
      const nameA = `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim();
      const nameB = `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });

    // Initialize filtered list
    this.filteredAIInsightsUsers = [...this.usersWithInProgressSolutions];
  }

  // Filter users based on search input
  filterAIInsightsUsers() {
    const search = this.aiInsightsUserSearch.toLowerCase().trim();
    if (!search) {
      this.filteredAIInsightsUsers = [...this.usersWithInProgressSolutions];
    } else {
      this.filteredAIInsightsUsers = this.usersWithInProgressSolutions.filter(
        (item) => {
          const firstName = (item.user.firstName || '').toLowerCase();
          const lastName = (item.user.lastName || '').toLowerCase();
          const email = (item.user.email || '').toLowerCase();
          return (
            firstName.includes(search) ||
            lastName.includes(search) ||
            email.includes(search) ||
            `${firstName} ${lastName}`.includes(search)
          );
        }
      );
    }
  }

  // Select a user from the dropdown
  selectAIInsightsUser(item: { user: User; solutions: Solution[] }) {
    this.aiInsightsSelectedUserData = item;
    this.aiInsightsUserSearch = `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim();
    this.showAIInsightsUserDropdown = false;
    this.aiInsightsSelectedSolution = null;
    this.aiInsightsSolutionSearch = '';
    this.filteredAIInsightsSolutions = [...item.solutions];
    this.aiInsightsSent = false;
    this.aiInsightsError = '';
  }

  // Clear user selection
  clearAIInsightsUserSelection() {
    this.aiInsightsSelectedUserData = null;
    this.aiInsightsUserSearch = '';
    this.aiInsightsSelectedSolution = null;
    this.aiInsightsSolutionSearch = '';
    this.filteredAIInsightsUsers = [...this.usersWithInProgressSolutions];
    this.filteredAIInsightsSolutions = [];
    this.aiInsightsSent = false;
    this.aiInsightsError = '';
  }

  // Filter solutions based on search input
  filterAIInsightsSolutions() {
    if (!this.aiInsightsSelectedUserData) return;

    const search = this.aiInsightsSolutionSearch.toLowerCase().trim();
    if (!search) {
      this.filteredAIInsightsSolutions = [
        ...this.aiInsightsSelectedUserData.solutions,
      ];
    } else {
      this.filteredAIInsightsSolutions =
        this.aiInsightsSelectedUserData.solutions.filter((sol) => {
          const title = (sol.title || '').toLowerCase();
          const desc = (sol.description || '').toLowerCase();
          return title.includes(search) || desc.includes(search);
        });
    }
  }

  // Select a solution from the dropdown
  selectAIInsightsSolution(sol: Solution) {
    this.aiInsightsSelectedSolution = sol;
    this.aiInsightsSolutionSearch = sol.title || 'Untitled Solution';
    this.showAIInsightsSolutionDropdown = false;
    this.aiInsightsSent = false;
    this.aiInsightsError = '';
  }

  // Clear solution selection
  clearAIInsightsSolutionSelection() {
    this.aiInsightsSelectedSolution = null;
    this.aiInsightsSolutionSearch = '';
    if (this.aiInsightsSelectedUserData) {
      this.filteredAIInsightsSolutions = [
        ...this.aiInsightsSelectedUserData.solutions,
      ];
    }
    this.aiInsightsSent = false;
    this.aiInsightsError = '';
  }

  // Called when user selection changes (legacy - keeping for compatibility)
  onAIInsightsUserChange() {
    this.aiInsightsSelectedSolution = null;
    this.aiInsightsSent = false;
    this.aiInsightsError = '';
  }

  // Called when solution selection changes (legacy - keeping for compatibility)
  onAIInsightsSolutionChange() {
    this.aiInsightsSent = false;
    this.aiInsightsError = '';
  }

  // Send AI insights email
  async sendAIInsightsEmail() {
    if (!this.aiInsightsSelectedUserData || !this.aiInsightsSelectedSolution) {
      this.aiInsightsError = 'Please select a user and a solution.';
      return;
    }

    const user = this.aiInsightsSelectedUserData.user;
    const solution = this.aiInsightsSelectedSolution;

    this.aiInsightsSending = true;
    this.aiInsightsError = '';
    this.aiInsightsSent = false;

    try {
      const callable = this.fns.httpsCallable('sendAIInsightsEmail');
      await firstValueFrom(
        callable({
          userEmail: user.email,
          userFirstName: user.firstName || 'there',
          solutionId: solution.solutionId,
          solutionTitle: solution.title || 'Untitled Solution',
          solutionDescription: solution.description || '',
          solutionArea: solution.solutionArea || '',
          sdgs: solution.sdgs || [],
          meetLink: solution.meetLink || '',
          solutionImage: solution.image || '',
        })
      );

      this.aiInsightsSent = true;
      console.log('AI Insights email sent to:', user.email);
    } catch (error: any) {
      console.error('Error sending AI insights email:', error);
      this.aiInsightsError =
        error?.message || 'Failed to send email. Please try again.';
    } finally {
      this.aiInsightsSending = false;
    }
  }

  private solutionDateMs(sol: Solution): number {
    const raw =
      (sol as any).createdAt ??
      (sol as any).creationDate ??
      (sol as any).updatedAt ??
      (sol as any).submissionDate ??
      '';
    if (!raw) return 0;
    if (raw instanceof Date) return raw.getTime();
    if (typeof raw.toDate === 'function') return raw.toDate().getTime();
    const parsed = Date.parse(String(raw));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private solutionsByParticipant(): Map<string, Solution[]> {
    const map = new Map<string, Solution[]>();
    for (const sol of this.everySolution) {
      const emails = new Set<string>([
        ...this.normalizeParticipantEmails((sol as any).participants),
      ]);
      const author = this.normalizeEmail((sol as any).authorEmail);
      if (author) emails.add(author);
      emails.forEach((email) => {
        if (!email) return;
        if (!map.has(email)) map.set(email, []);
        map.get(email)!.push(sol);
      });
    }
    return map;
  }

  private pickSolutionForEmail(
    solutions: Solution[],
    criteria: 'most_recent' | 'second_recent' | 'random'
  ): Solution | null {
    if (!solutions.length) return null;
    const ordered = [...solutions].sort(
      (a, b) => this.solutionDateMs(b) - this.solutionDateMs(a)
    );
    if (criteria === 'random') {
      const idx = Math.floor(Math.random() * ordered.length);
      return ordered[idx] || ordered[0];
    }
    if (criteria === 'second_recent') {
      return ordered[1] || ordered[0];
    }
    return ordered[0];
  }

  buildBulkAIInsightsList() {
    const map = this.solutionsByParticipant();
    const selections: Array<{
      email: string;
      name: string;
      solution: Solution;
      solutionTitle: string;
    }> = [];
    let noSolutions = 0;
    let unsubscribedSkipped = 0;

    for (const [email, solutions] of map.entries()) {
      const picked = this.pickSolutionForEmail(
        solutions,
        this.aiInsightsBulkCriteria
      );
      if (!picked || !picked.solutionId) {
        noSolutions += 1;
        continue;
      }
      if (this.isUnsubscribed(email) && !this.aiInsightsBulkIncludeUnsubscribed) {
        unsubscribedSkipped += 1;
        continue;
      }
      const fromDir = this.userDirectory.get(email);
      selections.push({
        email,
        name: fromDir?.name || email,
        solution: picked,
        solutionTitle: picked.title || 'Untitled Solution',
      });
    }

    selections.sort((a, b) => a.name.localeCompare(b.name));
    this.aiInsightsBulkSelections = selections;
    this.aiInsightsBulkSent = false;
    this.aiInsightsBulkError = '';

      this.aiInsightsBulkStats = {
        totalParticipants: map.size,
        noSolutions,
        unsubscribed: unsubscribedSkipped,
        finalRecipients: selections.length,
      };
  }

  removeBulkRecipient(email: string) {
    const norm = this.normalizeEmail(email);
    this.aiInsightsBulkSelections = this.aiInsightsBulkSelections.filter(
      (item) => item.email !== norm
    );
    this.aiInsightsBulkSent = false;
    this.aiInsightsBulkError = '';
    this.aiInsightsBulkStats = {
      ...this.aiInsightsBulkStats,
      finalRecipients: this.aiInsightsBulkSelections.length,
    };
  }

  async sendBulkAIInsightsEmails() {
    if (this.aiInsightsBulkSending || !this.aiInsightsBulkSelections.length)
      return;
    this.aiInsightsBulkSending = true;
    this.aiInsightsBulkSent = false;
    this.aiInsightsBulkError = '';

    try {
      const payload = this.aiInsightsBulkSelections.map((item) => {
        const sol = item.solution;
        return {
          userEmail: item.email,
          userFirstName: item.name.split(' ')[0] || 'there',
          solutionId: sol.solutionId,
          solutionTitle: sol.title || 'Untitled Solution',
          solutionDescription: sol.description || '',
          solutionArea: sol.solutionArea || '',
          sdgs: sol.sdgs || [],
          meetLink: sol.meetLink || '',
          solutionImage: sol.image || '',
        };
      });

      const bulkCallable = this.fns.httpsCallable('sendAIInsightsBulkEmail');
      const response: any = await firstValueFrom(
        bulkCallable({
          recipients: payload,
          concurrency: 4,
        })
      );

      if (response?.successCount) {
        this.aiInsightsBulkSent = true;
      }
      if (response?.failureCount) {
        this.aiInsightsBulkError =
          'Some emails failed to send. Check the send log for details.';
      }
    } finally {
      this.aiInsightsBulkSending = false;
    }
  }

  private subscribeAIInsightsLogs() {
    this.afs
      .collection('ai_insights_send_logs', (ref) =>
        ref.orderBy('sentAt', 'desc').limit(200)
      )
      .valueChanges({ idField: 'id' })
      .subscribe((rows: any[]) => {
        this.aiInsightsSendLogs = rows || [];
      });
  }

  deleteAIInsightsLog(id: string) {
    if (!id) return;
    this.afs.doc(`ai_insights_send_logs/${id}`).delete();
  }

  formatLogTimestamp(ts: any): string {
    const d =
      ts?.toDate?.() || (ts instanceof Date ? ts : new Date(ts || ''));
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}
