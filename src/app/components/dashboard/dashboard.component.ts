import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
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
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.solution.getSolution(this.id).subscribe((data: any) => {
      this.currentSolution = data;
    });
  }
  // In your component
  showBroadcastModal = false;
  toggleBroadcastModal() {
    this.showBroadcastModal = !this.showBroadcastModal;
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
  selectPlan(plan: 'plus' | 'pro') {
    // TODO: redirect to checkout, or call your backend, etc.
    console.log('Selected plan:', plan);
    // After purchase or redirect:
    // this.toggleInviteModal();
  }
  // In your TS

  get generatedInviteLink(): string {
    return `join/${this.currentSolution.solutionId || this.id}`;
  }

  get allBroadcasts(): string {
    return `broadcasts/`;
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.generatedInviteLink);
    // toast/snackbar...
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
      this.toggleBroadcastModal();
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

  // Stop button in tile should not open modal
  onStopTile(ev: Event) {
    ev.stopPropagation();
    this.stopBroadcast();
  }
}
