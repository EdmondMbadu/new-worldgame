import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Solution,
  SolutionRecruitmentProfile,
} from 'src/app/models/solution';
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
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
      this.ensureRecruitmentProfile();
      this.profileSaved = false;
      this.profileMessage = '';
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
        this.currentSolution.solutionArea || this.currentSolution.sdgs?.join(', ') || '',
      challengeDescription: '',
      scopeOfWork: '',
      finalProduct: '',
      startDate: '',
      completionDate: '',
      timeCommitment: '3 hours per week',
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
    if (!this.currentSolution?.solutionId || !this.currentSolution.recruitmentProfile) {
      return;
    }

    this.savingProfile = true;
    this.profileSaved = false;
    this.profileMessage = '';

    const payload: SolutionRecruitmentProfile = {
      ...this.currentSolution.recruitmentProfile,
      teamSizeMin: this.toNumber(this.currentSolution.recruitmentProfile.teamSizeMin),
      teamSizeMax: this.toNumber(this.currentSolution.recruitmentProfile.teamSizeMax),
    };

    try {
      await this.solution.updateSolutionField(
        this.currentSolution.solutionId,
        'recruitmentProfile',
        payload
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

  // Update sendBroadcast()
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

      const id = await this.solution.startBroadcast(payload);

      // optional toast
      alert('Broadcast sent! Your solution is now discoverable.');
      this.toggleInviteModal();
    } catch (e) {
      console.error(e);
      alert('Sorry, broadcast failed. Please try again.');
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
  get isBroadcasting(): boolean {
    // Treat as broadcasting when explicitly marked AND not stopped
    const status = (this.currentSolution as any)?.broadcastStatus as
      | 'active'
      | 'paused'
      | 'stopped'
      | undefined;
    return (
      (this.currentSolution as any)?.isBroadcasting === true &&
      status !== 'stopped'
    );
  }

  get broadcastStatus(): 'active' | 'paused' | 'stopped' {
    const status = (this.currentSolution as any)?.broadcastStatus as
      | 'active'
      | 'paused'
      | 'stopped'
      | undefined;
    return status ?? 'active';
  }

}
