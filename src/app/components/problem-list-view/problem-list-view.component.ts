import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { PresenceService } from 'src/app/services/presence.service';
import { SolutionService } from 'src/app/services/solution.service';

interface SolutionMember {
  email: string;
  displayName: string;
  uid?: string;
  lastActiveAt?: string;
}

@Component({
  selector: 'app-problem-list-view',
  templateUrl: './problem-list-view.component.html',
  styleUrls: ['./problem-list-view.component.css'],
})
export class ProblemListViewComponent implements OnInit {
  solutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  gradientPalette = [
    'from-sky-500 via-indigo-500 to-purple-500',
    'from-emerald-500 via-cyan-500 to-blue-500',
    'from-orange-500 via-rose-500 to-pink-500',
    'from-amber-500 via-yellow-500 to-lime-500',
    'from-fuchsia-500 via-purple-500 to-blue-500',
    'from-blue-500 via-slate-500 to-neutral-600',
  ];
  private readonly dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  private readonly timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  confirmationDeleteSolution: boolean = false;
  confirmationLeaveSolution: boolean = false;
  currentSolution?: Solution;
  pending: number = 0;
  /** 🆕 bound to the search box */
  searchTerm = '';
  viewMode: 'list' | 'grid' = 'grid';
  weeklyBriefSolutionId = '';
  weeklyBriefSavingId = '';
  weeklyBriefMessage = '';
  weeklyBriefError = '';
  weeklyBriefFromEmailLink = false;
  weeklyBriefPickerOpen = false;
  weeklyBriefSolutionSearch = '';
  weeklyBriefModalOpen = false;
  memberCountBySolutionId = new Map<string, number>();
  onlineCountBySolutionId = new Map<string, number>();
  onlineMembersBySolutionId = new Map<string, SolutionMember[]>();
  private memberByEmail = new Map<string, SolutionMember | null>();
  private memberByUid = new Map<string, SolutionMember>();
  private solutionMemberUids = new Map<string, string[]>();
  private memberLastActiveByUid = new Map<string, string | undefined>();
  private solutionsSub?: Subscription;
  private presenceSub?: Subscription;

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private router: Router,
    private afs: AngularFirestore,
    private route: ActivatedRoute,
    private presence: PresenceService
  ) {
    this.solutionsSub = solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      this.solutions = data;
      console.log('all solutions I am in', this.solutions);
      this.findPendingSolutions();
      void this.refreshPresenceForSolutions();
    });
  }
  ngOnInit(): void {
    window.scroll(0, 0);
    this.route.queryParamMap.subscribe((params) => {
      this.weeklyBriefFromEmailLink = params.get('weeklyBrief') === '1';
      if (this.weeklyBriefFromEmailLink) {
        this.openWeeklyBriefModal();
      }
    });
    this.auth.getObservableUser().subscribe((user) => {
      if (!user) return;
      this.weeklyBriefSolutionId = user.weeklyBriefSolutionId || '';
    });
  }

  ngOnDestroy(): void {
    this.solutionsSub?.unsubscribe();
    this.presenceSub?.unsubscribe();
  }
  @Input() title: string = 'problemListView.tabs.pending';

  async findPendingSolutions() {
    this.pendingSolutions = [];

    for (let s of this.solutions) {
      if (s.finished === undefined || s.finished !== 'true') {
        this.pendingSolutions.push(s);
      }
    }
    this.pending = this.pendingSolutions.length;
  }
  toggleConfirmationDeleteSolution() {
    console.log('button clicked ');
    this.confirmationDeleteSolution = !this.confirmationDeleteSolution;
  }
  toggleConfirmationLeaveSolution() {
    this.confirmationLeaveSolution = !this.confirmationLeaveSolution;
  }
  submitDeleteSolution() {
    this.solution.deleteSolution(this.currentSolution!.solutionId!);
    this.toggleConfirmationDeleteSolution();
    this.router.navigate(['/home']);
  }

  submitLeaveSolution() {
    this.removeParticipantFromSolution(this.auth.currentUser.email!);
  }
  removeParticipantFromSolution(email: string) {
    // Ensure participants array exists
    if (
      (this.currentSolution && !this.currentSolution.participants) ||
      !Array.isArray(this.currentSolution!.participants)
    ) {
      alert('No participants found!');
      return;
    }

    // Filter out the participant to be removed
    const updatedParticipants = this.currentSolution!.participants.filter(
      (participant: any) => participant.name !== email
    );

    // Update the solution's participants
    this.solution
      .addParticipantsToSolution(
        updatedParticipants,
        this.currentSolution!.solutionId!
      )
      .then(() => {
        alert(`Successfully removed ${email} from the solution.`);
        this.toggleConfirmationLeaveSolution();
        // this.router.navigate(['/home']);
      })
      .catch((error) => {
        console.error('Error occurred while removing a team member:', error);
        alert('Error occurred while removing a team member. Try again!');
      });
  }

  receiveConfirmationDelete(eventData: Solution) {
    this.currentSolution = eventData;
    this.toggleConfirmationDeleteSolution();
  }

  receiveLeaveSolution(eventData: Solution) {
    this.currentSolution = eventData;
    this.toggleConfirmationLeaveSolution();
  }
  isSidebarOpen = true;

  /** search */
  get filteredPendingSolutions(): Solution[] {
    const t = this.searchTerm.trim().toLowerCase();
    return !t
      ? this.pendingSolutions
      : this.pendingSolutions.filter((s) => s.title?.toLowerCase().includes(t));
  }

  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  setViewMode(mode: 'list' | 'grid') {
    this.viewMode = mode;
  }

  openSolution(solution: Solution) {
    if (!solution.solutionId) {
      return;
    }
    this.router.navigate(['/dashboard', solution.solutionId]);
  }

  isWeeklyBriefSelected(solution: Solution): boolean {
    return !!solution.solutionId && solution.solutionId === this.weeklyBriefSolutionId;
  }

  get weeklyBriefSelectedSolution(): Solution | undefined {
    if (!this.weeklyBriefSolutionId) {
      return undefined;
    }
    return this.pendingSolutions.find(
      (solution) => solution.solutionId === this.weeklyBriefSolutionId
    );
  }

  get weeklyBriefPickerLabel(): string {
    return (
      this.weeklyBriefSelectedSolution?.title ||
      this.auth.currentUser.weeklyBriefSolutionTitle ||
      'Use NewWorld Game fallback'
    );
  }

  get filteredWeeklyBriefSolutions(): Solution[] {
    const term = this.weeklyBriefSolutionSearch.trim().toLowerCase();
    if (!term) {
      return this.pendingSolutions;
    }
    return this.pendingSolutions.filter((solution) => {
      const title = (solution.title || '').toLowerCase();
      const description = (solution.description || '').toLowerCase();
      const area = (solution.solutionArea || '').toLowerCase();
      return (
        title.includes(term) ||
        description.includes(term) ||
        area.includes(term)
      );
    });
  }

  get weeklyBriefPickerValue(): string {
    return this.weeklyBriefPickerOpen
      ? this.weeklyBriefSolutionSearch
      : this.weeklyBriefPickerLabel;
  }

  openWeeklyBriefPicker() {
    this.weeklyBriefPickerOpen = true;
    this.weeklyBriefSolutionSearch = '';
  }

  openWeeklyBriefModal(event?: Event) {
    event?.stopPropagation();
    this.weeklyBriefModalOpen = true;
    this.openWeeklyBriefPicker();
  }

  closeWeeklyBriefModal() {
    this.weeklyBriefModalOpen = false;
    this.weeklyBriefPickerOpen = false;
    this.weeklyBriefSolutionSearch = '';
  }

  onWeeklyBriefPickerInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.weeklyBriefSolutionSearch = input.value || '';
    this.weeklyBriefPickerOpen = true;
  }

  closeWeeklyBriefPickerSoon() {
    window.setTimeout(() => {
      this.weeklyBriefPickerOpen = false;
      this.weeklyBriefSolutionSearch = '';
    }, 120);
  }

  async saveWeeklyBriefSolution(solution: Solution, event?: Event) {
    event?.stopPropagation();
    this.weeklyBriefMessage = '';
    this.weeklyBriefError = '';

    if (!solution.solutionId) {
      this.weeklyBriefError = 'This solution cannot be selected yet.';
      return;
    }

    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.weeklyBriefError = 'Please sign in again before saving your weekly brief choice.';
      return;
    }

    this.weeklyBriefSavingId = solution.solutionId;
    try {
      const title = solution.title || 'Untitled Solution';
      await this.afs.doc(`users/${uid}`).set(
        {
          weeklyBriefSolutionId: solution.solutionId,
          weeklyBriefSolutionTitle: title,
          weeklyBriefSolutionUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.weeklyBriefSolutionId = solution.solutionId;
      this.auth.currentUser.weeklyBriefSolutionId = solution.solutionId;
      this.auth.currentUser.weeklyBriefSolutionTitle = title;
      this.weeklyBriefMessage = `${title} is now your weekly brief solution.`;
    } catch (error: any) {
      console.error('Unable to save weekly brief solution', error);
      this.weeklyBriefError =
        error?.message || 'Unable to save your weekly brief solution right now.';
    } finally {
      this.weeklyBriefSavingId = '';
    }
  }

  saveWeeklyBriefSolutionById(solutionId: string) {
    if (!solutionId) {
      void this.clearWeeklyBriefSolution();
      return;
    }
    const solution = this.pendingSolutions.find(
      (item) => item.solutionId === solutionId
    );
    if (!solution) {
      return;
    }
    void this.saveWeeklyBriefSolution(solution);
  }

  selectWeeklyBriefSolution(solution: Solution, event?: Event) {
    event?.stopPropagation();
    this.weeklyBriefPickerOpen = false;
    this.weeklyBriefSolutionSearch = '';
    void this.saveWeeklyBriefSolution(solution, event);
  }

  selectWeeklyBriefFallback(event?: Event) {
    event?.stopPropagation();
    this.weeklyBriefPickerOpen = false;
    this.weeklyBriefSolutionSearch = '';
    void this.clearWeeklyBriefSolution(event);
  }

  async clearWeeklyBriefSolution(event?: Event) {
    event?.stopPropagation();
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;

    this.weeklyBriefMessage = '';
    this.weeklyBriefError = '';
    this.weeklyBriefSavingId = '__clear__';
    try {
      await this.afs.doc(`users/${uid}`).set(
        {
          weeklyBriefSolutionId: '',
          weeklyBriefSolutionTitle: '',
          weeklyBriefSolutionUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.weeklyBriefSolutionId = '';
      this.auth.currentUser.weeklyBriefSolutionId = '';
      this.auth.currentUser.weeklyBriefSolutionTitle = '';
      this.weeklyBriefMessage =
        'Weekly brief choice cleared. The weekly sender will use its fallback rule.';
    } catch (error: any) {
      console.error('Unable to clear weekly brief solution', error);
      this.weeklyBriefError =
        error?.message || 'Unable to clear your weekly brief solution right now.';
    } finally {
      this.weeklyBriefSavingId = '';
    }
  }

  getSolutionDate(solution: Solution): string {
    const raw =
      solution.creationDate ||
      solution.createdAt ||
      solution.updatedAt ||
      solution.submissionDate;
    return this.formatFriendlyDate(raw);
  }

  participantCount(solution: Solution): number {
    return this.solutionMemberEmails(solution).length || (solution.authorAccountId ? 1 : 0);
  }

  memberLabel(solution: Solution): string {
    const count =
      this.memberCountBySolutionId.get(this.solutionKey(solution)) ??
      this.participantCount(solution);
    return `${count} member${count === 1 ? '' : 's'}`;
  }

  onlineLabel(solution: Solution): string {
    const count = this.onlineCountBySolutionId.get(this.solutionKey(solution)) || 0;
    return `${count} online`;
  }

  onlineMembers(solution: Solution): SolutionMember[] {
    return this.onlineMembersBySolutionId.get(this.solutionKey(solution)) || [];
  }

  onlineMemberNames(solution: Solution): string {
    return this.onlineMembers(solution)
      .slice(0, 3)
      .map((member) => member.displayName)
      .join(', ');
  }

  previewText(solution: Solution): string {
    const text = solution.description ?? solution.content;
    if (typeof text !== 'string') {
      return 'No description provided yet.';
    }
    const withoutTags = text.replace(/<[^>]*>/g, ' ');
    const normalized = withoutTags.replace(/\s+/g, ' ').trim();
    if (!normalized || /^(true|false|null|undefined)$/i.test(normalized)) {
      return 'No description provided yet.';
    }
    return normalized.length > 160
      ? `${normalized.slice(0, 157)}…`
      : normalized;
  }

  getCardAccent(index: number): string {
    return this.gradientPalette[index % this.gradientPalette.length];
  }

  tileInitial(solution: Solution): string {
    const title = solution.title?.trim();
    if (title) {
      return title[0].toUpperCase();
    }
    const author = solution.authorName?.trim();
    if (author) {
      return author[0].toUpperCase();
    }
    return 'S';
  }

  private formatFriendlyDate(raw: unknown): string {
    if (raw === undefined || raw === null) {
      return 'Date unavailable';
    }
    if (raw instanceof Date && !isNaN(raw.getTime())) {
      return this.composeDate(raw, true);
    }
    if (typeof raw === 'object' && 'seconds' in (raw as any)) {
      const seconds = Number((raw as any).seconds);
      const nanoseconds = Number((raw as any).nanoseconds ?? 0);
      const date = new Date(seconds * 1000 + nanoseconds / 1e6);
      if (!isNaN(date.getTime())) {
        return this.composeDate(date, true);
      }
    }
    const value = String(raw).trim();
    if (!value) {
      return 'Date unavailable';
    }
    const parsed = this.normalizeDate(value);
    if (!parsed) {
      return value;
    }
    return this.composeDate(
      parsed,
      this.containsTimeInformation(value, parsed)
    );
  }

  private normalizeDate(raw: string): Date | undefined {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      const ms = raw.length === 10 ? numeric * 1000 : numeric;
      const date = new Date(ms);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    let date = new Date(raw);
    if (!isNaN(date.getTime())) {
      return date;
    }

    const patternMDY = raw.match(
      /^(\d{1,2})-(\d{1,2})-(\d{4})(?:-(\d{1,2})-(\d{1,2})-(\d{1,2}))?$/
    );
    if (patternMDY) {
      const [, month, day, year, hour, minute, second] = patternMDY;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0,
        second ? Number(second) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    const patternYMD = raw.match(
      /^(\d{4})-(\d{1,2})-(\d{1,2})(?:-(\d{1,2})-(\d{1,2})-(\d{1,2}))?$/
    );
    if (patternYMD) {
      const [, year, month, day, hour, minute, second] = patternYMD;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0,
        second ? Number(second) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    const patternSlash = raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/
    );
    if (patternSlash) {
      const [, month, day, year, hour, minute] = patternSlash;
      date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour ? Number(hour) : 0,
        minute ? Number(minute) : 0
      );
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return undefined;
  }

  private async refreshPresenceForSolutions(): Promise<void> {
    const emails = Array.from(
      new Set(
        this.pendingSolutions
          .flatMap((solution) => this.solutionMemberEmails(solution))
          .map((email) => this.normalizeEmail(email))
          .filter(Boolean)
      )
    );

    await Promise.all(emails.map((email) => this.resolveMemberByEmail(email)));

    const allUids = new Set<string>();
    this.solutionMemberUids.clear();
    this.memberLastActiveByUid.clear();
    this.memberByUid.clear();

    this.pendingSolutions.forEach((solution) => {
      const key = this.solutionKey(solution);
      const uids = new Set<string>();
      const memberEmails = this.solutionMemberEmails(solution);

      memberEmails.forEach((email) => {
        const member = this.memberByEmail.get(this.normalizeEmail(email));
        if (!member?.uid) return;
        uids.add(member.uid);
        this.memberByUid.set(member.uid, member);
        this.memberLastActiveByUid.set(member.uid, member.lastActiveAt);
      });

      if (solution.authorAccountId) {
        uids.add(solution.authorAccountId);
        const authorMember = this.memberFromSolutionAuthor(solution);
        if (authorMember) this.memberByUid.set(solution.authorAccountId, authorMember);
      }

      const uidList = Array.from(uids);
      this.solutionMemberUids.set(key, uidList);
      this.memberCountBySolutionId.set(key, memberEmails.length || uidList.length);
      uidList.forEach((uid) => allUids.add(uid));
    });

    this.presenceSub?.unsubscribe();
    this.presenceSub = this.presence
      .watchOnlineUids$(Array.from(allUids), this.memberLastActiveByUid)
      .subscribe((onlineUids) => {
        this.onlineCountBySolutionId.clear();
        this.onlineMembersBySolutionId.clear();

        this.pendingSolutions.forEach((solution) => {
          const key = this.solutionKey(solution);
          const members = (this.solutionMemberUids.get(key) || [])
            .filter((uid) => onlineUids.has(uid))
            .map((uid) => this.memberByUid.get(uid))
            .filter((member): member is SolutionMember => !!member);
          this.onlineCountBySolutionId.set(key, members.length);
          this.onlineMembersBySolutionId.set(key, members);
        });
      });
  }

  private solutionMemberEmails(solution: Solution): string[] {
    const emails = new Set<string>();
    const addEmail = (value: any) => {
      const email = this.normalizeEmail(value?.name || value?.email || value);
      if (email) emails.add(email);
    };

    const participants = solution.participants;
    if (Array.isArray(participants)) {
      participants.forEach(addEmail);
    } else if (participants && typeof participants === 'object') {
      Object.values(participants).forEach(addEmail);
    }
    (solution.participantsHolder || []).forEach(addEmail);
    addEmail(solution.authorEmail);

    return Array.from(emails);
  }

  private async resolveMemberByEmail(email: string): Promise<SolutionMember | null> {
    const normalizedEmail = this.normalizeEmail(email);
    if (this.memberByEmail.has(normalizedEmail)) {
      return this.memberByEmail.get(normalizedEmail) || null;
    }

    const currentEmail = this.normalizeEmail(this.auth.currentUser?.email || '');
    const currentUid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    if (normalizedEmail === currentEmail && currentUid) {
      const member = {
        email: normalizedEmail,
        displayName:
          [this.auth.currentUser?.firstName, this.auth.currentUser?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || normalizedEmail,
        uid: currentUid,
        lastActiveAt: new Date().toISOString(),
      };
      this.memberByEmail.set(normalizedEmail, member);
      return member;
    }

    try {
      const users = await firstValueFrom(this.auth.getUserFromEmail(normalizedEmail));
      const user = users?.[0] as User | undefined;
      const member = user?.uid
        ? {
            email: normalizedEmail,
            displayName:
              [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
              user.email ||
              normalizedEmail,
            uid: user.uid,
            lastActiveAt: user.lastActiveAt,
          }
        : null;
      this.memberByEmail.set(normalizedEmail, member);
      return member;
    } catch {
      this.memberByEmail.set(normalizedEmail, null);
      return null;
    }
  }

  private memberFromSolutionAuthor(solution: Solution): SolutionMember | null {
    if (!solution.authorAccountId) return null;
    return {
      email: this.normalizeEmail(solution.authorEmail || ''),
      displayName: solution.authorName || solution.authorEmail || 'Solution owner',
      uid: solution.authorAccountId,
    };
  }

  private solutionKey(solution: Solution): string {
    return solution.solutionId || solution.title || '';
  }

  private normalizeEmail(value: any): string {
    return String(value || '').trim().toLowerCase();
  }

  private containsTimeInformation(raw: string, date: Date): boolean {
    if (/(\d{1,2}:\d{2})/.test(raw) || raw.includes('T')) {
      return true;
    }
    if (raw.split('-').length >= 5) {
      return true;
    }
    return (
      date.getHours() !== 0 ||
      date.getMinutes() !== 0 ||
      date.getSeconds() !== 0
    );
  }

  private composeDate(date: Date, includeTime: boolean): string {
    const datePart = this.dateFormatter.format(date);
    if (!includeTime) {
      return datePart;
    }
    return `${datePart} · ${this.timeFormatter.format(date)}`;
  }
}
