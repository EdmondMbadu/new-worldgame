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
  firstName?: string;
  lastName?: string;
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
    private afs: AngularFirestore, // not the best idea but to generate new ids
    private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
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
  private peers: { [id: string]: SimplePeer.Instance } = {};
  localStream: MediaStream | null = null;
  private participantSessions: { [id: string]: string } = {};

  // Screen share related states
  activeScreenSharer: Participant | null = null;
  isScreenSharing = false;
  private originalVideoTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;

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
    // const initiator = this.userId === userIds[1];
    const initiator = this.userId < remoteUserId;

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
      // Check if participant already exists
      const existingParticipant = this.participants.find(
        (p) => p.id === remoteUserId && p.sessionId === remoteSessionId
      );
      // Determine if this is likely a screen share
      const track = stream.getVideoTracks()[0];
      const isRemoteScreenShare = track && track.label.includes('screen');

      if (!existingParticipant) {
        // Fetch user details and add participant
        this.auth.getAUser(remoteUserId).subscribe((data) => {
          const currentUser = data;

          // Ensure no duplicate participants are added (double-check before pushing)
          const alreadyExists = this.participants.some(
            (p) => p.id === remoteUserId && p.sessionId === remoteSessionId
          );

          if (!alreadyExists) {
            const newParticipant: Participant = {
              id: remoteUserId,
              sessionId: remoteSessionId,
              stream: stream,
              firstName: currentUser?.firstName,
              lastName: currentUser?.lastName,
            };
            this.participants.push(newParticipant);
            if (isRemoteScreenShare) {
              this.activeScreenSharer = newParticipant;
            }
            // Force UI refresh if needed (Angular Change Detection)
            this.cdr.detectChanges();
          }
        });
      } else {
        // Update the stream for the existing participant
        existingParticipant.stream = stream;
        if (isRemoteScreenShare) {
          this.activeScreenSharer = existingParticipant;
        } else if (
          this.activeScreenSharer &&
          this.activeScreenSharer.id === remoteUserId
        ) {
          // They were screen sharing before, now replaced with normal video
          this.activeScreenSharer = null;
        }
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
      if (
        this.activeScreenSharer &&
        this.activeScreenSharer.id === remoteUserId
      ) {
        this.activeScreenSharer = null;
      }
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

          this.replaceTrackInPeers(this.originalVideoTrack, this.screenTrack!);
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

      this.replaceTrackInPeers(this.screenTrack, this.originalVideoTrack);

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

  replaceTrackInPeers(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack) {
    Object.values(this.peers).forEach((peer: any) => {
      const senders = peer._pc
        .getSenders()
        .filter((s: any) => s.track === oldTrack);
      if (senders.length > 0) {
        senders[0].replaceTrack(newTrack);
      }
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
