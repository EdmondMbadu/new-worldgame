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
    Object.values(this.peers).forEach((peer) => peer.destroy());
    this.peers = {};

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.solution.removeParticipant(this.solutionId, this.userId);
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
      (participantIds) => {
        participantIds.forEach((participantId) => {
          if (participantId === this.userId) return;

          if (!this.peers[participantId]) {
            this.peers[participantId] = this.createPeer(participantId);
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

          if (!this.peers[senderId]) {
            this.peers[senderId] = this.createPeer(senderId);
          }

          this.peers[senderId].signal(signal.signal);

          // Clean up the signal
          this.solution.deleteSignal(this.solutionId, signal.id);
        });
      });
  }
  createPeer(remoteUserId: string): SimplePeer.Instance {
    const initiator = this.userId < remoteUserId;
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false,
      stream: this.localStream!,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
      // debug: true, // Enable debug logging
    });

    peer.on('signal', (data) => {
      this.solution.sendSignal(this.solutionId, {
        senderId: this.userId,
        receiverId: remoteUserId,
        signal: data,
      });
    });

    peer.on('stream', (stream) => {
      // Avoid duplicates
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
  trackById(index: number, participant: Participant) {
    return participant.id;
  }
}
