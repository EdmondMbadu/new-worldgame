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
export class VideoCallComponent
  implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy
{
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
  private negotiationLock: boolean = false;
  private peers: { [id: string]: SimplePeer.Instance } = {};
  localStream: MediaStream | null = null;
  private participantSessions: { [id: string]: string } = {};

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
    console.log('\n\nthis is the id! ', this.solutionId);
    this.solution.getSolution(this.solutionId).subscribe((data: any) => {
      this.currentSolution = data;
      this.discussion = this.currentSolution.discussion;
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
      if (this.localStream) {
        this.localVideo.nativeElement.srcObject = this.localStream;
      }

      // Since we're using solutions, no need to create a room
      // await this.signalingService.createRoom(this.solutionId);
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
    await this.solution.addParticipant(this.solutionId, this.userId);
    this.setupSignaling();
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
  }

  ngOnDestroy() {
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
    // Listen for participants
    this.solution.getParticipants(this.solutionId).subscribe(
      (participants) => {
        participants.forEach((participant) => {
          const participantId = participant.userId;

          if (participantId === this.userId) return;

          // Create new peer
          if (!this.peers[participantId]) {
            console.log(`Adding participant ${participantId}`);
            this.peers[participantId] = this.createPeer(participantId);
          }
        });

        // Handle removed participants
        const participantIds = participants.map((p) => p.userId);
        const currentPeerIds = Object.keys(this.peers);
        currentPeerIds.forEach((peerId) => {
          if (!participantIds.includes(peerId)) {
            console.log(`Participant ${peerId} has left`);
            // Close the peer connection
            this.peers[peerId].destroy();
            delete this.peers[peerId];
            // Remove from participants list
            this.participants = this.participants.filter(
              (p) => p.id !== peerId
            );
            // Remove sessionId
            // delete this.participantSessions[peerId];
          }
        });
      },
      (error) => console.error('Error fetching participants:', error)
    );

    // Listen for signals intended for us
    this.solution
      .getSignals(this.solutionId, this.userId)
      .subscribe((signals) => {
        signals.forEach((signal) => {
          const senderId = signal.senderId;
          if (!this.peers[senderId] || this.peers[senderId].destroyed) {
            console.warn(
              `Cannot signal destroyed or nonexistent peer: ${senderId}`
            );
            // Optionally, delete the signal if the peer no longer exists
            this.solution.deleteSignal(this.solutionId, signal.id);
            return;
          }
          try {
            this.peers[senderId].signal(signal.signal);
          } catch (error) {
            console.error(`Error signaling peer ${senderId}:`, error);
          }

          // Clean up the signal
          this.solution.deleteSignal(this.solutionId, signal.id);
        });
      });
  }
  hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i);
    }
    return hash;
  }
  createPeer(remoteUserId: string): SimplePeer.Instance {
    const myHash = this.hashCode(this.userId);
    const remoteHash = this.hashCode(remoteUserId);
    const initiator = myHash > remoteHash;

    console.log(`Creating peer with ${remoteUserId}, initiator: ${initiator}`);

    // const initiator = this.userId < remoteUserId;
    // const initiator = this.userId.localeCompare(remoteUserId) < 0;
    console.log(`Creating peer with ${remoteUserId}, initiator: ${initiator}`);
    console.log(
      `User ID: ${this.userId}, Remote User ID: ${remoteUserId}, Initiator: ${initiator}`
    );

    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false,
      stream: this.localStream!,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });

    peer.on('signal', (data) => {
      // Sanitize the signal data by removing undefined values
      const sanitizedSignal = this.sanitizeSignal(data);
      this.solution.sendSignal(this.solutionId, {
        senderId: this.userId,
        receiverId: remoteUserId,
        signal: sanitizedSignal,
      });
    });

    peer.on('stream', (stream) => {
      if (!this.participants.some((p) => p.id === remoteUserId)) {
        this.participants.push({
          id: remoteUserId,
          stream: stream,
        });
      }
    });

    peer.on('connect', () => {
      console.log('Connected to peer:', remoteUserId);
    });

    peer.on('error', (err) => {
      console.error('Peer error with', remoteUserId, err);
    });

    peer.on('close', () => {
      console.log('Connection closed with', remoteUserId);
      // Remove participant
      this.participants = this.participants.filter(
        (p) => p.id !== remoteUserId
      );
      delete this.peers[remoteUserId];
      delete this.participantSessions[remoteUserId];
    });

    return peer;
  }

  sanitizeSignal(signal: any): any {
    return JSON.parse(JSON.stringify(signal));
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
    this.cleanup();
    // Navigate away or update UI accordingly
    this.router.navigate(['/playground-steps/' + this.solutionId]);
  }
  trackById(index: number, participant: Participant) {
    return participant.id;
  }
  cleanup() {
    // Close all peer connections
    Object.values(this.peers).forEach((peer) => peer.destroy());
    this.peers = {};

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Clear participants
    this.participants = [];

    // Remove participant
    this.solution.removeParticipant(this.solutionId, this.userId);

    // Delete signals sent by this user
    this.solution.deleteSignalsBySender(this.solutionId, this.userId);
  }
}
