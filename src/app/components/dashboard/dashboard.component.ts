import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Solution, SolutionRecruitmentProfile } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
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
  
  // Invite team member modal
  showInviteTeamMemberModal = false;
  newTeamMember: string = '';
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  showUserSuggestions = false;
  private suggestionTimeout: any;
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.ensureRecruitmentProfile();
      this.profileSaved = false;
      this.profileMessage = '';
    });
    
    // Load all users for autocomplete
    this.auth.getALlUsers().subscribe((users) => {
      this.allUsers = users;
    });
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
      broadCastInviteMessage:
        this.currentSolution.broadCastInviteMessage ?? '',
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

  get broadcastStatus(): 'active' | 'paused' | 'stopped' | 'pending' {
    const status = (this.currentSolution as any)?.broadcastStatus as any;
    return status ?? 'stopped';
  }

  async cancelReview() {
  if (!this.currentSolution?.solutionId) return;

  try {
    this.sendingBroadcast = true;
    await this.solution.cancelPendingBySolutionId(this.currentSolution.solutionId);

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
      if (this.suggestionTimeout) {
        clearTimeout(this.suggestionTimeout);
      }
    }
  }

  onTeamMemberInputChange() {
    // Clear any pending timeout
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }
    
    const searchTerm = this.newTeamMember.toLowerCase().trim();
    if (searchTerm.length > 0) {
      this.filteredUsers = this.allUsers.filter((user) => {
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
      }).slice(0, 10); // Limit to 10 results
      this.showUserSuggestions = this.filteredUsers.length > 0;
    } else {
      this.filteredUsers = [];
      this.showUserSuggestions = false;
    }
  }

  selectUser(user: User) {
    this.newTeamMember = user.email || '';
    this.showUserSuggestions = false;
  }

  hideUserSuggestions() {
    // Delay hiding to allow click events on suggestions to fire
    this.suggestionTimeout = setTimeout(() => {
      this.showUserSuggestions = false;
    }, 200);
  }

  async addParticipantToSolution() {
    let participants: any = [];
    if (this.data.isValidEmail(this.newTeamMember)) {
      participants = this.currentSolution.participants || [];
      participants.push({ name: this.newTeamMember });

      this.solution
        .addParticipantsToSolution(
          participants,
          this.currentSolution.solutionId!
        )
        .then(() => {
          alert(`Successfully added ${this.newTeamMember} to the solution.`);
          this.toggleInviteTeamMemberModal();
        })
        .catch((error) => {
          alert('Error occurred while adding a team member. Try Again!');
        });
      await this.sendEmailToParticipant();
      this.newTeamMember = '';
    } else {
      alert('Enter a valid email!');
    }
  }

  async sendEmailToParticipant() {
    const genericEmail = this.fns.httpsCallable('genericEmail');
    const nonUserEmail = this.fns.httpsCallable('nonUserEmail');

    try {
      // Fetch the user data
      const users = await firstValueFrom(
        this.auth.getUserFromEmail(this.newTeamMember)
      );
      console.log('extracted user from email', users);
      console.log('the new solution data', this.currentSolution);

      if (users && users.length > 0) {
        // Participant is a registered user
        const emailData = {
          email: this.newTeamMember,
          subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
          title: `${this.currentSolution.title}`,
          description: `${this.currentSolution.description}`,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: `${this.currentSolution.image}`,
          path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
          user: `${users[0].firstName} ${users[0].lastName}`,
        };

        const result = await firstValueFrom(genericEmail(emailData));
        console.log(`Email sent to ${this.newTeamMember}:`, result);
      } else {
        // Participant is NOT a registered user
        const emailData = {
          email: this.newTeamMember,
          subject: `You Have Been Invited to Join a Solution Lab (NewWorld Game)`,
          title: this.currentSolution.title,
          description: this.currentSolution.description,
          author: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
          image: this.currentSolution.image,
          path: `https://newworld-game.org/playground-steps/${this.currentSolution.solutionId}`,
        };

        const result = await firstValueFrom(nonUserEmail(emailData));
        console.log(`Email sent to ${this.newTeamMember}:`, result);
      }
    } catch (error) {
      console.error(
        `Error processing participant ${this.newTeamMember}:`,
        error
      );
    }
  }

}
