import {
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as SimplePeer from 'simple-peer';
import { Comment, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Participant {
  id: string;
  stream: MediaStream | null;
}
@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrl: './video-call.component.css',
})
export class VideoCallComponent {
  constructor(
    public auth: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    public data: DataService,
    public solution: SolutionService
  ) {}
  dark: boolean = false;

  currentSolution: Solution = {};
  discussion: Comment[] | undefined = [];
  users: User[] = [];
  participants: Participant[] = [];
  solutionId: any = '';
  userId: string = '';
  isAudioMuted = false;
  isVideoMuted = false;

  private peers: { [id: string]: SimplePeer.Instance } = {};
  localStream: MediaStream | null = null;

  @ViewChild('scrollingVideo') scrollingVideo!: ElementRef<HTMLDivElement>;
  @ViewChild('localVideo')
  localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChildren('remoteVideo') remoteVideos!: QueryList<
    ElementRef<HTMLVideoElement>
  >;

  async ngOnInit() {
    this.userId = this.auth.currentUser.uid; // Get the current user's unique ID
    console.log('This user is: ', this.users);
    this.solutionId = this.activatedRoute.snapshot.paramMap.get('id');
    console.log('\n\nthis is the id! ', this.solutionId);
    this.solution.getSolution(this.solutionId).subscribe((data: any) => {
      this.currentSolution = data;
      this.discussion = this.currentSolution.discussion;
      // console.log('\n\nthis is the solution!! ', this.currentSolution);
    });
    // this.applyTheme();
    // // this.darkModeInitial();
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
      if (this.localStream) {
        this.localVideo.nativeElement.srcObject = this.localStream;
      }

      // Since we're using solutions, no need to create a room
      // await this.signalingService.createRoom(this.solutionId);

      this.setupSignaling();
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
        videoElement.nativeElement.srcObject = participant.stream;
      }
    });
  }

  ngOnDestroy() {
    // Close all peer connections
    Object.values(this.peers).forEach((peer) => peer.destroy());
    this.peers = {};

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
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
    this.solution.getSignals(this.solutionId).subscribe((signals) => {
      signals.forEach((signal) => {
        const senderId = signal.senderId;
        if (senderId === this.userId) return; // Ignore own signals

        if (!this.peers[senderId]) {
          this.peers[senderId] = this.createPeer(false, senderId);
        }
        this.peers[senderId].signal(signal.signal);
      });
    });

    // Start the connection as an initiator
    Object.keys(this.peers).forEach((peerId) => {
      if (peerId !== this.userId) {
        this.peers[peerId].destroy();
        delete this.peers[peerId];
      }
    });

    // Broadcast your own signal
    this.createPeer(true);
  }

  createPeer(initiator: boolean, remoteUserId?: string): SimplePeer.Instance {
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false,
      stream: this.localStream!,
    });

    peer.on('signal', (data) => {
      this.solution.sendSignal(this.solutionId, {
        senderId: this.userId,
        signal: data,
      });
    });

    peer.on('stream', (stream) => {
      this.participants.push({
        id: remoteUserId!,
        stream: stream,
      });
    });

    return peer;
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

  leaveCall() {
    // Close all peer connections
    Object.values(this.peers).forEach((peer) => peer.destroy());
    this.peers = {};
    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    // Navigate away or update UI accordingly
    this.router.navigate(['/playground-steps/' + this.solutionId]);
  }
}
