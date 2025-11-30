import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  ViewChild,
  OnInit,
  OnDestroy,
  AfterViewChecked,
  AfterViewInit,
  Directive,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

import { ActivatedRoute, Router } from '@angular/router';
import { Comment, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Participant {
  id: string;
  sessionId: string;
  stream: MediaStream | null;
  firstName?: string;
  lastName?: string;
}
@Component({
  selector: 'app-video-call',
  template: '',
  styleUrl: './video-call.component.css',
})
export class VideoCallComponent
  implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy
{
  constructor(
    public auth: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public data: DataService,
    public solution: SolutionService,
    private afs: AngularFirestore, // not the best idea but to generate new ids
    private cdr: ChangeDetectorRef, // Inject ChangeDetectorRef // <-- Inject the service
    private fns: AngularFireFunctions
  ) {}
  dark: boolean = false;

  currentSolution: Solution = {};

  discussion: Comment[] | undefined = [];
  users: User[] = [];
  participants: Participant[] = [];
  solutionId: any = '';
  sessionId: string = '';
  userId: string = '';
  isAudioMuted = false;
  isVideoMuted = false;
  solutionTitle: string = '';
  private negotiationLock: boolean = false;
  localStream: MediaStream | null = null;
  private participantSessions: { [id: string]: string } = {};

  private maxConnectionRetries: number = 10;
  private iceServers: RTCIceServer[] = [];

  // Screen share related states
  activeScreenSharer: Participant | null = null;
  isScreenSharing = false;
  private originalVideoTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  remoteAnswered = false; // Track if we've processed an answer

  @ViewChild('scrollingVideo') scrollingVideo!: ElementRef<HTMLDivElement>;
  @ViewChild('localVideo')
  localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChildren('remoteVideo') remoteVideos!: QueryList<
    ElementRef<HTMLVideoElement>
  >;

  async ngOnInit() {
    // this.cleanup();
    this.userId = this.auth.currentUser.uid; // Get the current user's unique ID
    this.solutionId = this.activatedRoute.snapshot.paramMap.get('id');
    // redirect user to meeting component:
    this.router.navigate(['/meeting/' + this.solutionId]);
    // this.initializeContent();
  }

  async initializeContent() {
    this.maxConnectionRetries = 6;
    this.sessionId = this.afs.createId();
    window.addEventListener('beforeunload', this.cleanup.bind(this));
    this.solution.getSolution(this.solutionId).subscribe((data: any) => {
      this.currentSolution = data;
      if (this.currentSolution.title) {
        this.solutionTitle = this.currentSolution.title;
        console.log('the solution title is', this.solutionTitle);
      }

      this.discussion = this.currentSolution.discussion;
      // Update layout based on activeScreenSharer
      const sharerId = data.activeScreenSharer || null;
      if (sharerId) {
        // Find participant with sharerId
        const sharerParticipant = this.participants.find(
          (p) => p.id === sharerId
        );
        if (sharerParticipant) {
          this.activeScreenSharer = sharerParticipant;
        } else {
          // If not found yet, will set when participant streams come in
          this.activeScreenSharer = {
            id: sharerId,
            sessionId: '',
            stream: null,
          };
        }
      } else {
        this.activeScreenSharer = null;
      }
      this.cdr.detectChanges();
    });

    this.dark = true;
    const darkModeInitialized = localStorage.getItem('darkModeInitialized');

    if (!darkModeInitialized) {
      // set the default to dark mode if and only if not initialized before
      this.data.darkModeInitial();

      // Mark dark mode as initialized so it doesn't run again
      localStorage.setItem('darkModeInitialized', 'true');
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      await this.solution.addParticipant(
        this.solutionId,
        this.userId,
        this.sessionId
      );

      // Now fetch the ICE servers using the onCall function
      const getIceServersFunc = this.fns.httpsCallable('getIceServers');
      getIceServersFunc({}).subscribe(
        (result: { iceServers: RTCIceServer[] }) => {
          this.iceServers = result.iceServers;
          console.log('Fetched ICE servers:', this.iceServers);
        },
        (error: any) => {
          console.error('Error fetching ICE servers:', error);
          // fallback to default STUN server if needed
          this.iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        }
      );
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  }
  ngAfterViewInit() {
    if (this.localStream) {
      this.localVideo.nativeElement.srcObject = this.localStream;
    }
  }
  ngAfterViewChecked() {
    this.remoteVideos.forEach((videoElement, index) => {
      const participant = this.participants[index];
      if (participant && participant.stream) {
        if (videoElement.nativeElement.srcObject !== participant.stream) {
          videoElement.nativeElement.srcObject = participant.stream;
        }
      }
    });
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.cleanup.bind(this));
    // Close all peer connections
    this.cleanup();
  }

  scrollLeft() {
    this.scrollingVideo.nativeElement.scrollBy({
      left: -300,
      behavior: 'smooth',
    });
  }

  scrollRight() {
    this.scrollingVideo.nativeElement.scrollBy({
      left: 300,
      behavior: 'smooth',
    });
  }

  setupSignaling() {
    // Signaling functionality removed - SimplePeer no longer used
  }


  toggleAudio() {
    this.isAudioMuted = !this.isAudioMuted;
    this.localStream!.getAudioTracks().forEach((track) => {
      track.enabled = !this.isAudioMuted;
    });
  }

  toggleVideo() {
    this.isVideoMuted = !this.isVideoMuted;
    this.localStream!.getVideoTracks().forEach((track) => {
      track.enabled = !this.isVideoMuted;
    });
  }
  async toggleScreenShare() {
    if (!this.isScreenSharing) {
      // Start screen share
      try {
        const screenStream = await (
          navigator.mediaDevices as any
        ).getDisplayMedia({ video: true });
        this.screenTrack = screenStream.getVideoTracks()[0];

        if (this.localStream) {
          this.originalVideoTrack = this.localStream.getVideoTracks()[0];
          this.localStream.removeTrack(this.originalVideoTrack);
          this.localStream.addTrack(this.screenTrack!);

          this.isScreenSharing = true;

          // Update Firestore to indicate current sharer
          await this.afs.doc(`solutions/${this.solutionId}`).update({
            activeScreenSharer: this.userId,
          });

          // Handle ending from browser UI
          this.screenTrack!.onended = () => {
            this.stopScreenShare();
          };
        }
      } catch (err) {
        console.error('Error starting screen share', err);
      }
    } else {
      this.stopScreenShare();
    }
  }

  async stopScreenShare() {
    if (!this.isScreenSharing) return;

    if (this.screenTrack && this.localStream && this.originalVideoTrack) {
      this.localStream.removeTrack(this.screenTrack);
      this.localStream.addTrack(this.originalVideoTrack);

      this.screenTrack.stop();
      this.screenTrack = null;
      this.originalVideoTrack = null;
      this.isScreenSharing = false;

      // Update Firestore to clear the active sharer
      await this.afs.doc(`solutions/${this.solutionId}`).update({
        activeScreenSharer: null,
      });

      if (
        this.activeScreenSharer &&
        this.activeScreenSharer.id === this.userId
      ) {
        this.activeScreenSharer = null;
      }
    }
  }


  leaveCall() {
    this.cleanup();
    // Navigate away or update UI accordingly
    this.router.navigate(['/playground-steps/' + this.solutionId]);
  }
  trackById(index: number, participant: Participant) {
    return `${participant.id}_${participant.sessionId}`;
  }
  cleanup() {
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Clear participants
    this.participants = [];

    // Remove participant
    this.solution.removeParticipant(this.solutionId, this.userId);
    // If you are the active sharer, stop sharing on cleanup
    if (this.isScreenSharing) {
      this.stopScreenShare();
    }
    // Delete signals sent by this user
    this.solution.deleteSignalsBySender(
      this.solutionId,
      this.userId,
      this.sessionId
    );
  }

  inviteEveryone() {}
}
