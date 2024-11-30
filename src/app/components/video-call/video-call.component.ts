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
} from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

import { ActivatedRoute, Router } from '@angular/router';
import * as SimplePeer from 'simple-peer';
import { Comment, Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
interface Participant {
  id: string;
  sessionId: string;
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
    public solution: SolutionService,
    private afs: AngularFirestore // not the best idea but to generate new ids
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
    this.sessionId = this.afs.createId();
    window.addEventListener('beforeunload', this.cleanup.bind(this));
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

      await this.solution.addParticipant(
        this.solutionId,
        this.userId,
        this.sessionId
      );
      this.setupSignaling();

      // Since we're using solutions, no need to create a room
      // await this.signalingService.createRoom(this.solutionId);
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
    // Listen for participants
    this.solution.getParticipants(this.solutionId).subscribe(
      (participants) => {
        const participantMap = new Map<string, string>();
        participants.forEach((p) => {
          participantMap.set(p.userId, p.sessionId);
        });

        // Add new participants or participants with new sessions
        participantMap.forEach((sessionId, participantId) => {
          if (participantId === this.userId) return;

          const peerKey = `${participantId}_${sessionId}`;

          if (!this.peers[peerKey]) {
            console.log(
              `Adding participant ${participantId} with session ${sessionId}`
            );
            this.peers[peerKey] = this.createPeer(participantId, sessionId);
          }
        });

        // Remove participants who have left or restarted their session
        Object.keys(this.peers).forEach((peerKey) => {
          const [peerId, peerSessionId] = peerKey.split('_');
          const currentSessionId = participantMap.get(peerId);

          if (!currentSessionId || currentSessionId !== peerSessionId) {
            console.log(
              `Participant ${peerId} with session ${peerSessionId} has left or restarted`
            );
            this.peers[peerKey].destroy();
            delete this.peers[peerKey];
            this.participants = this.participants.filter(
              (p) => p.id !== peerId || p.sessionId !== peerSessionId
            );
          }
        });
      },
      (error) => console.error('Error fetching participants:', error)
    );

    // Listen for signals intended for us
    this.solution
      .getSignals(this.solutionId, this.userId, this.sessionId)
      .subscribe(
        (signals) => {
          signals.forEach((signal) => {
            const senderId = signal.senderId;
            const senderSessionId = signal.senderSessionId;
            const peerKey = `${senderId}_${senderSessionId}`;

            if (!this.peers[peerKey] || this.peers[peerKey].destroyed) {
              console.warn(
                `Cannot signal destroyed or nonexistent peer: ${senderId} with session ${senderSessionId}`
              );
              this.solution.deleteSignal(this.solutionId, signal.id);
              return;
            }
            try {
              this.peers[peerKey].signal(signal.signal);
            } catch (error) {
              console.error(`Error signaling peer ${senderId}:`, error);
            }

            // Clean up the signal
            this.solution.deleteSignal(this.solutionId, signal.id);
          });
        },
        (error) => {
          console.error('Error fetching signals:', error);
          // Handle the error appropriately
        }
      );
  }

  createPeer(
    remoteUserId: string,
    remoteSessionId: string
  ): SimplePeer.Instance {
    const userIds = [this.userId, remoteUserId].sort();
    const initiator = this.userId === userIds[1];

    console.log(`Creating peer with ${remoteUserId}, initiator: ${initiator}`);

    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false,
      stream: this.localStream!,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });

    peer.on('signal', (data) => {
      const sanitizedSignal = this.sanitizeSignal(data);
      this.solution.sendSignal(this.solutionId, {
        senderId: this.userId,
        senderSessionId: this.sessionId,
        receiverId: remoteUserId,
        receiverSessionId: remoteSessionId,
        signal: sanitizedSignal,
      });
    });

    peer.on('stream', (stream) => {
      const existingParticipant = this.participants.find(
        (p) => p.id === remoteUserId && p.sessionId === remoteSessionId
      );
      if (!existingParticipant) {
        this.participants.push({
          id: remoteUserId,
          sessionId: remoteSessionId,
          stream: stream,
        });
      } else {
        existingParticipant.stream = stream;
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
        (p) => p.id !== remoteUserId || p.sessionId !== remoteSessionId
      );
      const peerKey = `${remoteUserId}_${remoteSessionId}`;
      delete this.peers[peerKey];
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
    return `${participant.id}_${participant.sessionId}`;
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
    this.solution.deleteSignalsBySender(
      this.solutionId,
      this.userId,
      this.sessionId
    );
  }
}
