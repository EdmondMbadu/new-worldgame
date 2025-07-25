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
    return `https://newworldgame.org/solve/${
      this.currentSolution.solutionId || this.id
    }`;
  }

  copyInviteLink() {
    navigator.clipboard.writeText(this.generatedInviteLink);
    // toast/snackbar...
  }

  askBuckyForPitch() {
    // Call your AI service
    // this.currentSolution.broadCastInviteMessage = await buckyService.improvePitch(...);
  }

  sendBroadcast() {
    // Build payload from fields & channels
    // Call backend; show success; close modal
  }
}
