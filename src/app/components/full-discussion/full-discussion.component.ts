import {
  Component,
  Input,
  OnInit,
  AfterViewChecked,
  OnDestroy,
  NgZone,
  ElementRef,
  ViewChild,
} from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import {
  Attachment,
  Comment,
  CommentReply,
  Solution,
} from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DiscussionNotificationsService } from 'src/app/services/discussion-notifications.service';
import {
  PresenceService,
  TypingPresence,
} from 'src/app/services/presence.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

interface ParticipantInfo {
  email: string;
  displayName: string;
  uid?: string;
  lastActiveAt?: string;
  isOnline?: boolean;
  isAI?: boolean;
  avatarPath?: string;
  collectionKey?: string;
  provider?: AIProvider;
  providerLabel?: string;
  model?: string;
  description?: string;
}

type AIProvider = 'google' | 'xai';
type DiscussionParticipationMode = 'mentions' | 'roundtable';

interface AIAvatar {
  name: string;
  avatarPath?: string;
  collectionKey: string;
  group: 'colleague' | 'elder';
  provider: AIProvider;
  providerLabel: string;
  model?: string;
  description: string;
}

interface DiscussionRoom {
  id: string;
  name: string;
  description?: string;
  isGeneral?: boolean;
  createdAt?: string;
  createdBy?: string;
  aiMemberKeys?: string[];
  participationMode?: DiscussionParticipationMode;
  roundLimit?: number;
  settingsVersion?: number;
  discussion?: Comment[];
}

