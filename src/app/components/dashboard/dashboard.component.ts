import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { Solution, SolutionRecruitmentProfile } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { PresenceService } from 'src/app/services/presence.service';
import { SolutionService } from 'src/app/services/solution.service';

interface OnlineTeamMember {
  email: string;
  displayName: string;
  uid: string;
  lastActiveAt?: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private presence: PresenceService
  ) {}
  showInviteModal = false;
  toggleInviteModal() {
    this.showInviteModal = !this.showInviteModal;
    if (this.showInviteModal) {
      this.ensureRecruitmentProfile();
      this.profileSaved = false;
      this.profileMessage = '';
    }
  }
  includeReadMe = true;
  publishToastVisible = false;
  channels = {
    email: true,
    broadcastFeed: true,
    social: false,
    customApi: false,
  };

  sendingBroadcast = false;
  currentSolution: Solution = {};
  id: any;
  isHovering: boolean = false;
  savingProfile = false;
  profileSaved = false;
  profileMessage = '';
  showDeleteSolutionConfirm = false;
  showLeaveSolutionConfirm = false;
  isDeletingSolution = false;
  isLeavingSolution = false;
  workspaceAccessMessage = '';
  workspaceAccessError = '';

  // Invite team member modal (hybrid: client-side + server fallback)
  showInviteTeamMemberModal = false;
  newTeamMember: string = '';
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  showUserSuggestions = false;
  selectedUser: User | null = null;
  private userSearchTimeout: any;
  isSearchingUsers = false;
  invitedParticipants: Array<{
    email: string;
    name?: string;
    status: 'success' | 'error';
  }> = [];
  isAddingParticipant = false;
  pendingParticipants: Array<{
    email: string;
    name: string;
    user?: User;
  }> = [];
  teamMemberCount = 0;
  onlineTeamMembers: OnlineTeamMember[] = [];
  private teamMembersByEmail = new Map<string, OnlineTeamMember | null>();
  private teamMembersByUid = new Map<string, OnlineTeamMember>();
  private teamPresenceSub?: Subscription;
  private solutionSub?: Subscription;
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solutionSub = this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.ensureRecruitmentProfile();
      this.profileSaved = false;
      this.profileMessage = '';
      void this.refreshTeamPresence();
    });

    // Load all users for autocomplete
    this.auth.getALlUsers().subscribe((users) => {
      this.allUsers = users;
    });

    // Check for openInvite query param to auto-open invite modal
    this.activatedRoute.queryParams.subscribe((params) => {
      if (params['openInvite'] === 'true') {
        // Small delay to ensure the page is loaded
        setTimeout(() => {
          this.showInviteTeamMemberModal = true;
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.solutionSub?.unsubscribe();
    this.teamPresenceSub?.unsubscribe();
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  async startUpload(event: FileList) {
    try {
      await this.data.startUpload(
        event,
        `solutions/${this.currentSolution.solutionId}`
      );
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  onImageClick() {
    // fix the below code to open the file dialog

    const fileInput = document.getElementById('getFile') as HTMLElement;
  }
  get generatedInviteLink(): string {
    return `https://newworld-game.org/join/${
      this.currentSolution.solutionId || this.id
    }`;
  }

  get onlineTeamLabel(): string {
    const count = this.onlineTeamMembers.length;
    return `${count} online`;
  }

  get teamMemberLabel(): string {
    return `${this.teamMemberCount} member${this.teamMemberCount === 1 ? '' : 's'}`;
  }

  get allBroadcasts(): string {
    return `broadcasts/`;
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.generatedInviteLink);
    // toast/snackbar...
  }

  ensureRecruitmentProfile() {
    if (!this.currentSolution.recruitmentProfile) {
      this.currentSolution.recruitmentProfile = this.createDefaultProfile();
    } else {
      const defaults = this.createDefaultProfile();
      this.currentSolution.recruitmentProfile = {
        ...defaults,
        ...this.currentSolution.recruitmentProfile,
      };
    }
  }

  private createDefaultProfile(): SolutionRecruitmentProfile {
    const participantCount = this.currentSolution.participants
      ? Object.keys(this.currentSolution.participants).length
      : undefined;

    return {
      teamLabel: 'Team 1',
      initiativeName: this.currentSolution.title ?? '',
      focusArea:
        this.currentSolution.solutionArea ||
        this.currentSolution.sdgs?.join(', ') ||
        '',
      challengeDescription: '',
      scopeOfWork: '',
      finalProduct: '',
      startDate: '',
      completionDate: '',
      timeCommitment: '1 hour per week',
      teamSizeMin: participantCount ?? 5,
      teamSizeMax: participantCount ? Math.max(participantCount, 6) : 6,
      perspectives: 'Global perspective',
      interests:
        'Interest in the global energy situation and the proposed challenge focus.',
      knowledge:
        'Experience living in or understanding non-US regions (Africa, China, India, etc.).',
      skills:
        'Turning data into knowledge, internet research, AI-assisted analysis, map and chart making.',
      additionalNotes: '',
    };
  }

  async saveRecruitmentProfile() {
    if (
      !this.currentSolution?.solutionId ||
      !this.currentSolution.recruitmentProfile
    ) {
      return;
    }

    this.savingProfile = true;
    this.profileSaved = false;
    this.profileMessage = '';

    const payload: SolutionRecruitmentProfile = {
      ...this.currentSolution.recruitmentProfile,
      teamSizeMin: this.toNumber(
        this.currentSolution.recruitmentProfile.teamSizeMin
      ),
      teamSizeMax: this.toNumber(
        this.currentSolution.recruitmentProfile.teamSizeMax
      ),
    };
    this.currentSolution.recruitmentProfile = payload;

    const updates = {
      recruitmentProfile: payload,
      broadCastInviteMessage: this.currentSolution.broadCastInviteMessage ?? '',
      description: this.currentSolution.description ?? '',
    };

    try {
      await this.solution.updateSolutionFields(
        this.currentSolution.solutionId,
        updates
      );
      this.profileSaved = true;
      this.profileMessage = 'Team profile saved';
    } catch (error) {
      console.error('Failed to save recruitment profile', error);
      this.profileSaved = false;
      this.profileMessage = 'Could not save details. Please try again.';
    } finally {
      this.savingProfile = false;
    }
  }

  splitLines(value?: string | null): string[] {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const coerced = Number(value);
    return Number.isNaN(coerced) ? null : coerced;
  }

  askBuckyForPitch() {
    // Call your AI service
    // this.currentSolution.broadCastInviteMessage = await buckyService.improvePitch(...);
  }

  async sendBroadcast() {
    if (!this.currentSolution?.solutionId) return;

    try {
      this.sendingBroadcast = true;

      const payload = {
        solutionId: this.currentSolution.solutionId,
        title: this.currentSolution.title || 'Untitled Solution',
        message: this.currentSolution.broadCastInviteMessage || '',
        includeReadMe: !!this.includeReadMe,
        readMe: this.includeReadMe
          ? this.currentSolution.description || ''
          : undefined,
        channels: this.channels,
        inviteLink: this.generatedInviteLink,
        joinLink: `/join/${this.currentSolution.solutionId}`,
      };

      const id = await this.solution.startBroadcastPending(payload);

      // Mirror client-side “pending” (not live)
      (this.currentSolution as any).isBroadcasting = false;
      (this.currentSolution as any).broadcastStatus = 'pending';
      (this.currentSolution as any).broadcastId = id;

      this.publishToastVisible = true; // toast will show “submitted for review”
    } catch (e) {
      console.error(e);
      alert('Sorry, submission failed. Please try again.');
    } finally {
      this.sendingBroadcast = false;
    }
  }

  // Optional: stop button handler (for later use)
  async stopBroadcast() {
    if (!this.currentSolution?.solutionId) return;
    try {
      this.sendingBroadcast = true;
      await this.solution.stopBroadcastBySolutionId(
        this.currentSolution.solutionId
      );
      alert('Broadcast stopped.');
    } catch (e) {
      console.error(e);
      alert('Could not stop broadcast.');
    } finally {
      this.sendingBroadcast = false;
    }
  }
  // Helpers for broadcast state in the dashboard component class
  dismissPublishToast() {
    this.publishToastVisible = false;
  }

  get isLive(): boolean {
    const status = (this.currentSolution as any)?.broadcastStatus;
    return (
      (this.currentSolution as any)?.isBroadcasting === true &&
      status === 'active'
    );
  }

  get isPending(): boolean {
    return (this.currentSolution as any)?.broadcastStatus === 'pending';
  }

  // keep if other places still call it; now “broadcasting” strictly means live
  get isBroadcasting(): boolean {
    return this.isLive;
  }

  get isAdminOfSolution(): boolean {
    if (!this.currentSolution || !this.auth.currentUser) return false;

    const uid = this.auth.currentUser.uid;
    const email = this.normalizeEmail(this.auth.currentUser.email);

    return (
      (!!uid && this.currentSolution.authorAccountId === uid) ||
      (!!email &&
        this.normalizeEmail(this.currentSolution.authorEmail) === email) ||
      (this.currentSolution.chosenAdmins ?? []).some(
        (admin) =>
          (!!uid && admin.authorAccountId === uid) ||
          (!!email && this.normalizeEmail(admin.authorEmail) === email)
      )
    );
  }

  get canLeaveSolution(): boolean {
    return !this.isAdminOfSolution && this.isCurrentUserParticipant();
  }

  get broadcastStatus(): 'active' | 'paused' | 'stopped' | 'pending' {
    const status = (this.currentSolution as any)?.broadcastStatus as any;
    return status ?? 'stopped';
  }

  openDeleteSolutionConfirm() {
    this.workspaceAccessMessage = '';
    this.workspaceAccessError = '';
    this.showDeleteSolutionConfirm = true;
  }

  closeDeleteSolutionConfirm() {
    if (this.isDeletingSolution) return;
    this.showDeleteSolutionConfirm = false;
  }

  openLeaveSolutionConfirm() {
    this.workspaceAccessMessage = '';
    this.workspaceAccessError = '';
    this.showLeaveSolutionConfirm = true;
  }

  closeLeaveSolutionConfirm() {
    if (this.isLeavingSolution) return;
    this.showLeaveSolutionConfirm = false;
  }

  async submitDeleteSolution() {
    const solutionId = this.currentSolution?.solutionId || this.id;
    if (!solutionId || !this.isAdminOfSolution || this.isDeletingSolution) {
      return;
    }

    this.isDeletingSolution = true;
    this.workspaceAccessMessage = '';
    this.workspaceAccessError = '';

    try {
      await this.solution.deleteSolution(solutionId);
      this.showDeleteSolutionConfirm = false;
      await this.router.navigate(['/problem-list-view']);
    } catch (error) {
      console.error('Error deleting solution:', error);
      this.workspaceAccessError = 'Could not delete this solution. Please try again.';
    } finally {
      this.isDeletingSolution = false;
    }
  }

  async submitLeaveSolution() {
    const solutionId = this.currentSolution?.solutionId || this.id;
    const currentEmail = this.normalizeEmail(this.auth.currentUser?.email);
    if (!solutionId || !currentEmail || this.isLeavingSolution) {
      return;
    }

    this.isLeavingSolution = true;
    this.workspaceAccessMessage = '';
    this.workspaceAccessError = '';

    const participants = this.normalizeParticipantEntries(
      (this.currentSolution as any).participants
    ).filter((participant) => this.normalizeEmail(participant.name) !== currentEmail);
    const participantsHolder = this.normalizeParticipantEntries(
      this.currentSolution.participantsHolder
    ).filter((participant) => this.normalizeEmail(participant.name) !== currentEmail);

    try {
      await this.solution.updateSolutionFields(solutionId, {
        participants: participants as any,
        participantsHolder: participantsHolder as any,
      });
      this.showLeaveSolutionConfirm = false;
      await this.router.navigate(['/problem-list-view']);
    } catch (error) {
      console.error('Error leaving solution:', error);
      this.workspaceAccessError = 'Could not leave this solution. Please try again.';
    } finally {
      this.isLeavingSolution = false;
    }
  }

  async cancelReview() {
    if (!this.currentSolution?.solutionId) return;

    try {
      this.sendingBroadcast = true;
      await this.solution.cancelPendingBySolutionId(
        this.currentSolution.solutionId
      );

      // Reset to pre-publish state
      (this.currentSolution as any).isBroadcasting = false;
      (this.currentSolution as any).broadcastStatus = 'stopped';
      (this.currentSolution as any).broadcastId = null;

      this.profileMessage = 'Review canceled. Not submitted.';
      this.profileSaved = true;
    } catch (e) {
      console.error(e);
      alert('Could not cancel review.');
    } finally {
      this.sendingBroadcast = false;
    }
  }

  // Invite team member methods
  toggleInviteTeamMemberModal() {
    this.showInviteTeamMemberModal = !this.showInviteTeamMemberModal;
    if (!this.showInviteTeamMemberModal) {
      this.newTeamMember = '';
      this.showUserSuggestions = false;
      this.selectedUser = null;
      this.invitedParticipants = [];
      this.pendingParticipants = [];
      this.isAddingParticipant = false;
      this.isSearchingUsers = false;
      if (this.userSearchTimeout) {
        clearTimeout(this.userSearchTimeout);
      }
    }
  }

  /**
   * Hybrid search: Instant client-side filter + server-side fallback
   * - Immediately filters from cached users (instant feedback)
   * - If few/no results, also queries Firestore with debounce
   */
  onTeamMemberInputChange() {
    // Clear any pending server search
    if (this.userSearchTimeout) {
      clearTimeout(this.userSearchTimeout);
    }

    // Reset selected user if input changes
    this.selectedUser = null;

    const searchTerm = this.newTeamMember.toLowerCase().trim();
    
    if (searchTerm.length === 0) {
      this.filteredUsers = [];
      this.showUserSuggestions = false;
      this.isSearchingUsers = false;
      return;
    }

    // STEP 1: Instant client-side filter from cached users
    this.filteredUsers = this.filterUsersLocally(searchTerm);
    this.showUserSuggestions = this.filteredUsers.length > 0;

    // Check if the current input matches an existing user
    const exactMatch = this.allUsers.find(
      (user) => user.email?.toLowerCase() === searchTerm
    );
    if (exactMatch) {
      this.selectedUser = exactMatch;
    }

    // STEP 2: If few results OR searching by email, also query server (debounced)
    if (this.filteredUsers.length < 5 || searchTerm.includes('@')) {
      this.isSearchingUsers = true;
      this.userSearchTimeout = setTimeout(() => {
        this.searchUsersFromServer(searchTerm);
      }, 300);
    }
  }

  /**
   * Filter users from local cache (instant)
   */
  private filterUsersLocally(searchTerm: string): User[] {
    return this.allUsers
      .filter((user) => {
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return (
          firstName.includes(searchTerm) ||
          lastName.includes(searchTerm) ||
          fullName.includes(searchTerm) ||
          email.includes(searchTerm)
        );
      })
      .slice(0, 10);
  }

  /**
   * Search users from Firestore (scalable server-side search)
   */
  private searchUsersFromServer(searchTerm: string): void {
    this.auth.searchUsers(searchTerm, 15).subscribe({
      next: (serverUsers) => {
        // Merge server results with client results, avoiding duplicates
        const existingEmails = new Set(this.filteredUsers.map(u => u.email?.toLowerCase()));
        
        const newResults = serverUsers.filter((user) => {
          const email = (user.email || '').toLowerCase();
          return !existingEmails.has(email);
        });
        
        // Combine results (client results first, then server additions)
        this.filteredUsers = [...this.filteredUsers, ...newResults].slice(0, 12);
        this.showUserSuggestions = this.filteredUsers.length > 0;
        this.isSearchingUsers = false;
      },
      error: (err) => {
        console.error('Server search failed:', err);
        this.isSearchingUsers = false;
      }
    });
  }

  selectUser(user: User) {
    // Just select the user, don't add to pending automatically
    // User can then choose to "Add to List" or "Add Participant"
    this.newTeamMember = user.email || '';
    this.selectedUser = user;
    this.showUserSuggestions = false;
  }

  addEmailToPending() {
    let email = '';
    let name = '';
    let user: User | undefined = undefined;

    // Handle selected user from dropdown
    if (this.selectedUser) {
      email = this.selectedUser.email || '';
      name =
        `${this.selectedUser.firstName} ${this.selectedUser.lastName}`.trim();
      user = this.selectedUser;
    }
    // Handle typed email
    else if (this.data.isValidEmail(this.newTeamMember)) {
      email = this.newTeamMember;
      name = email;
    }
    // Invalid input
    else {
      return;
    }

    // Check if already in pending list
    const alreadyPending = this.pendingParticipants.some(
      (p) => p.email.toLowerCase() === email.toLowerCase()
    );

    if (!alreadyPending) {
      this.pendingParticipants.push({
        email: email,
        name: name,
        user: user,
      });
    }

    // Clear input
    this.newTeamMember = '';
    this.selectedUser = null;
    this.showUserSuggestions = false;
  }

  removePendingParticipant(email: string) {
    this.pendingParticipants = this.pendingParticipants.filter(
      (p) => p.email.toLowerCase() !== email.toLowerCase()
    );
  }

  hideUserSuggestions() {
    // Delay hiding to allow click events on suggestions to fire
    this.userSearchTimeout = setTimeout(() => {
      this.showUserSuggestions = false;
    }, 200);
  }

  async addAllPendingParticipants() {
    if (this.pendingParticipants.length === 0 || this.isAddingParticipant) {
      return;
    }

    this.isAddingParticipant = true;
    const participantsToAdd = [...this.pendingParticipants];

    // Clear pending list immediately for better UX
    this.pendingParticipants = [];

    let participants: any = [];
    participants = this.currentSolution.participants || [];

    // Add all pending participants to the participants array
    participantsToAdd.forEach((pending) => {
      participants.push({ name: pending.email });
    });

    try {
      await this.solution.addParticipantsToSolution(
        participants,
        this.currentSolution.solutionId!
      );

      // Send emails for all participants
      for (const pending of participantsToAdd) {
        const previousNewTeamMember = this.newTeamMember;
        this.newTeamMember = pending.email;
        try {
          await this.sendEmailToParticipant();
        } catch (emailError) {
          console.error(`Error sending email to ${pending.email}:`, emailError);
          // Continue even if email fails
        } finally {
          this.newTeamMember = previousNewTeamMember;
        }
      }

      // Add all to invited list with success status
      participantsToAdd.forEach((pending) => {
        this.invitedParticipants.push({
          email: pending.email,
          name: pending.name,
          status: 'success',
        });

        // Auto-remove success message after 5 seconds
        setTimeout(() => {
          const index = this.invitedParticipants.findIndex(
            (p) => p.email === pending.email && p.status === 'success'
          );
          if (index > -1) {
            this.invitedParticipants.splice(index, 1);
          }
        }, 5000);
      });
    } catch (error) {
      console.error('Error adding participants:', error);
      // Add all to invited list with error status
      participantsToAdd.forEach((pending) => {
        this.invitedParticipants.push({
          email: pending.email,
          name: pending.name,
          status: 'error',
        });

        // Auto-remove error message after 5 seconds
        setTimeout(() => {
          const index = this.invitedParticipants.findIndex(
            (p) => p.email === pending.email && p.status === 'error'
          );
          if (index > -1) {
            this.invitedParticipants.splice(index, 1);
          }
        }, 5000);
      });
    } finally {
      this.isAddingParticipant = false;
    }
  }

  async addParticipantToSolution() {
    if (!this.data.isValidEmail(this.newTeamMember)) {
      // Show error for invalid email
      this.invitedParticipants.push({
        email: this.newTeamMember,
        status: 'error',
      });
      setTimeout(() => {
        const index = this.invitedParticipants.findIndex(
          (p) => p.email === this.newTeamMember && p.status === 'error'
        );
        if (index > -1) {
          this.invitedParticipants.splice(index, 1);
        }
      }, 3000);
      return;
    }

    if (this.isAddingParticipant) {
      return; // Prevent multiple simultaneous adds
    }

    this.isAddingParticipant = true;
    const emailToAdd = this.newTeamMember;
    const userToAdd = this.selectedUser;
    const displayName = userToAdd
      ? `${userToAdd.firstName} ${userToAdd.lastName}`
      : emailToAdd;

    // Store the email before clearing
    this.newTeamMember = '';
    this.selectedUser = null;
    this.showUserSuggestions = false;

    let participants: any = [];
    participants = this.currentSolution.participants || [];
    participants.push({ name: emailToAdd });

    try {
      await this.solution.addParticipantsToSolution(
        participants,
        this.currentSolution.solutionId!
      );

      // Send email - temporarily set newTeamMember for email function
      const previousNewTeamMember = this.newTeamMember;
      this.newTeamMember = emailToAdd;
      try {
        await this.sendEmailToParticipant();
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue even if email fails - participant is still added
      } finally {
        this.newTeamMember = previousNewTeamMember; // Always restore
      }

      // Add to invited list with success status
      this.invitedParticipants.push({
        email: emailToAdd,
        name: displayName,
        status: 'success',
      });

      // Auto-remove success message after 5 seconds
      setTimeout(() => {
        const index = this.invitedParticipants.findIndex(
          (p) => p.email === emailToAdd && p.status === 'success'
        );
        if (index > -1) {
          this.invitedParticipants.splice(index, 1);
        }
      }, 5000);
    } catch (error) {
      console.error('Error adding participant:', error);
      // Add to invited list with error status
      this.invitedParticipants.push({
        email: emailToAdd,
        name: displayName,
        status: 'error',
      });

      // Auto-remove error message after 5 seconds
      setTimeout(() => {
        const index = this.invitedParticipants.findIndex(
          (p) => p.email === emailToAdd && p.status === 'error'
        );
        if (index > -1) {
          this.invitedParticipants.splice(index, 1);
        }
      }, 5000);
    } finally {
      this.isAddingParticipant = false;
    }
  }

  async sendEmailToParticipant() {
    const sendParticipantInvite = this.fns.httpsCallable('sendParticipantInvite');

    try {
      // Fetch the user data to check if they're registered
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(this.newTeamMember)
      );
      const isRegisteredUser = users && users.length > 0;
      const inviterName = `${this.auth.currentUser.firstName || ''} ${this.auth.currentUser.lastName || ''}`.trim() || 'A team member';

      const emailData = {
        email: this.newTeamMember,
        inviterName,
        title: this.currentSolution.title || 'Solution Lab',
        description: this.currentSolution.description || '',
        image: this.currentSolution.image || '',
        path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
        type: 'solution',
        recipientName: isRegisteredUser ? `${users[0].firstName || ''} ${users[0].lastName || ''}`.trim() : '',
        isNewUser: !isRegisteredUser,
      };

      const result = await firstValueFrom(sendParticipantInvite(emailData));
      console.log(`Email sent to ${this.newTeamMember}:`, result);
    } catch (error) {
      console.error(`Error sending invite to ${this.newTeamMember}:`, error);
    }
  }

  private async refreshTeamPresence(): Promise<void> {
    const emails = this.solutionMemberEmails(this.currentSolution);
    this.teamMemberCount = emails.length || (this.currentSolution.authorAccountId ? 1 : 0);

    await Promise.all(emails.map((email) => this.resolveTeamMemberByEmail(email)));

    const uids = new Set<string>();
    const fallbackLastActiveByUid = new Map<string, string | undefined>();
    this.teamMembersByUid.clear();

    emails.forEach((email) => {
      const member = this.teamMembersByEmail.get(this.normalizeEmail(email));
      if (!member?.uid) return;
      uids.add(member.uid);
      this.teamMembersByUid.set(member.uid, member);
      fallbackLastActiveByUid.set(member.uid, member.lastActiveAt);
    });

    if (this.currentSolution.authorAccountId) {
      const author = this.memberFromSolutionAuthor(this.currentSolution);
      if (author) {
        uids.add(author.uid);
        this.teamMembersByUid.set(author.uid, author);
      }
    }

    this.teamPresenceSub?.unsubscribe();
    this.onlineTeamMembers = [];
    this.teamPresenceSub = this.presence
      .watchOnlineUids$(Array.from(uids), fallbackLastActiveByUid)
      .subscribe((onlineUids) => {
        this.onlineTeamMembers = Array.from(onlineUids)
          .map((uid) => this.teamMembersByUid.get(uid))
          .filter((member): member is OnlineTeamMember => !!member);
      });
  }

  private solutionMemberEmails(solution: Solution): string[] {
    const emails = new Set<string>();
    const addEmail = (value: any) => {
      const email = this.normalizeEmail(value?.name || value?.email || value);
      if (email) emails.add(email);
    };

    if (Array.isArray(solution.participants)) {
      solution.participants.forEach(addEmail);
    } else if (solution.participants && typeof solution.participants === 'object') {
      Object.values(solution.participants).forEach(addEmail);
    }
    (solution.participantsHolder || []).forEach(addEmail);
    addEmail(solution.authorEmail);

    return Array.from(emails);
  }

  private isCurrentUserParticipant(): boolean {
    const currentEmail = this.normalizeEmail(this.auth.currentUser?.email);
    if (!currentEmail) return false;
    return this.solutionMemberEmails(this.currentSolution).includes(currentEmail);
  }

  private normalizeParticipantEntries(value: any): Array<{ name: string }> {
    const participants = new Map<string, { name: string }>();
    const addParticipant = (entry: any) => {
      const email = this.normalizeEmail(entry?.name || entry?.email || entry);
      if (email) {
        participants.set(email, { name: email });
      }
    };

    if (Array.isArray(value)) {
      value.forEach(addParticipant);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(addParticipant);
    }

    return Array.from(participants.values());
  }

  private async resolveTeamMemberByEmail(
    email: string
  ): Promise<OnlineTeamMember | null> {
    const normalizedEmail = this.normalizeEmail(email);
    if (this.teamMembersByEmail.has(normalizedEmail)) {
      return this.teamMembersByEmail.get(normalizedEmail) || null;
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
      this.teamMembersByEmail.set(normalizedEmail, member);
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
      this.teamMembersByEmail.set(normalizedEmail, member);
      return member;
    } catch {
      this.teamMembersByEmail.set(normalizedEmail, null);
      return null;
    }
  }

  private memberFromSolutionAuthor(solution: Solution): OnlineTeamMember | null {
    if (!solution.authorAccountId) return null;
    return {
      email: this.normalizeEmail(solution.authorEmail || ''),
      displayName: solution.authorName || solution.authorEmail || 'Solution owner',
      uid: solution.authorAccountId,
    };
  }

  private normalizeEmail(value: any): string {
    return String(value || '').trim().toLowerCase();
  }
}