const AI_AVATARS: AIAvatar[] = [
  { name: 'Zara Nkosi', avatarPath: '../../../assets/img/zara-agent.png', collectionKey: 'zara', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Community-centered research and inclusive strategy.' },
  { name: 'Arjun Patel', avatarPath: '../../../assets/img/arjun-agent.png', collectionKey: 'arjun', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Technology, implementation, and systems analysis.' },
  { name: 'Sofia Morales', avatarPath: '../../../assets/img/sofia-agent.png', collectionKey: 'sofia', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Policy, partnerships, and stakeholder perspectives.' },
  { name: 'Li Wei', avatarPath: '../../../assets/img/li-agent.png', collectionKey: 'li', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Evidence synthesis and practical planning.' },
  { name: 'Amina Al-Sayed', avatarPath: '../../../assets/img/amina-agent.png', collectionKey: 'amina', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Equity, resilience, and community impact.' },
  { name: 'Elena Volkov', avatarPath: '../../../assets/img/elena-agent.png', collectionKey: 'elena', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Science, evaluation, and risk analysis.' },
  { name: 'Tane Kahu', avatarPath: '../../../assets/img/tane-agent.png', collectionKey: 'tane', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Ecological knowledge and long-term stewardship.' },
  { name: 'Dr. Logos', avatarPath: '../../../assets/img/logos.png', collectionKey: 'business', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Business models, feasibility, and execution.' },
  { name: 'Marie Curie', avatarPath: '../../../assets/img/marie-curie.jpg', collectionKey: 'marie', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'Scientific rigor and experimental thinking.' },
  { name: 'Rachel Carson', avatarPath: '../../../assets/img/rachel-carlson.jpeg', collectionKey: 'rachel', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'Environmental evidence and public communication.' },
  { name: 'Buckminster Fuller', avatarPath: '../../../assets/img/fuller.jpg', collectionKey: 'bucky', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'Whole-systems design and synthesis.' },
  { name: 'Albert Einstein', avatarPath: '../../../assets/img/albert.png', collectionKey: 'albert', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'First-principles reasoning and thought experiments.' },
  { name: 'Nelson Mandela', avatarPath: '../../../assets/img/mandela.png', collectionKey: 'nelson', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'Leadership, reconciliation, and coalition building.' },
  { name: 'Mahatma Gandhi', avatarPath: '../../../assets/img/gandhi.jpg', collectionKey: 'gandhi', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'Nonviolent action and ethical reflection.' },
  { name: 'Mark Twain', avatarPath: '../../../assets/img/twain.jpg', collectionKey: 'twain', group: 'elder', provider: 'google', providerLabel: 'Google', description: 'A concise, skeptical literary perspective.' },
  { name: 'Gemini', collectionKey: 'google-gemini', group: 'colleague', provider: 'google', providerLabel: 'Google', description: 'Research, comparison, and multimodal reasoning.' },
  { name: 'Grok', collectionKey: 'xai-grok', group: 'colleague', provider: 'xai', providerLabel: 'xAI', description: 'Direct analysis and alternative viewpoints.' },
];

const DEFAULT_AI_MEMBER_KEYS = ['zara', 'arjun', 'sofia', 'bucky'];
const GENERAL_AI_MEMBER_KEYS = AI_AVATARS.slice(0, 15).map(
  (agent) => agent.collectionKey
);

interface PendingPreview {
  file: File;
  url: string; // created with URL.createObjectURL
  type: 'image' | 'other';
}

interface ReactionOption {
  emoji: string;
  label: string;
}

interface ReactionEntry extends ReactionOption {
  count: number;
  reacted: boolean;
}

const MAIN_REACTION_OPTIONS: ReactionOption[] = [
  { emoji: '👍', label: 'Like' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😂', label: 'Funny' },
  { emoji: '🎉', label: 'Excitement' },
  { emoji: '😮', label: 'Surprised' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '🙌', label: 'Celebrate' },
  { emoji: '👀', label: 'Watching' },
  { emoji: '💡', label: 'Great idea' },
  { emoji: '🚀', label: 'Launch it' },
];

@Component({
    selector: 'app-full-discussion',
    templateUrl: './full-discussion.component.html',
    styleUrls: ['./full-discussion.component.css'],
    standalone: false
})
export class FullDiscussionComponent
  implements OnInit, AfterViewChecked, OnDestroy
{
  @Input() currentSolution: Solution = {};
  @Input() comments: Comment[] = [];
  @Input() docPath = ''; // e.g. 'challengePages/xyz' or 'solutions/abc'
  @Input() titleLabel = ''; // heading text like '#challenge-discussion'
  @Input() hideNavbar = false;
  pendingFiles: File[] = [];
  previews: PendingPreview[] = []; // NEW
  MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
  @ViewChild('notifyAudio', { static: true })
  notifyAudio!: ElementRef<HTMLAudioElement>;
  @ViewChild('bottomAnchor') bottomAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('chatScroller') chatScroller!: ElementRef<HTMLDivElement>;
  @ViewChild('promptTextarea') promptTextarea?: ElementRef<HTMLTextAreaElement>;

  editingId: string | null = null; // holds ISO date (acts as unique id)
  editingContent = '';

  private firstSnapshot = true; // skip sound on initial load
  private lastMsgIso = ''; // ISO string of last message shown

  user: User = {};
  profilePic: string = '';
  prompt = '';
  id: any;
  meetingUrl = ''; // <- add at class level
  workspaceReturnUrl = '';
  // currentSolution: Solution = {};
  introMessage = `
    Welcome to the team discussion chat. You can use the following resource for more advanced prompts
    and insights on collaboration.
  `;

  // @mention functionality
  participants: ParticipantInfo[] = [];
  onlineParticipants: ParticipantInfo[] = [];
  typingParticipants: TypingPresence[] = [];
  showMentionDropdown = false;
  mentionSearchText = '';
  filteredParticipants: ParticipantInfo[] = [];
  filteredAIAvatars: ParticipantInfo[] = [];
  mentionStartIndex = -1;

  private hasScrolled = false;
  private participantPresenceSub?: Subscription;
  private typingPresenceSub?: Subscription;
  private typingStopTimeout?: ReturnType<typeof setTimeout>;
  private lastTypingWriteAt = 0;
  private participantSourceKey = '';
  private participantPresenceUidKey = '';
  private lastReadMarkerKey = '';
  highlightedMessageId = '';
  commentAuthorProfiles: Record<string, User | null | undefined> = {};
  readonly reactionOptions = MAIN_REACTION_OPTIONS;
  readonly composerEmojiOptions = MAIN_REACTION_OPTIONS;
  activeReactionPickerKey = '';
  replyTarget: Comment | null = null;
  showComposerEmojiPicker = false;

  readonly availableAIAgents = AI_AVATARS;
  rooms: DiscussionRoom[] = [];
  activeRoomId = 'general';
  activeRoom: DiscussionRoom = this.buildGeneralRoom();
  participationMode: DiscussionParticipationMode = 'mentions';
  roundLimit = 1;
  roundInProgress = false;
  roundStopRequested = false;
  roundCurrentTurn = 0;
  roundTotalTurns = 0;
  roundStatusLabel = '';
  showCreateRoomDialog = false;
  showAddAIDialog = false;
  newRoomName = '';
  newRoomDescription = '';
  copyRoomAI = true;
  roomActionError = '';
  roomSettingsSaving = false;

  private roomsSub?: Subscription;
  private activeRoomSub?: Subscription;
  private latestParticipantsInput: unknown = [];
  private roomFeatureInitialized = false;
  private participantLoadGeneration = 0;

  constructor(
    private afs: AngularFirestore,
    public auth: AuthService,
    private time: TimeService,
    private ngZone: NgZone,
    private activatedRoute: ActivatedRoute,
    private solution: SolutionService,
    private router: Router,
    private storage: AngularFireStorage,
    private fns: AngularFireFunctions,
    private presence: PresenceService,
    private discussionNotifications: DiscussionNotificationsService
  ) {
    this.user = this.auth.currentUser;
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }
  }

  ngOnInit(): void {
    const prefix = this.activatedRoute.snapshot.data['docPrefix'];
    // const id = this.activatedRoute.snapshot.paramMap.get('id');
    this.id = this.activatedRoute.snapshot.paramMap.get('id');
    this.activeRoomId = !prefix
      ? this.activatedRoute.snapshot.queryParamMap.get('room') || 'general'
      : 'general';
    this.activeRoom = this.buildGeneralRoom();
    this.watchDiscussionTyping();
    this.configureWorkspaceReturn(prefix);
    /* Hosted mode: we got a docPath – stream its data */
    if (prefix && this.id) {
      // ← we are on /challenge-discussion/…
      this.docPath = `${prefix}/${this.id}`; // e.g. challengePages/xyz
    }
    if (this.docPath) {
      this.afs
        .doc(this.docPath)
        .valueChanges()
        .subscribe((doc: any) => {
          const shouldPinToBottom =
            !this.hasRouteMessageId() && this.isNearBottom();
          if (this.activeRoomId === 'general') {
            this.comments = (doc?.discussion || []).map((c: any) =>
              this.normalizeComment(c)
            );
          }
          const latest = this.comments.at(-1);
          if (latest?.date && latest.date !== this.lastMsgIso) {
            if (!this.firstSnapshot) this.playPing(); // skip very first batch
            this.lastMsgIso = latest.date;
          }
          this.firstSnapshot = false;
          if (shouldPinToBottom) {
            this.scrollToBottom();
          }
          this.markCurrentDiscussionRead();
          this.scrollToRouteMessage();
          this.hydrateCommentAuthorProfiles();
          const qp = this.activatedRoute.snapshot.queryParamMap;
          const qpTitle = qp.get('title');
          if (qpTitle) this.currentSolution.title = qpTitle;

          const qpMeet = qp.get('meet'); // NEW
          if (qpMeet) this.meetingUrl = qpMeet; // store it
          if (qpTitle) {
            // <- title was provided
            this.currentSolution.title = qpTitle; // shown in the template
          }

          // Load participants for @mention functionality
          this.latestParticipantsInput = doc?.participants || [];
          this.refreshParticipants(this.latestParticipantsInput);
        });
      return; // skip the old "solution-id via route" code
    }

    // scrool to bottom
    window.scrollTo(0, document.body.scrollHeight);
    // If you need the user’s profile pic
    if (this.user?.profilePicture?.downloadURL) {
      this.profilePic = this.user.profilePicture.downloadURL;
    }

    this.solution.getSolution(this.id).subscribe((data: any) => {
      const shouldPinToBottom =
        !this.hasRouteMessageId() && this.isNearBottom();
      this.currentSolution = data;
      if (this.activeRoomId === 'general') {
        this.comments = (data?.discussion || []).map((c: any) =>
          this.normalizeComment(c)
        );
      }
      this.markCurrentDiscussionRead();
      this.scrollToRouteMessage();
      this.hydrateCommentAuthorProfiles();

      // Once data is loaded, scroll to bottom
      if (shouldPinToBottom) {
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => this.scrollToBottom(), 0);
        });
      }

      // Load participants for @mention from solution participants
      const participantEmails: string[] = [];
      if (data?.participants) {
        // participants can be an object or array
        if (Array.isArray(data.participants)) {
          participantEmails.push(...data.participants.map((p: any) => p.name || p.email || p).filter(Boolean));
        } else if (typeof data.participants === 'object') {
          participantEmails.push(...Object.values(data.participants).filter(Boolean) as string[]);
        }
      }
      this.latestParticipantsInput = participantEmails;
      this.refreshParticipants(participantEmails);
      this.initializeRoomFeature();
    });
  }

  get isRoomFeatureAvailable(): boolean {
    return !this.docPath && !!(this.currentSolution?.solutionId || this.id);
  }

  get displayRooms(): DiscussionRoom[] {
    const storedGeneral = this.rooms.find((room) => room.id === 'general');
    const general = this.buildGeneralRoom(storedGeneral);
    const customRooms = this.rooms
      .filter((room) => room.id !== 'general')
      .sort((a, b) =>
        String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
      );
    return [general, ...customRooms];
  }

  get selectedRoomAIAgents(): AIAvatar[] {
    const keys = new Set(
      this.activeRoom.aiMemberKeys ?? DEFAULT_AI_MEMBER_KEYS
    );
    return AI_AVATARS.filter((agent) => keys.has(agent.collectionKey));
  }

  get roomHumanCount(): number {
    return this.participants.filter((participant) => !participant.isAI).length;
  }

  get roomAIPreviewAgents(): AIAvatar[] {
    return this.selectedRoomAIAgents.slice(0, 4);
  }

  get hiddenRoomAIAgentCount(): number {
    return Math.max(0, this.selectedRoomAIAgents.length - this.roomAIPreviewAgents.length);
  }

  get composerActionLabel(): string {
    return this.participationMode === 'roundtable' ? 'Start round' : 'Send';
  }

  get participationHelpText(): string {
    if (this.participationMode === 'roundtable') {
      return this.roundLimit === 1
        ? `All ${this.selectedRoomAIAgents.length} agents reply once, in order.`
        : `All ${this.selectedRoomAIAgents.length} agents reply for up to 2 rounds.`;
    }
    return 'Only @mentioned agents reply. @everyone notifies people.';
  }

  trackByRoom(_index: number, room: DiscussionRoom): string {
    return room.id;
  }

  trackByAIAvatar(_index: number, agent: AIAvatar): string {
    return agent.collectionKey;
  }

  isAgentSelected(agent: AIAvatar): boolean {
    return !!this.activeRoom.aiMemberKeys?.includes(agent.collectionKey);
  }

  canDeleteRoom(room: DiscussionRoom): boolean {
    if (!room || room.id === 'general' || room.isGeneral) return false;
    const uid = this.auth.currentUser?.uid || '';
    const email = String(this.auth.currentUser?.email || '').toLowerCase();
    const currentUser: any = this.auth.currentUser || {};
    const solution: any = this.currentSolution || {};
    const adminEmails = (solution.solutionAdminEmails || []).map((value: string) =>
      String(value || '').toLowerCase()
    );
    return (
      room.createdBy === uid ||
      currentUser.admin === 'true' ||
      currentUser.role === 'admin' ||
      solution.ownerAccountId === uid ||
      solution.authorAccountId === uid ||
      solution.initiatorId === uid ||
      String(solution.ownerEmail || solution.authorEmail || '').toLowerCase() === email ||
      adminEmails.includes(email)
    );
  }

  openCreateRoom(): void {
    if (!this.isRoomFeatureAvailable || this.roundInProgress) return;
    this.roomActionError = '';
    this.newRoomName = '';
    this.newRoomDescription = '';
    this.copyRoomAI = true;
    this.showCreateRoomDialog = true;
  }

  closeCreateRoom(): void {
    this.showCreateRoomDialog = false;
    this.roomActionError = '';
  }

  openAddAI(): void {
    if (!this.isRoomFeatureAvailable || this.roundInProgress) return;
    this.roomActionError = '';
    this.showAddAIDialog = true;
  }

  closeAddAI(): void {
    this.showAddAIDialog = false;
    this.roomActionError = '';
  }

  async createRoom(): Promise<void> {
    const name = this.newRoomName.replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 40) {
      this.roomActionError = 'Use a room name between 2 and 40 characters.';
      return;
    }
    if (
      this.displayRooms.some(
        (room) => room.name.trim().toLowerCase() === name.toLowerCase()
      )
    ) {
      this.roomActionError = 'A room with that name already exists.';
      return;
    }

    const id = this.afs.createId();
    const room: DiscussionRoom = {
      id,
      name,
      description: this.newRoomDescription.replace(/\s+/g, ' ').trim().slice(0, 160),
      createdAt: new Date().toISOString(),
      createdBy: this.auth.currentUser?.uid || '',
      aiMemberKeys: this.copyRoomAI
        ? [...(this.activeRoom.aiMemberKeys ?? DEFAULT_AI_MEMBER_KEYS)]
        : [...DEFAULT_AI_MEMBER_KEYS],
      participationMode: 'roundtable',
      roundLimit: 1,
      settingsVersion: 1,
      discussion: [],
    };

    try {
      await this.afs.doc(this.getRoomDocPath(id)).set(room);
      this.closeCreateRoom();
      this.selectRoom(room);
    } catch (error) {
      console.error('Unable to create discussion room', error);
      this.roomActionError = 'Unable to create the room right now. Please try again.';
    }
  }

  async deleteRoom(room: DiscussionRoom, event?: Event): Promise<void> {
    event?.stopPropagation();
    if (!this.canDeleteRoom(room) || this.roundInProgress) return;
    if (
      !confirm(
        `Delete #${room.name}? Its messages will be permanently removed. #General can never be deleted.`
      )
    ) {
      return;
    }

    try {
      if (this.activeRoomId === room.id) {
        this.selectRoom(this.buildGeneralRoom());
      }
      await this.afs.doc(this.getRoomDocPath(room.id)).delete();
    } catch (error) {
      console.error('Unable to delete discussion room', error);
      alert('Unable to delete that room. Only its creator or a solution administrator can delete it.');
    }
  }

  selectRoom(room: DiscussionRoom, updateUrl = true): void {
    if (!room || room.id === this.activeRoomId) return;
    if (this.roundInProgress) {
      alert('Stop the current AI round before changing rooms.');
      return;
    }

    this.activeRoomSub?.unsubscribe();
    this.activeRoomId = room.id;
    this.applyRoomSettings(room);
    this.comments = [];
    this.hasScrolled = false;
    this.lastReadMarkerKey = '';
    this.participantSourceKey = '';

    if (room.id === 'general') {
      this.comments = ((this.currentSolution as any)?.discussion || []).map(
        (comment: any) => this.normalizeComment(comment)
      );
      this.refreshParticipants(this.latestParticipantsInput);
      this.markCurrentDiscussionRead();
    } else {
      this.subscribeToActiveRoom(room.id);
    }

    this.watchDiscussionTyping();
    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.activatedRoute,
        queryParams: { room: room.id === 'general' ? null : room.id, messageId: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  selectRoomById(roomId: string): void {
    const room = this.displayRooms.find((candidate) => candidate.id === roomId);
    if (room) this.selectRoom(room);
  }

  async updateRoomPreferences(): Promise<void> {
    if (this.roomSettingsSaving) return;
    if (this.activeRoomId === 'general') {
      this.participationMode = 'mentions';
      this.roundLimit = 1;
      return;
    }
    this.roomSettingsSaving = true;
    this.roundLimit = Math.min(2, Math.max(1, Number(this.roundLimit) || 1));
    this.activeRoom = {
      ...this.activeRoom,
      participationMode: this.participationMode,
      roundLimit: this.roundLimit,
    };
    await this.persistActiveRoomSettings();
    this.roomSettingsSaving = false;
  }

  setParticipationMode(mode: DiscussionParticipationMode): void {
    if (
      this.roundInProgress ||
      this.roomSettingsSaving ||
      (this.activeRoomId === 'general' && mode !== 'mentions') ||
      this.participationMode === mode
    ) {
      return;
    }
    this.participationMode = mode;
    void this.updateRoomPreferences();
  }

  async toggleRoomAgent(agent: AIAvatar): Promise<void> {
    if (this.roundInProgress || this.roomSettingsSaving) return;
    this.roomSettingsSaving = true;
    const keys = new Set(this.activeRoom.aiMemberKeys ?? DEFAULT_AI_MEMBER_KEYS);
    if (keys.has(agent.collectionKey)) {
      keys.delete(agent.collectionKey);
    } else {
      keys.add(agent.collectionKey);
    }
    this.activeRoom = { ...this.activeRoom, aiMemberKeys: Array.from(keys) };
    this.participantSourceKey = '';
    this.refreshParticipants(this.latestParticipantsInput);
    await this.persistActiveRoomSettings();
    this.roomSettingsSaving = false;
  }

  async removeRoomAgent(agent: AIAvatar): Promise<void> {
    if (!this.isAgentSelected(agent) || this.roundInProgress) return;
    await this.toggleRoomAgent(agent);
  }

  stopRound(): void {
    if (!this.roundInProgress) return;
    this.roundStopRequested = true;
    this.roundStatusLabel = 'Stopping after the current response…';
  }

  private buildGeneralRoom(settings?: DiscussionRoom): DiscussionRoom {
    return {
      id: 'general',
      name: 'General',
      description: 'The main discussion for this solution.',
      isGeneral: true,
      createdAt: settings?.createdAt || '',
      createdBy: settings?.createdBy || '',
      aiMemberKeys:
        settings?.aiMemberKeys !== undefined
          ? [...settings.aiMemberKeys]
          : [...GENERAL_AI_MEMBER_KEYS],
      participationMode: 'mentions',
      roundLimit: 1,
      settingsVersion: 1,
    };
  }

  private initializeRoomFeature(): void {
    if (!this.isRoomFeatureAvailable || this.roomFeatureInitialized) return;
    this.roomFeatureInitialized = true;
    const collectionPath = this.getRoomsCollectionPath();
    this.roomsSub = this.afs
      .collection<DiscussionRoom>(collectionPath)
      .valueChanges({ idField: 'id' })
      .subscribe((rooms) => {
        this.rooms = rooms || [];
        const requestedRoom = this.displayRooms.find(
          (room) => room.id === this.activeRoomId
        );
        if (!requestedRoom) {
          this.selectRoom(this.buildGeneralRoom(), true);
          return;
        }
        if (requestedRoom.id === 'general') {
          this.applyRoomSettings(requestedRoom);
        } else if (!this.activeRoomSub) {
          this.applyRoomSettings(requestedRoom);
          this.subscribeToActiveRoom(requestedRoom.id);
        }
      });
    void this.ensureGeneralRoomSettings();
  }

  private async ensureGeneralRoomSettings(): Promise<void> {
    const ref = this.afs.doc<DiscussionRoom>(this.getRoomDocPath('general'));
    try {
      const snapshot = await firstValueFrom(ref.get());
      if (snapshot.exists) {
        const existing = snapshot.data();
        if (!existing?.settingsVersion || existing.participationMode !== 'mentions') {
          await ref.set(
            {
              id: 'general',
              name: 'General',
              isGeneral: true,
              aiMemberKeys: [...GENERAL_AI_MEMBER_KEYS],
              participationMode: 'mentions',
              roundLimit: 1,
              settingsVersion: 1,
            },
            { merge: true }
          );
        }
        return;
      }
      await ref.set(this.buildGeneralRoom({
        id: 'general',
        name: 'General',
        createdAt: new Date().toISOString(),
        createdBy: this.auth.currentUser?.uid || '',
      }));
    } catch (error) {
      console.error('Unable to initialize general room settings', error);
    }
  }

  private subscribeToActiveRoom(roomId: string): void {
    this.activeRoomSub?.unsubscribe();
    this.activeRoomSub = this.afs
      .doc<DiscussionRoom>(this.getRoomDocPath(roomId))
      .valueChanges()
      .subscribe((room) => {
        if (!room) {
          this.selectRoom(this.buildGeneralRoom());
          return;
        }
        const normalizedRoom = { ...room, id: roomId };
        this.applyRoomSettings(normalizedRoom);
        const shouldPinToBottom = !this.hasRouteMessageId() && this.isNearBottom();
        this.comments = (room.discussion || []).map((comment) =>
          this.normalizeComment(comment)
        );
        this.refreshParticipants(this.latestParticipantsInput);
        this.markCurrentDiscussionRead();
        this.hydrateCommentAuthorProfiles();
        if (shouldPinToBottom) this.scrollToBottom();
      });
  }

  private applyRoomSettings(room: DiscussionRoom): void {
    this.activeRoom = room.id === 'general' ? this.buildGeneralRoom(room) : {
      ...room,
      aiMemberKeys: room.aiMemberKeys !== undefined
        ? [...room.aiMemberKeys]
        : [...DEFAULT_AI_MEMBER_KEYS],
      participationMode: room.participationMode || 'roundtable',
      roundLimit: room.roundLimit === 2 ? 2 : 1,
      settingsVersion: 1,
    };
    this.participationMode = this.activeRoom.participationMode || 'mentions';
    this.roundLimit = this.activeRoom.roundLimit === 2 ? 2 : 1;
    this.participantSourceKey = '';
    this.refreshParticipants(this.latestParticipantsInput);
  }

  private async persistActiveRoomSettings(): Promise<void> {
    if (!this.isRoomFeatureAvailable) return;
    try {
      await this.afs.doc(this.getRoomDocPath(this.activeRoomId)).set(
        {
          name: this.activeRoom.name,
          description: this.activeRoom.description || '',
          isGeneral: this.activeRoomId === 'general',
          aiMemberKeys: this.activeRoom.aiMemberKeys || [],
          participationMode: this.participationMode,
          roundLimit: this.roundLimit,
          settingsVersion: 1,
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Unable to update room preferences', error);
      this.roomActionError = 'Unable to save the room settings right now.';
    }
  }

  private getRoomsCollectionPath(): string {
    return `solutions/${this.currentSolution?.solutionId || this.id}/discussionRooms`;
  }

  private getRoomDocPath(roomId: string): string {
    return `${this.getRoomsCollectionPath()}/${roomId}`;
  }

  /** True when the comment at index i is the first of a new calendar day */
  shouldShowDateDivider(i: number): boolean {
    // NEW
    if (i === 0) {
      return true;
    }
    return !this.isSameDay(this.comments[i].date, this.comments[i - 1].date);
  }

  /** Fast same-day comparison */
  private isSameDay(
    a: Date | string | undefined,
    b: Date | string | undefined
  ): boolean {
    // NEW
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  }

  /** Sort helper: oldest → newest (undefined dates to top just in case) */
  private byDateAsc = (a: Comment, b: Comment) => {
    // NEW
    if (!a.date) return -1;
    if (!b.date) return 1;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  };

  private playPing() {
    const audio = this.notifyAudio.nativeElement;
    audio.currentTime = 0; // rewind in case it’s still playing
    audio.play().catch(() => {}); // ignore autoplay blocking in some browsers
  }

  ngAfterViewChecked() {
    if (this.hasRouteMessageId()) {
      this.hasScrolled = true;
      return;
    }
    if (!this.hasScrolled) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.scrollToBottom(), 0);
      });
      this.hasScrolled = true;
    }
  }

  private scrollToBottom(): void {
    // use rAF so it executes immediately after the current paint
    requestAnimationFrame(() => {
      this.bottomAnchor?.nativeElement.scrollIntoView({ behavior: 'auto' });
    });
  }

  private isNearBottom(thresholdPx = 160): boolean {
    const el = this.chatScroller?.nativeElement;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
  }

  onFileSelected(evt: Event) {
    const list = (evt.target as HTMLInputElement).files;
    if (!list?.length) return;
    // optional HEIC → JPEG conversion on-client
    for (const file of Array.from(list)) {
      if (file.size > this.MAX_FILE_SIZE) {
        alert(`❗️ ${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB.
Please choose a file under 5 MB.`);
        continue; // skip this file
      }
      this.pendingFiles.push(file);

      // build local preview
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image' : 'other';
      this.previews.push({ file, url, type });
    }
    // reset <input> so the same file can be chosen again later
    (evt.target as HTMLInputElement).value = '';
  }
  async addToDiscussion() {
    if (!this.comments) {
      this.comments = [];
    }
    const content = this.prompt.trim(); // may be empty
    if (!content && !this.pendingFiles.length) return; // nothing at all
    this.stopDiscussionTyping();
    const nowIso = new Date().toISOString();
    const messageId = this.afs.createId();
    const msg: Comment = {
      messageId,
      date: nowIso,

      authorId: this.auth.currentUser.uid,
      content,
      authorName: `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`,
      profilePic: this.profilePic,
      // helper visible immediately in the UI
      displayTime: this.time.formatDateStringComment(nowIso),
    };
    const replyTo = this.buildReplyPayload();
    if (replyTo) {
      msg.replyTo = replyTo;
    }
    this.cacheCurrentUserProfile();
    if (this.pendingFiles.length) {
      msg.attachments = [];
      for (const file of this.pendingFiles) {
        if (file.size > this.MAX_FILE_SIZE) {
          console.warn(`${file.name} skipped (too large)`);
          continue;
        }
        const id = this.afs.createId();
        const path = `chatUploads/${this.currentSolution.solutionId || this.id}/${this.activeRoomId}/${id}-${file.name}`;
        const task = await this.storage.upload(path, file);
        const url = await task.ref.getDownloadURL();

        const att: Attachment = {
          url,
          name: file.name,
          type: file.type.startsWith('image/')
            ? 'image'
            : file.type === 'application/pdf'
            ? 'pdf'
            : file.type.startsWith('video/')
            ? 'video'
            : file.type.includes('word')
            ? 'doc'
            : 'other',
        };

        // Generate thumbnail for videos (Cloud Function) – see §3
        // if (att.type === 'video') att.thumb = await this.getVideoThumb(url, id);

        msg.attachments.push(att);
      }
    }

    this.comments.push(msg);

    // Clear the prompt & scroll
    this.previews.forEach((p) => URL.revokeObjectURL(p.url));
    this.previews = [];
    this.pendingFiles = [];
    this.prompt = '';
    this.replyTarget = null;
    this.showMentionDropdown = false;
    this.showComposerEmojiPicker = false;
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => this.scrollToBottom(), 0);
    });

    const toSave = this.serializeDiscussionForSave(this.comments);
    // play ping before adding message
    this.playPing();
    await this.afs
      .doc(this.getDiscussionDocPath())
      .set({ discussion: toSave }, { merge: true });
    await this.createUnreadNotificationsForMessage(msg);

    if (content) {
      await this.processMentions(content);
      if (this.participationMode === 'roundtable') {
        await this.startRoundtable(content);
      } else {
        await this.processAIMentions(content);
      }
    }
  }

  // “Close” might navigate away or handle a different route
  endChat() {
    if (this.workspaceReturnUrl) {
      this.returnToWorkspace();
      return;
    }

    if (this.docPath) {
      this.router.navigate(['/home-challenge', this.id]);
    } else {
      this.router.navigate(['/dashboard', this.id]);
    }

    console.log('Closed the full-screen chat');
  }

  returnToWorkspace(): void {
    if (!this.workspaceReturnUrl) return;
    this.router.navigateByUrl(this.workspaceReturnUrl);
  }

  private configureWorkspaceReturn(docPrefix?: string): void {
    if (docPrefix || !this.id) {
      this.workspaceReturnUrl = '';
      return;
    }

    const requestedReturnUrl =
      this.activatedRoute.snapshot.queryParamMap.get('returnTo') || '';
    const safeWorkspaceUrl =
      /^\/playground-steps\/[A-Za-z0-9_-]+(?:\?step=[0-4])?$/;

    this.workspaceReturnUrl = safeWorkspaceUrl.test(requestedReturnUrl)
      ? requestedReturnUrl
      : `/playground-steps/${this.id}`;
  }
  removePreview(index: number) {
    URL.revokeObjectURL(this.previews[index].url);
    this.previews.splice(index, 1);
    this.pendingFiles.splice(index, 1);
  }

  ngOnDestroy(): void {
    this.roundStopRequested = true;
    this.roomsSub?.unsubscribe();
    this.activeRoomSub?.unsubscribe();
    this.participantPresenceSub?.unsubscribe();
    this.typingPresenceSub?.unsubscribe();
    this.stopDiscussionTyping();
  }
  linkify(text: string): string {
    if (!text) return '';

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">${url}</a>`;
    });
  }
  getInitial(name: string = ''): string {
    return (name.trim()[0] || '?').toUpperCase();
  }

  trackByComment(index: number, comment: Comment): string {
    return (
      comment.messageId ||
      `${comment.authorId || comment.authorName || 'comment'}-${comment.date || index}`
    );
  }

  trackByParticipant(_index: number, participant: ParticipantInfo): string {
    return participant.uid || participant.email || participant.displayName;
  }

  trackByPreview(_index: number, preview: PendingPreview): string {
    return `${preview.file.name}-${preview.file.size}-${preview.file.lastModified}`;
  }

  trackByAttachment(_index: number, attachment: Attachment): string {
    return attachment.url || attachment.name;
  }

  trackByReactionOption(_index: number, option: ReactionOption): string {
    return option.emoji;
  }

  trackByReactionEntry(_index: number, reaction: ReactionEntry): string {
    return reaction.emoji;
  }

  toggleComposerEmojiPicker(): void {
    const nextOpen = !this.showComposerEmojiPicker;
    this.showComposerEmojiPicker = nextOpen;
    if (nextOpen) {
      this.closeMentionDropdown();
    }
    this.activeReactionPickerKey = '';
  }

  insertEmojiIntoPrompt(emoji: string): void {
    if (!emoji) return;
    const textarea = this.promptTextarea?.nativeElement;
    const start = textarea?.selectionStart ?? this.prompt.length;
    const end = textarea?.selectionEnd ?? this.prompt.length;
    this.prompt = `${this.prompt.slice(0, start)}${emoji}${this.prompt.slice(end)}`;
    this.registerDiscussionTypingActivity();
    this.showComposerEmojiPicker = false;

    setTimeout(() => {
      textarea?.focus();
      const nextCursor = start + emoji.length;
      textarea?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  closeComposerPanels(): void {
    this.showComposerEmojiPicker = false;
    this.closeMentionDropdown();
  }

  getCommentKey(comment: Comment): string {
    return (
      comment.messageId ||
      `${comment.authorId || comment.authorName || 'comment'}-${comment.date || ''}-${comment.content || ''}`
    );
  }

  getReactionEntries(comment?: Comment | null): ReactionEntry[] {
    const reactions = this.normalizeReactions(comment?.reactions);
    const mainOrder = this.reactionOptions.map((option) => option.emoji);
    const optionByEmoji = new Map(
      this.reactionOptions.map((option) => [option.emoji, option])
    );
    const uid = this.auth.currentUser?.uid || '';

    return Object.entries(reactions)
      .filter(([, userIds]) => userIds.length > 0)
      .sort(([emojiA], [emojiB]) => {
        const aIndex = mainOrder.indexOf(emojiA);
        const bIndex = mainOrder.indexOf(emojiB);
        if (aIndex === -1 && bIndex === -1) return emojiA.localeCompare(emojiB);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      })
      .map(([emoji, userIds]) => ({
        ...(optionByEmoji.get(emoji) || { emoji, label: 'Reaction' }),
        count: userIds.length,
        reacted: !!uid && userIds.includes(uid),
      }));
  }

  hasUserReacted(comment: Comment, emoji: string): boolean {
    const uid = this.auth.currentUser?.uid || '';
    return !!uid && (comment.reactions?.[emoji] || []).includes(uid);
  }

  toggleReactionPicker(comment: Comment): void {
    this.showComposerEmojiPicker = false;
    const key = this.getCommentKey(comment);
    this.activeReactionPickerKey =
      this.activeReactionPickerKey === key ? '' : key;
  }

  async selectReaction(comment: Comment, option: ReactionOption): Promise<void> {
    this.activeReactionPickerKey = '';
    await this.toggleReaction(comment, option.emoji);
  }

  startReply(comment: Comment): void {
    this.replyTarget = comment;
    this.activeReactionPickerKey = '';
  }

  cancelReply(): void {
    this.replyTarget = null;
  }

  replyPreviewText(reply?: CommentReply | Comment | null): string {
    const text = String(reply?.content || '').trim();
    if (!text) return 'Message';
    return text.length > 160 ? `${text.slice(0, 160)}...` : text;
  }

  scrollToComment(messageId?: string): void {
    if (!messageId) return;
    document
      .getElementById(`message-${messageId}`)
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async toggleReaction(comment: Comment, emoji: string): Promise<void> {
    const uid = this.auth.currentUser?.uid || '';
    if (!uid || !emoji) return;

    try {
      const updatedComment = await this.afs.firestore.runTransaction(
        async (transaction) => {
          const ref = this.afs.doc(this.getDiscussionDocPath()).ref;
          const snap = await transaction.get(ref);
          const data: any = snap.exists ? snap.data() : {};
          const discussion = Array.isArray(data?.discussion)
            ? data.discussion
            : [];
          const targetIndex = this.findMatchingCommentIndex(
            discussion,
            comment
          );

          if (targetIndex === -1) {
            throw new Error('Unable to find discussion message for reaction.');
          }

          const updatedDiscussion = discussion.map((rawComment: any, index: number) => {
            if (index !== targetIndex) return rawComment;

            const normalized = this.normalizeComment(rawComment);
            const reactions = this.normalizeReactions(normalized.reactions);
            const currentUsers = reactions[emoji] || [];
            reactions[emoji] = currentUsers.includes(uid)
              ? currentUsers.filter((reactorUid) => reactorUid !== uid)
              : [...currentUsers, uid];

            if (!reactions[emoji].length) {
              delete reactions[emoji];
            }

            return this.serializeCommentForSave({
              ...normalized,
              reactions,
            });
          });

          transaction.set(
            this.afs.doc(this.getDiscussionDocPath()).ref,
            { discussion: updatedDiscussion },
            { merge: true }
          );

          return this.normalizeComment(updatedDiscussion[targetIndex]);
        }
      );

      const localIndex = this.findMatchingCommentIndex(this.comments, comment);
      if (localIndex !== -1) {
        this.comments[localIndex] = {
          ...this.comments[localIndex],
          reactions: updatedComment.reactions || {},
        };
        this.comments = [...this.comments];
      }
    } catch (error) {
      console.error('Unable to update reaction', error);
      alert('Unable to update that reaction right now. Please try again.');
    }
  }

  getCommentAuthorProfile(comment?: Comment | null): User | null {
    const uid = this.getHumanAuthorId(comment);
    return uid ? this.commentAuthorProfiles[uid] || null : null;
  }

  getCommentAuthorRoute(comment?: Comment | null): string[] | null {
    const uid = this.getHumanAuthorId(comment);
    if (!uid) return null;

    if (this.auth.currentUser?.uid && uid === this.auth.currentUser.uid) {
      return ['/profile'];
    }

    return ['/user-profile', uid];
  }

  getCommentAuthorDisplayName(comment?: Comment | null): string {
    const author = this.getCommentAuthorProfile(comment);
    const fullName = `${author?.firstName || ''} ${author?.lastName || ''}`.trim();

    return (
      fullName ||
      author?.email ||
      comment?.authorName ||
      'Global Solutions Lab member'
    );
  }

  getCommentAuthorInitials(comment?: Comment | null): string {
    const name = this.getCommentAuthorDisplayName(comment);
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return 'NW';
  }

  getCommentAuthorAvatar(comment?: Comment | null): string {
    const author = this.getCommentAuthorProfile(comment);
    return (
      author?.profilePicture?.downloadURL ||
      author?.profilePicPath ||
      comment?.profilePic ||
      ''
    );
  }

  getUserCount(
    user: User | null | undefined,
    countKey: 'followers' | 'following',
    arrayKey: 'followersArray' | 'followingArray'
  ): string | number {
    return user?.[countKey] || user?.[arrayKey]?.length || 0;
  }

  getParticipantAvatar(participant?: ParticipantInfo | null): string {
    const profile = this.getParticipantProfile(participant);
    return this.getUserAvatarUrl(profile) || participant?.avatarPath || '';
  }

  getParticipantProfile(participant?: ParticipantInfo | null): User | null {
    const uid = String(participant?.uid || '').trim();
    if (!uid || participant?.isAI || uid.startsWith('ai-')) return null;
    return this.commentAuthorProfiles[uid] || null;
  }

  getParticipantRoute(participant?: ParticipantInfo | null): string[] | null {
    const uid = String(participant?.uid || '').trim();
    if (!uid || participant?.isAI || uid.startsWith('ai-')) return null;

    if (this.auth.currentUser?.uid && uid === this.auth.currentUser.uid) {
      return ['/profile'];
    }

    return ['/user-profile', uid];
  }

  getParticipantDisplayName(participant?: ParticipantInfo | null): string {
    const profile = this.getParticipantProfile(participant);
    const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
    return fullName || profile?.email || participant?.displayName || 'Global Solutions Lab member';
  }

  async sendOnEnter(event: Event): Promise<void> {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey || keyboardEvent.isComposing || this.roundInProgress) return;

    keyboardEvent.preventDefault();
    this.closeMentionDropdown();
    await this.addToDiscussion();
  }

  private getHumanAuthorId(comment?: Comment | null): string {
    const uid = String(comment?.authorId || '').trim();
    if (!uid || comment?.isAI || uid.startsWith('ai-')) return '';
    return uid;
  }

  private getUserAvatarUrl(user?: User | null): string {
    return user?.profilePicture?.downloadURL || user?.profilePicPath || '';
  }

  private cacheCurrentUserProfile(): void {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return;
    this.commentAuthorProfiles = {
      ...this.commentAuthorProfiles,
      [uid]: this.auth.currentUser,
    };
  }

  private async hydrateCommentAuthorProfiles(): Promise<void> {
    const uids = Array.from(
      new Set(
        (this.comments || [])
          .map((comment) => this.getHumanAuthorId(comment))
          .filter(Boolean)
      )
    ).filter((uid) => !(uid in this.commentAuthorProfiles));

    if (!uids.length) return;

    const loadedProfiles = await Promise.all(
      uids.map(async (uid) => {
        if (this.auth.currentUser?.uid === uid) {
          return [uid, this.auth.currentUser as User] as const;
        }

        try {
          const profile = await firstValueFrom(this.auth.getAUser(uid));
          return [uid, profile ? { ...profile, uid: profile.uid || uid } : null] as const;
        } catch (error) {
          console.error('Unable to load discussion comment author', error);
          return [uid, null] as const;
        }
      })
    );

    this.commentAuthorProfiles = loadedProfiles.reduce(
      (profiles, [uid, profile]) => ({
        ...profiles,
        [uid]: profile,
      }),
      { ...this.commentAuthorProfiles }
    );
  }

  /** --- Methods --- */
  startEdit(c: Comment) {
    this.editingId = c.date!; // use ISO date as id
    this.editingContent = c.content ?? '';
    /* optional: scroll the textarea into view */
  }

  cancelEdit() {
    this.editingId = null;
    this.editingContent = '';
  }

  async saveEdit(c: Comment) {
    if (!this.editingContent.trim()) return; // no empty messages
    c.content = this.editingContent.trim();
    this.editingId = null;
    this.editingContent = '';

    await this.syncDiscussion(); // reuse helper below
  }

  async deleteComment(c: Comment) {
    if (!confirm('Delete this message?')) return;
    this.comments = this.comments.filter((m) => m !== c);
    await this.syncDiscussion();
  }

  /** --- helper: update Firestore once --- */
  private async syncDiscussion() {
    const toSave = this.serializeDiscussionForSave(this.comments);
    await this.afs
      .doc(this.getDiscussionDocPath())
      .set({ discussion: toSave }, { merge: true });
  }

  private getDiscussionDocPath(): string {
    if (this.docPath) return this.docPath;
    if (this.activeRoomId !== 'general') {
      return this.getRoomDocPath(this.activeRoomId);
    }
    return `solutions/${this.currentSolution!.solutionId || this.id}`;
  }

  private getDiscussionContextType(): 'solution' | 'challenge' {
    return this.getDiscussionDocPath().startsWith('challengePages/')
      ? 'challenge'
      : 'solution';
  }

  private getDiscussionRoute(): string {
    const contextType = this.getDiscussionContextType();
    const baseRoute = contextType === 'challenge'
      ? `/challenge-discussion/${this.id}`
      : `/full-discussion/${this.currentSolution!.solutionId || this.id}`;
    return this.activeRoomId === 'general'
      ? baseRoute
      : `${baseRoute}?room=${encodeURIComponent(this.activeRoomId)}`;
  }

  private normalizeComment(comment: any): Comment {
    const normalized: Comment = {
      ...(comment || {}),
      reactions: this.normalizeReactions(comment?.reactions),
    };

    if (!normalized.date || isNaN(Date.parse(normalized.date as string))) {
      normalized.date = undefined;
    }

    return normalized;
  }

  private normalizeReactions(
    reactions: unknown
  ): Record<string, string[]> {
    if (!reactions || typeof reactions !== 'object') return {};

    return Object.entries(reactions as Record<string, unknown>).reduce(
      (normalized, [emoji, userIds]) => {
        if (!emoji || !Array.isArray(userIds)) return normalized;

        const cleanUserIds = Array.from(
          new Set(
            userIds
              .map((userId) => String(userId || '').trim())
              .filter(Boolean)
          )
        );

        if (cleanUserIds.length) {
          normalized[emoji] = cleanUserIds;
        }

        return normalized;
      },
      {} as Record<string, string[]>
    );
  }

  private serializeDiscussionForSave(comments: Comment[]): Comment[] {
    return comments.map((comment) => this.serializeCommentForSave(comment));
  }

  private serializeCommentForSave(comment: Comment): Comment {
    const { displayTime, ...raw } = comment;
    const reactions = this.normalizeReactions(raw.reactions);
    const replyTo = this.cleanReply(raw.replyTo);
    const base = replyTo ? { ...raw, replyTo } : this.withoutReply(raw);

    if (Object.keys(reactions).length) {
      return { ...base, reactions };
    }

    const { reactions: _emptyReactions, ...withoutReactions } = base;
    return withoutReactions;
  }

  private buildReplyPayload(): CommentReply | null {
    if (!this.replyTarget) return null;

    return this.cleanReply({
      messageId: this.replyTarget.messageId || this.getCommentKey(this.replyTarget),
      authorId: this.replyTarget.authorId || '',
      authorName: this.getCommentAuthorDisplayName(this.replyTarget),
      content: this.replyTarget.content || '',
      date: this.replyTarget.date,
      createdAtMs: Date.parse(this.replyTarget.date || '') || undefined,
    });
  }

  private cleanReply(reply?: CommentReply | null): CommentReply | null {
    if (!reply?.messageId) return null;

    const content = String(reply.content || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);

    const clean: CommentReply = {
      messageId: String(reply.messageId),
      authorId: String(reply.authorId || ''),
      authorName: String(reply.authorName || 'Global Solutions Lab member').trim(),
      content,
    };

    if (reply.date) {
      clean.date = reply.date;
    }

    const createdAtMs = Number(reply.createdAtMs || 0);
    if (createdAtMs) {
      clean.createdAtMs = createdAtMs;
    }

    return clean;
  }

  private withoutReply(comment: Comment): Comment {
    const { replyTo: _replyTo, ...withoutReplyTo } = comment;
    return withoutReplyTo;
  }

  private findMatchingCommentIndex(
    comments: any[],
    target: Comment
  ): number {
    if (!Array.isArray(comments) || !target) return -1;

    if (target.messageId) {
      const byMessageId = comments.findIndex(
        (comment) => comment?.messageId === target.messageId
      );
      if (byMessageId !== -1) return byMessageId;
    }

    if (target.date) {
      const byDateAndAuthor = comments.findIndex(
        (comment) =>
          comment?.date === target.date &&
          (!target.authorId || comment?.authorId === target.authorId)
      );
      if (byDateAndAuthor !== -1) return byDateAndAuthor;
    }

    return comments.findIndex(
      (comment) =>
        comment?.content === target.content &&
        comment?.authorName === target.authorName
    );
  }

  private markCurrentDiscussionRead(): void {
    const uid = this.auth.currentUser?.uid || '';
    const sourceDocPath = this.getDiscussionDocPath();
    const latest = this.comments.at(-1);
    const latestKey = latest?.messageId || latest?.date || '';
    const markerKey = `${sourceDocPath}:${latestKey}`;
    if (!uid || !sourceDocPath || markerKey === this.lastReadMarkerKey) return;

    this.lastReadMarkerKey = markerKey;
    this.discussionNotifications
      .markDiscussionRead(uid, sourceDocPath)
      .catch((error) =>
        console.error('Unable to mark discussion notifications read', error)
      );
  }

  private hasRouteMessageId(): boolean {
    return !!this.activatedRoute.snapshot.queryParamMap.get('messageId');
  }

  private scrollToRouteMessage(): void {
    const messageId =
      this.activatedRoute.snapshot.queryParamMap.get('messageId') || '';
    if (!messageId) return;

    this.highlightedMessageId = messageId;
    requestAnimationFrame(() => {
      document
        .getElementById(`message-${messageId}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  private async createUnreadNotificationsForMessage(
    message: Comment
  ): Promise<void> {
    const senderUid = this.auth.currentUser?.uid || '';
    const messageId = message.messageId || '';
    if (!senderUid || !messageId) return;

    try {
      await this.discussionNotifications.createForDiscussionMessage({
        recipients: this.participants,
        senderUid,
        senderName:
          message.authorName ||
          `${this.auth.currentUser.firstName || ''} ${
            this.auth.currentUser.lastName || ''
          }`.trim() ||
          'Global Solutions Lab teammate',
        senderAvatar: message.profilePic || '',
        messageId,
        messageText:
          message.content ||
          (message.attachments?.length
            ? `${message.attachments.length} attachment(s)`
            : ''),
        contextId: String(this.currentSolution!.solutionId || this.id || ''),
        contextTitle:
          this.activeRoomId === 'general'
            ? this.currentSolution?.title || 'Team discussion'
            : `#${this.activeRoom.name} · ${this.currentSolution?.title || 'Team discussion'}`,
        contextType: this.getDiscussionContextType(),
        sourceDocPath: this.getDiscussionDocPath(),
        discussionPath: this.getDiscussionRoute(),
        createdAtMs: Date.parse(message.date || '') || Date.now(),
      });
    } catch (error) {
      console.error('Unable to create discussion unread notifications', error);
    }
  }

  // ============ @Mention functionality ============

  private refreshParticipants(participantsInput: unknown): void {
    const participantEmails = this.normalizeParticipantEmails(participantsInput);
    const aiKey = (this.activeRoom.aiMemberKeys ?? DEFAULT_AI_MEMBER_KEYS)
      .slice()
      .sort()
      .join('|');
    const nextKey = `${participantEmails.join('|')}::${aiKey}`;

    if (nextKey === this.participantSourceKey) {
      this.buildParticipantsFromComments();
      return;
    }

    this.participantSourceKey = nextKey;
    const generation = ++this.participantLoadGeneration;
    this.loadParticipants(participantEmails, generation).then(() => {
      if (generation === this.participantLoadGeneration) {
        this.buildParticipantsFromComments();
      }
    });
  }

  private normalizeParticipantEmails(participantsInput: unknown): string[] {
    const rawParticipants = Array.isArray(participantsInput)
      ? participantsInput
      : participantsInput && typeof participantsInput === 'object'
      ? Object.values(participantsInput as Record<string, unknown>)
      : [];

    return Array.from(
      new Set(
        rawParticipants
          .map((participant: any) =>
            String(participant?.email || participant?.name || participant || '')
              .trim()
              .toLowerCase()
          )
          .filter(Boolean)
      )
    ).sort();
  }

  /** Load participant emails and fetch their display names */
  private async loadParticipants(
    participantEmails: string[],
    generation: number
  ) {
    const participants: ParticipantInfo[] = [];
    const seenEmails = new Set<string>();
    
    // First, add participants from the page's participant list
    if (participantEmails?.length) {
      for (const email of participantEmails) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || seenEmails.has(normalizedEmail)) continue;
        seenEmails.add(normalizedEmail);

        const currentEmail = (this.auth.currentUser?.email || '').trim().toLowerCase();
        const currentUid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
        if (normalizedEmail === currentEmail && currentUid) {
          this.commentAuthorProfiles = {
            ...this.commentAuthorProfiles,
            [currentUid]: this.auth.currentUser,
          };
          participants.push({
            email: normalizedEmail,
            displayName:
              [this.auth.currentUser?.firstName, this.auth.currentUser?.lastName]
                .filter(Boolean)
                .join(' ')
                .trim() || normalizedEmail,
            uid: currentUid,
            lastActiveAt: new Date().toISOString(),
            isOnline: true,
            avatarPath: this.getUserAvatarUrl(this.auth.currentUser),
          });
          continue;
        }

        try {
          const userQuery = await firstValueFrom(this.auth.getUserFromEmail(normalizedEmail));
          
          if (userQuery && userQuery.length > 0) {
            const user: any = userQuery[0];
            if (user.uid) {
              this.commentAuthorProfiles = {
                ...this.commentAuthorProfiles,
                [user.uid]: { ...user, uid: user.uid },
              };
            }
            participants.push({
              email: normalizedEmail,
              displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || normalizedEmail,
              uid: user.uid,
              lastActiveAt: user.lastActiveAt,
              isOnline: false,
              avatarPath: this.getUserAvatarUrl(user),
            });
          } else {
            participants.push({
              email: normalizedEmail,
              displayName: normalizedEmail,
              isOnline: false,
            });
          }
        } catch {
          participants.push({
            email: normalizedEmail,
            displayName: normalizedEmail,
            isOnline: false,
          });
        }
      }
    }

    if (generation !== this.participantLoadGeneration) return;
    this.participants = participants;

    // Add AI avatars to participants
    this.addAIParticipants();

    console.log('Loaded participants for mentions:', this.participants);
    this.subscribeToParticipantPresence();
  }

  /** Add AI avatars to the participants list */
  private addAIParticipants() {
    const activeKeys = new Set(
      this.activeRoom.aiMemberKeys ?? DEFAULT_AI_MEMBER_KEYS
    );
    for (const ai of AI_AVATARS.filter((candidate) =>
      activeKeys.has(candidate.collectionKey)
    )) {
      this.participants.push({
        email: `ai-${ai.collectionKey}@system`,
        displayName: ai.name,
        isAI: true,
        avatarPath: ai.avatarPath,
        collectionKey: ai.collectionKey,
        provider: ai.provider,
        providerLabel: ai.providerLabel,
        model: ai.model,
        description: ai.description,
      });
    }
  }

  /** Build participants from discussion comments (people who have posted) */
  private buildParticipantsFromComments() {
    if (!this.comments?.length) return;

    const seenIds = new Set(this.participants.map(p => p.uid || p.email));
    let addedParticipant = false;
    
    for (const comment of this.comments) {
      if (
        !comment.authorId ||
        comment.isAI ||
        comment.authorId.startsWith('ai-') ||
        seenIds.has(comment.authorId)
      ) {
        continue;
      }
      seenIds.add(comment.authorId);

      // Add participant from comment author
      this.participants.push({
        email: '', // We don't have email from comments, will lookup
        displayName: comment.authorName || 'Unknown',
        uid: comment.authorId,
        isOnline: false,
        avatarPath: comment.profilePic || '',
      });
      addedParticipant = true;
    }
    if (addedParticipant) {
      this.subscribeToParticipantPresence();
    }
  }

  private subscribeToParticipantPresence(): void {
    const humans = this.participants.filter((participant) => !participant.isAI);
    const fallbackLastActiveByUid = new Map<string, string | undefined>();
    const uids = humans
      .map((participant) => {
        const uid = String(participant.uid || '').trim();
        if (uid) fallbackLastActiveByUid.set(uid, participant.lastActiveAt);
        return uid;
      })
      .filter(Boolean);
    const uidKey = uids.sort().join('|');
    if (uidKey === this.participantPresenceUidKey) return;
    this.participantPresenceUidKey = uidKey;

    this.participantPresenceSub?.unsubscribe();
    this.participantPresenceSub = this.presence
      .watchOnlineUids$(uids, fallbackLastActiveByUid)
      .subscribe((onlineUids) => {
        this.participants = this.participants.map((participant) => ({
          ...participant,
          isOnline: !!participant.uid && onlineUids.has(participant.uid),
        }));
        this.onlineParticipants = this.participants.filter(
          (participant) => !participant.isAI && participant.isOnline
        );
      });
  }

  /** Handle input changes to detect @ mentions */
  onPromptInput(event: Event) {
    this.registerDiscussionTypingActivity();
    const textarea = event.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = this.prompt.substring(0, cursorPos);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show dropdown if there's no space after @ (still typing mention)
      if (!textAfterAt.includes(' ')) {
        this.mentionStartIndex = lastAtIndex;
        this.mentionSearchText = textAfterAt.toLowerCase();
        this.filterParticipants();
        this.showMentionDropdown = true;
        console.log('Showing mention dropdown:', {
          mentionSearchText: this.mentionSearchText,
          filteredParticipants: this.filteredParticipants.length,
          showEveryoneOption: this.shouldShowEveryoneOption()
        });
        return;
      }
    }
    
    this.showMentionDropdown = false;
    this.mentionStartIndex = -1;
  }

  private watchDiscussionTyping(): void {
    const contextId = this.discussionTypingContextId;
    if (!contextId) return;

    const currentUid =
      this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    this.typingPresenceSub?.unsubscribe();
    this.typingPresenceSub = this.presence
      .watchTypingUsers$(contextId)
      .subscribe((typingUsers) => {
        this.typingParticipants = typingUsers.filter(
          (typingUser) =>
            typingUser.uid !== currentUid &&
            typingUser.activity === 'discussion'
        );
      });
  }

  private registerDiscussionTypingActivity(): void {
    const contextId = this.discussionTypingContextId;
    const uid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    if (!contextId || !uid) return;

    if (!this.prompt.trim()) {
      this.stopDiscussionTyping();
      return;
    }

    const now = Date.now();
    if (now - this.lastTypingWriteAt >= 900) {
      this.lastTypingWriteAt = now;
      const displayName =
        [this.auth.currentUser?.firstName, this.auth.currentUser?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        this.auth.currentUser?.email ||
        'Team member';
      void this.presence.setTyping(
        contextId,
        uid,
        displayName,
        this.profilePic,
        'discussion',
        'Team discussion'
      );
    }

    if (this.typingStopTimeout) {
      clearTimeout(this.typingStopTimeout);
    }
    this.typingStopTimeout = setTimeout(
      () => this.stopDiscussionTyping(),
      2_800
    );
  }

  stopDiscussionTyping(): void {
    if (this.typingStopTimeout) {
      clearTimeout(this.typingStopTimeout);
      this.typingStopTimeout = undefined;
    }
    this.lastTypingWriteAt = 0;

    const contextId = this.discussionTypingContextId;
    const uid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    if (contextId && uid) {
      void this.presence.clearTyping(contextId, uid);
    }
  }

  get discussionTypingLabel(): string {
    const names = this.typingParticipants.map((participant) =>
      participant.displayName.trim()
    );
    if (!names.length) return '';
    if (names.length === 1) {
      return `${names[0]} is typing`;
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing`;
    }
    return `${names[0]} and ${names.length - 1} others are typing`;
  }

  private get discussionTypingContextId(): string {
    const solutionId = this.currentSolution?.solutionId || this.id;
    return solutionId ? `solution-${solutionId}-room-${this.activeRoomId}` : '';
  }

  /** Filter participants based on search text */
  private filterParticipants() {
    const searchText = this.mentionSearchText.toLowerCase();

    // Filter human participants (non-AI)
    if (!searchText) {
      this.filteredParticipants = this.participants.filter((p) => !p.isAI);
      this.filteredAIAvatars = this.participants.filter((p) => p.isAI);
    } else {
      this.filteredParticipants = this.participants.filter(
        (p) =>
          !p.isAI &&
          (p.displayName.toLowerCase().includes(searchText) ||
            p.email.toLowerCase().includes(searchText))
      );

      // Filter AI avatars
      this.filteredAIAvatars = this.participants.filter(
        (p) =>
          p.isAI &&
          p.displayName.toLowerCase().includes(searchText)
      );
    }
  }

  /** Insert selected mention into the prompt */
  selectMention(participant: ParticipantInfo | 'everyone') {
    if (this.mentionStartIndex === -1) return;

    const beforeMention = this.prompt.substring(0, this.mentionStartIndex);
    const afterMention = this.prompt.substring(
      this.mentionStartIndex + 1 + this.mentionSearchText.length
    );

    if (participant === 'everyone') {
      this.prompt = `${beforeMention}@everyone ${afterMention}`;
    } else {
      this.prompt = `${beforeMention}@${participant.displayName} ${afterMention}`;
    }
    this.registerDiscussionTypingActivity();

    this.showMentionDropdown = false;
    this.mentionStartIndex = -1;
    this.mentionSearchText = '';
  }

  /** Close mention dropdown */
  closeMentionDropdown() {
    this.showMentionDropdown = false;
    this.mentionStartIndex = -1;
    this.mentionSearchText = '';
  }

  /** Parse message for @mentions and send notifications */
  private async processMentions(content: string) {
    if (!content) return;

    const senderName = `${this.auth.currentUser.firstName} ${this.auth.currentUser.lastName}`.trim();
    const challengeTitle = this.currentSolution?.title || 'Discussion';
    const discussionUrl = `${window.location.origin}${this.getDiscussionRoute()}`;

    // Check for @everyone
    if (content.toLowerCase().includes('@everyone')) {
      const recipientEmails = this.participants
        .filter(
          (p) =>
            !p.isAI &&
            !!p.email &&
            p.email !== this.auth.currentUser.email?.toLowerCase()
        )
        .map((p) => p.email);

      if (recipientEmails.length > 0) {
        try {
          const callable = this.fns.httpsCallable('sendMentionNotification');
          await firstValueFrom(
            callable({
              mentionType: 'everyone',
              recipients: recipientEmails,
              senderName,
              messageContent: content,
              challengeTitle,
              discussionUrl,
            })
          );
        } catch (err) {
          console.error('Failed to send @everyone notification:', err);
        }
      }
      return; // Don't process individual mentions if @everyone was used
    }

    // Check for individual @mentions
    const mentionPattern = /@([^\s@]+(?:\s+[^\s@]+)?)/g;
    const matches = content.matchAll(mentionPattern);
    const mentionedEmails: string[] = [];

    for (const match of matches) {
      const mentionText = match[1].toLowerCase();
      // Find participant by display name or email
      const found = this.participants.find(
        (p) =>
          p.displayName.toLowerCase() === mentionText ||
          p.email.toLowerCase() === mentionText ||
          p.displayName.toLowerCase().startsWith(mentionText)
      );
      if (
        found &&
        !found.isAI &&
        found.email &&
        found.email !== this.auth.currentUser.email?.toLowerCase()
      ) {
        if (!mentionedEmails.includes(found.email)) {
          mentionedEmails.push(found.email);
        }
      }
    }

    if (mentionedEmails.length > 0) {
      try {
        const callable = this.fns.httpsCallable('sendMentionNotification');
        await firstValueFrom(
          callable({
            mentionType: 'individual',
            recipients: mentionedEmails,
            senderName,
            messageContent: content,
            challengeTitle,
            discussionUrl,
          })
        );
      } catch (err) {
        console.error('Failed to send mention notifications:', err);
      }
    }
  }

  /** Check if text shows @everyone mention hint */
  shouldShowEveryoneOption(): boolean {
    return (
      !this.mentionSearchText ||
      'everyone'.startsWith(this.mentionSearchText.toLowerCase())
    );
  }

  /** Highlight @mentions and format markdown in displayed message content */
  highlightMentions(text: string): string {
    if (!text) return '';

    // First linkify URLs
    let result = this.linkify(text);

    // Format markdown: bold (**text** or __text__)
    result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // Format markdown: italic (*text* or _text_) - but not inside URLs or already processed
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    result = result.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

    // Format markdown: bullet points (lines starting with * or -)
    result = result.replace(/^[\*\-]\s+(.+)$/gm, '<li class="ml-4">$1</li>');

    // Format markdown: numbered lists (lines starting with 1. 2. etc)
    result = result.replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');

    // Then highlight @mentions
    result = result.replace(
      /@everyone\b/gi,
      '<span class="mention-everyone font-semibold text-amber-500">@everyone</span>'
    );
    result = result.replace(
      /@([^\s<]+)/g,
      '<span class="mention font-semibold text-blue-400">@$1</span>'
    );

    // Convert newlines to <br> for proper display
    result = result.replace(/\n/g, '<br>');

    return result;
  }

  // ============ AI Mention functionality ============

  /** Process AI mentions in the message and generate responses */
  private async processAIMentions(content: string) {
    if (!content) return;

    // Find AI mentions in content
    const aiMentionPattern = /@([^\s@]+)/g;
    const matches = [...content.matchAll(aiMentionPattern)];
    const processedAIs = new Set<string>();

    for (const match of matches) {
      const mentionName = match[1].toLowerCase();

      // Find matching AI participant
      const ai = this.participants.find(
        (p) =>
          p.isAI &&
          (p.displayName.toLowerCase() === mentionName ||
            p.displayName.toLowerCase().replace(/\s+/g, '').includes(mentionName.replace(/\s+/g, '')) ||
            p.displayName.split(' ')[0].toLowerCase() === mentionName)
      );

      // Process ALL mentioned AIs (user preference: all respond)
      if (ai && ai.collectionKey && !processedAIs.has(ai.collectionKey)) {
        processedAIs.add(ai.collectionKey);
        await this.generateAIResponse(ai, content);
      }
    }
  }

  private async startRoundtable(userMessage: string): Promise<void> {
    const agents = this.participants.filter(
      (participant) => participant.isAI && participant.collectionKey
    );
    if (!agents.length) {
      alert('Add at least one AI agent to this room before starting a round.');
      return;
    }

    this.roundInProgress = true;
    this.roundStopRequested = false;
    this.roundCurrentTurn = 0;
    this.roundTotalTurns = agents.length * this.roundLimit;

    try {
      for (let round = 1; round <= this.roundLimit; round += 1) {
        for (const agent of agents) {
          if (this.roundStopRequested) return;
          this.roundCurrentTurn += 1;
          this.roundStatusLabel = `Round ${round} of ${this.roundLimit} · ${agent.displayName} is responding · ${this.roundCurrentTurn} of ${this.roundTotalTurns}`;
          await this.generateAIResponse(agent, userMessage, round);
        }
      }
    } finally {
      const stopped = this.roundStopRequested;
      this.roundInProgress = false;
      this.roundStopRequested = false;
      this.roundStatusLabel = stopped
        ? 'Round stopped.'
        : `Round complete · ${this.roundCurrentTurn} AI response${this.roundCurrentTurn === 1 ? '' : 's'}`;
      setTimeout(() => {
        if (!this.roundInProgress) this.roundStatusLabel = '';
      }, 4_000);
    }
  }

  /** Generate an AI response and add it to the discussion */
  private async generateAIResponse(
    ai: ParticipantInfo,
    userMessage: string,
    roundNumber?: number
  ): Promise<void> {
    // Build context from full discussion
    const context = this.buildDiscussionContext();

    // Create prompt document in Firestore (triggers Cloud Function)
    // NOTE: Must write to 'discussions' collection to trigger the onChatPrompt Cloud Function
    const uid = this.auth.currentUser.uid;
    const docId = this.afs.createId();
    const docRef = this.afs.doc(
      `users/${uid}/discussions/${docId}`
    ) as AngularFirestoreDocument<any>;

    // Add placeholder message immediately
    const nowIso = new Date().toISOString();
    const placeholderMsg: Comment = {
      messageId: this.afs.createId(),
      date: nowIso,
      authorId: `ai-${ai.collectionKey}`,
      authorName: ai.displayName,
      profilePic: ai.avatarPath,
      content: '',
      displayTime: this.time.formatDateStringComment(nowIso),
      isAI: true,
      aiProvider: ai.providerLabel || 'Google',
      aiModel: ai.model || '',
      isLoading: true,
    };
    this.comments.push(placeholderMsg);
    this.scrollToBottom();

    const participationInstruction = roundNumber
      ? `You are participating in round ${roundNumber} of a controlled roundtable. Other AI agents may have already responded. Add a distinct perspective, acknowledge useful prior points, and do not address or trigger other agents with @mentions.`
      : 'A team member explicitly mentioned you. Respond to that person without triggering other agents.';

    try {
      // Write prompt to trigger the provider-neutral Cloud Function.
      await docRef.set({
        provider: ai.provider || 'google',
        requestedAgentKey: ai.collectionKey || '',
        conversationId: this.getDiscussionDocPath(),
        prompt: `You are ${ai.displayName}, an AI team member participating in the “${this.activeRoom.name}” room.
${participationInstruction}
Here is the context of the conversation so far:

${context}

A team member submitted this message: "${userMessage}"

Please respond helpfully to their question or comment, staying in character as ${ai.displayName}.
Keep your response concise and relevant to the discussion.
You may use basic markdown for emphasis: **bold** for important terms, *italic* for emphasis.
For lists, use dashes (-) or numbers (1. 2. 3.).`,
      });
    } catch (error) {
      await this.finishAIPlaceholder(
        placeholderMsg,
        'This AI provider could not be reached. Please check its configuration and try again.'
      );
      return;
    }

    await new Promise<void>((resolve) => {
      let finished = false;
      let subscription: Subscription | undefined;
      let timeout: ReturnType<typeof setTimeout>;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        subscription?.unsubscribe();
        resolve();
      };
      timeout = setTimeout(async () => {
        await this.finishAIPlaceholder(
          placeholderMsg,
          `${ai.displayName} took too long to respond. You can continue the discussion or try again.`
        );
        finish();
      }, 190_000);
      subscription = docRef.valueChanges().subscribe(async (data: any) => {
        if (!data?.status || finished) return;

        if (data.status.state === 'COMPLETED' && data.response) {
          await this.finishAIPlaceholder(
            placeholderMsg,
            data.response,
            data.providerLabel || ai.providerLabel,
            data.modelUsed || ai.model
          );
          this.playPing();
          finish();
        } else if (data.status.state === 'ERRORED') {
          await this.finishAIPlaceholder(
            placeholderMsg,
            data.response ||
              data.status.error ||
              'This AI provider encountered an error. Please try again.'
          );
          finish();
        }
      });
    });
  }

  private async finishAIPlaceholder(
    placeholder: Comment,
    content: string,
    providerLabel?: string,
    model?: string
  ): Promise<void> {
    await new Promise<void>((resolve) => {
      this.ngZone.run(async () => {
        const msgIndex = this.comments.findIndex(
          (comment) => comment.messageId === placeholder.messageId
        );
        if (msgIndex !== -1) {
          this.comments[msgIndex] = {
            ...this.comments[msgIndex],
            content,
            aiProvider: providerLabel || this.comments[msgIndex].aiProvider,
            aiModel: model || this.comments[msgIndex].aiModel,
            isLoading: false,
          };
          this.comments = [...this.comments];
        }
        await this.syncDiscussion();
        this.scrollToBottom();
        resolve();
      });
    });
  }

  /** Build context from the discussion for AI */
  private buildDiscussionContext(): string {
    // Get last 20 messages for context
    const recentMessages = this.comments.slice(-20);
    return recentMessages
      .filter((c) => c.content && !c.isLoading)
      .map((c) => `${c.authorName}: ${c.content}`)
      .join('\n');
  }
}
