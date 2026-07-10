// src/app/pages/avatar-detail/avatar-detail.component.ts
import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { lastValueFrom, Subscription } from 'rxjs';
import { AvatarRegistryService } from '../../services/avatar-registry.service';
import { AuthService } from '../../services/auth.service';
import { ChatBotService } from '../../services/chat-bot.service';
import { BoxService } from '../../services/box.service';
import { Avatar } from 'src/app/models/user';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoiceService } from '../../services/voice.service';

interface DisplayMessage {
  text: string;
  type: 'PROMPT' | 'RESPONSE';
  loading?: boolean;
  pending?: string;
  typing?: boolean;
}

interface AvatarIntroVideo {
  title: string;
  url: string;
  storagePath: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

@Component({
  selector: 'app-avatar-detail',
  templateUrl: './avatar-detail.component.html',
})
export class AvatarDetailComponent implements OnInit, OnDestroy {
  @ViewChild('bottomAnchor') private bottomAnchor!: ElementRef<HTMLDivElement>;
  @ViewChild('chatWindow') chatWindow!: ElementRef;
  @ViewChild('promptInput') promptInput!: ElementRef<HTMLInputElement>;

  avatar!: Avatar;
  allAvatars: Avatar[] = [];
  status = '';
  errorMsg = '';
  singleCopyStates: string[] = [];
  responses: DisplayMessage[] = [];
  private readonly typewriterDelay = 0;
  private readonly typewriterTimers = new WeakMap<DisplayMessage, number>();
  private readonly typewriterChunkSize = 4;
  voiceStatus = '';
  isRecording = false;
  voiceProcessing = false;
  autoSpeak = false;
  private spokenMessages = new WeakSet<DisplayMessage>();
  private readonly voiceLanguage = 'en-US';
  conversationMode = false;
  private readonly maxConversationRecordingMs = 15000;
  private conversationTimeoutHandle?: number;
  private autoSpeakBeforeConversation: boolean | null = null;
  private suppressNextAutoListen = false;
  private lastAssistantSpeechText = '';
  private lastAssistantSpeechTextNormalized = '';
  introVideo: AvatarIntroVideo | null = null;
  showVideoEditor = false;
  videoTitle = '';
  selectedVideoFile: File | null = null;
  videoError = '';
  videoStatus = '';
  videoUploadProgress: number | null = null;
  isSavingVideo = false;
  isDeletingVideo = false;
  private introVideoSub?: Subscription;
  private currentAvatarSlug = '';

  /** NEW: persistent guest id for anonymous users */
  private guestId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private registry: AvatarRegistryService,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private cdRef: ChangeDetectorRef,
    public chat: ChatBotService,
    public auth: AuthService,
    private box: BoxService,
    public voice: VoiceService
  ) {}

  get isAdmin(): boolean {
    const user = this.auth?.currentUser;
    return user?.admin?.toLowerCase() === 'true' || user?.role === 'admin';
  }

  /** NEW: unify actor id so backend can attribute prompts */
  get actorId(): string {
    return (this.auth?.currentUser as any)?.uid || this.guestId;
  }
  get actorType(): 'USER' | 'GUEST' {
    return this.isLoggedIn ? 'USER' : 'GUEST';
  }

  ngOnInit(): void {
    this.guestId = this.ensureGuestId();

    this.allAvatars = this.registry.getAll();
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.router.navigate(['/other-ais']);
        return;
      }

      const state = history.state as Record<string, any> | null;
      const candidate = state?.hasOwnProperty('avatar')
        ? (state['avatar'] as Avatar | undefined)
        : undefined;

      this.loadAvatar(slug, candidate);
    });
  }

  ngOnDestroy(): void {
    this.introVideoSub?.unsubscribe();
    document.body.style.overflow = '';
    this.endConversation();
  }

  /** NEW: create or restore a stable guest id */
  private ensureGuestId(): string {
    try {
      const k = 'nw_guest_id';
      let id = localStorage.getItem(k) || '';
      if (!id) {
        id = 'guest_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(k, id);
      }
      return id;
    } catch {
      // If storage blocked, fall back to ephemeral id
      return 'guest_' + Math.random().toString(36).slice(2, 10);
    }
  }

  backToPool() {
    this.router.navigate(['/other-ais']);
  }

  switchAvatar(slug: string) {
    const a = this.allAvatars.find((v) => v.slug === slug);
    if (!a) return;
    this.router.navigate(['/avatar', a.slug], { state: { avatar: a } });
  }

  private loadAvatar(slug: string, stateAvatar?: Avatar) {
    const next = stateAvatar ?? this.registry.getBySlug(slug);
    if (!next) {
      this.router.navigate(['/other-ais']);
      return;
    }

    this.currentAvatarSlug = slug;
    this.avatar = { ...next, slug };
    this.watchIntroVideo(slug);
    this.responses = [{ text: this.avatar.name || '', type: 'RESPONSE' }];
    this.singleCopyStates = [];
    this.spokenMessages = new WeakSet<DisplayMessage>();
    this.endConversation();
    this.voiceStatus = '';
    this.isRecording = false;
    this.voiceProcessing = false;
    this.status =
      this.avatar.requiresAdmin && !this.isAdmin ? 'Admin-only avatar.' : '';

    setTimeout(() => window.scrollTo({ top: 0 }), 0);

    // Keep pending prompt behavior for logged users; guests can just type now.
    const pending = sessionStorage.getItem('pendingPrompt');
    if (pending && this.isLoggedIn) {
      setTimeout(() => {
        this.scrollToChat();
        if (this.promptInput?.nativeElement) {
          this.promptInput.nativeElement.value = pending;
          this.promptInput.nativeElement.focus();
        }
      }, 0);
      sessionStorage.removeItem('pendingPrompt');
    }
  }

  private watchIntroVideo(slug: string): void {
    this.introVideoSub?.unsubscribe();
    this.introVideo = null;
    this.introVideoSub = this.afs
      .doc<AvatarIntroVideo>(`avatar_intro_videos/${slug}`)
      .valueChanges()
      .subscribe((video) => (this.introVideo = video || null));
  }

  openVideoEditor(): void {
    if (!this.isAdmin) return;
    this.videoTitle = this.introVideo?.title || `Meet ${this.avatar.name}`;
    this.selectedVideoFile = null;
    this.videoError = '';
    this.videoStatus = '';
    this.videoUploadProgress = null;
    this.showVideoEditor = true;
    document.body.style.overflow = 'hidden';
  }

  closeVideoEditor(): void {
    if (this.isSavingVideo) return;
    this.showVideoEditor = false;
    this.selectedVideoFile = null;
    this.videoError = '';
    this.videoStatus = '';
    this.videoUploadProgress = null;
    document.body.style.overflow = '';
  }

  onIntroVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedVideoFile = input.files?.[0] || null;
    this.videoError = '';
    this.videoStatus = this.selectedVideoFile
      ? `${this.selectedVideoFile.name} is ready to upload.`
      : '';
  }

  async saveIntroVideo(): Promise<void> {
    if (!this.isAdmin) {
      this.videoError = 'Your account no longer has permission to manage this video. Refresh the page and sign in again.';
      return;
    }
    if (this.isSavingVideo) {
      this.videoStatus = 'The video is already being uploaded. Please wait for it to finish.';
      return;
    }
    const avatarSlug = this.currentAvatarSlug || this.avatar?.slug || '';
    if (!avatarSlug) {
      this.videoError = 'This avatar could not be identified. Refresh the page and try again.';
      return;
    }
    const title = this.videoTitle.trim();
    const file = this.selectedVideoFile;
    if (!title) {
      this.videoError = 'Add a clear title for the introduction.';
      return;
    }
    if (!this.introVideo && !file) {
      this.videoError = 'Choose a video file to upload.';
      return;
    }
    if (file && !file.type.startsWith('video/')) {
      this.videoError = 'Choose a valid video file.';
      return;
    }
    if (file && file.size === 0) {
      this.videoError = 'The selected video file is empty. Choose a different file.';
      return;
    }
    if (file && file.size >= 2 * 1024 * 1024 * 1024) {
      this.videoError = 'The selected video must be smaller than 2 GB.';
      return;
    }

    this.isSavingVideo = true;
    this.videoError = '';
    this.videoStatus = file ? 'Starting upload…' : 'Saving changes…';
    let progressSub: Subscription | undefined;
    let newStoragePath = '';
    let uploadCompleted = false;
    let savedSuccessfully = false;
    try {
      const now = Date.now();
      const video: AvatarIntroVideo = this.introVideo
        ? { ...this.introVideo, title }
        : {
            title,
            url: '',
            storagePath: '',
            fileName: '',
            contentType: '',
            size: 0,
          };

      if (file) {
        const safeName = this.safeVideoFileName(file.name);
        newStoragePath = `avatarIntroVideos/${avatarSlug}/${now}-${safeName}`;
        const storageRef = this.storage.ref(newStoragePath);
        const task = this.storage.upload(newStoragePath, file, {
          contentType: file.type,
          customMetadata: {
            avatarSlug,
            uploadedBy: this.auth.currentUser?.uid || '',
            originalName: file.name,
          },
        });
        progressSub = task.percentageChanges().subscribe((progress) => {
          this.videoUploadProgress = Math.round(progress || 0);
          this.videoStatus = `Uploading ${file.name}: ${this.videoUploadProgress}%`;
        });
        // Waiting on the upload task itself is deterministic. snapshotChanges()
        // can remain open in some AngularFire/browser combinations after 100%.
        await task;
        uploadCompleted = true;
        this.videoStatus = 'Upload complete. Saving the video details…';
        video.url = await lastValueFrom(storageRef.getDownloadURL());
        video.storagePath = newStoragePath;
        video.fileName = file.name;
        video.contentType = file.type;
        video.size = file.size;
      }

      const oldStoragePath = this.introVideo?.storagePath || '';
      const userId = this.auth.currentUser?.uid || '';
      await this.afs.doc(`avatar_intro_videos/${avatarSlug}`).set(
        {
          ...video,
          ...(this.introVideo
            ? {
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: userId,
              }
            : {
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: userId,
              }),
        },
        { merge: true }
      );
      if (file && oldStoragePath && oldStoragePath !== newStoragePath) {
        await this.deleteStoredVideo(oldStoragePath);
      }
      savedSuccessfully = true;
      this.videoStatus = 'Video saved.';
    } catch (error) {
      console.error('Could not save avatar introduction video', error);
      const code = (error as any)?.code || '';
      this.videoError = code === 'storage/unauthorized'
        ? 'Firebase Storage denied this upload. The video storage rules need to be deployed.'
        : 'Could not save this video. Please try again.';
      // Only clean up when Storage confirmed that a file was created. A denied
      // upload has nothing to delete and would otherwise create a second 403.
      if (newStoragePath && uploadCompleted) await this.deleteStoredVideo(newStoragePath);
    } finally {
      progressSub?.unsubscribe();
      this.isSavingVideo = false;
      this.videoUploadProgress = null;
      if (savedSuccessfully) this.closeVideoEditor();
    }
  }

  async deleteIntroVideo(): Promise<void> {
    const avatarSlug = this.currentAvatarSlug || this.avatar?.slug || '';
    if (!this.isAdmin || !this.introVideo || !avatarSlug || this.isDeletingVideo) return;
    if (!window.confirm(`Delete the introduction video for ${this.avatar.name}?`)) return;
    this.isDeletingVideo = true;
    try {
      const storagePath = this.introVideo.storagePath;
      await this.afs.doc(`avatar_intro_videos/${avatarSlug}`).delete();
      if (storagePath) await this.deleteStoredVideo(storagePath);
      this.closeVideoEditor();
    } catch (error) {
      console.error('Could not delete avatar introduction video', error);
      this.videoError = 'Could not delete this video. Please try again.';
    } finally {
      this.isDeletingVideo = false;
    }
  }

  private async deleteStoredVideo(path: string): Promise<void> {
    try {
      await lastValueFrom(this.storage.ref(path).delete());
    } catch (error) {
      console.warn('Could not delete stored avatar video', error);
    }
  }

  private safeVideoFileName(fileName: string): string {
    return (
      fileName
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') || 'intro-video.mp4'
    );
  }

  scrollToChat() {
    // CHANGED: allow guests (no redirect)
    this.chatWindow?.nativeElement.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setTimeout(() => this.promptInput?.nativeElement.focus(), 250);
  }

  // keyboard: "/" focuses the prompt
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if (e.key === '/') {
      e.preventDefault();
      this.promptInput?.nativeElement.focus();
    }
  }

  private scrollToBottom(behavior: ScrollBehavior = 'smooth'): void {
    this.bottomAnchor?.nativeElement.scrollIntoView({ behavior });
  }

  get introSnippet(): string {
    if (!this.avatar?.intro) return '';
    const text = this.toPlainText(this.avatar.intro).trim();
    if (!text) return '';
    const words = text.split(/\s+/).filter(Boolean);
    const limit = 30;
    if (words.length <= limit) {
      return words.join(' ');
    }
    return words.slice(0, limit).join(' ') + '…';
  }

  private toPlainText(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  copySingleMessage(text: string, idx: number): void {
    this.box
      .copy(text)
      .then(() => {
        this.singleCopyStates[idx] = 'Copied!';
        setTimeout(() => (this.singleCopyStates[idx] = 'Copy'), 2000);
      })
      .catch(() => {});
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // CHANGED: guests can use quick prompts too (no redirect)
  quickPromptFill(str: string) {
    if (!this.promptInput) return;
    this.promptInput.nativeElement.value = str;
    this.promptInput.nativeElement.focus();
  }

  // CHAT FLOW
  async submitPrompt(
    event: Event,
    promptInputEl: HTMLInputElement
  ): Promise<void> {
    event.preventDefault();
    const val = promptInputEl.value.trim();
    if (!val) return;

    // CHANGED: no login requirement
    promptInputEl.value = '';
    await this.sendPrompt(val);
  }

  private async sendPrompt(value: string): Promise<void> {
    const prompt = value.trim();
    if (!prompt) return;

    this.voiceStatus = '';
    this.responses.push({ text: prompt, type: 'PROMPT' });
    this.singleCopyStates.push('Copy');
    this.scrollToBottom();

    const placeholder: DisplayMessage = {
      text: '',
      type: 'RESPONSE',
      loading: true,
    };
    const placeholderIndex = this.responses.push(placeholder) - 1;
    this.singleCopyStates.push('Copy');
    this.scrollToBottom('auto');
    this.status = 'thinking…';
    this.spokenMessages.delete(placeholder);

    const id = this.afs.createId();
    const discussionRef = this.afs.doc(
      `${this.avatar.collectionPath}${id}`
    ) as AngularFirestoreDocument<any>;

    try {
      await discussionRef.set({
        prompt,
        actorId: this.actorId,
        actorType: this.actorType,
        createdAt: new Date(),
      });
    } catch (err) {
      this.status = 'Unable to send that. Please try again.';
      placeholder.loading = false;
      this.responses.splice(placeholderIndex, 1);
      this.singleCopyStates.splice(placeholderIndex, 1);
      throw err;
    }

    let hasReceivedText = false;
    const destroy = discussionRef.valueChanges().subscribe({
      next: (conversation) => {
        if (!conversation) return;
        const state = conversation.status?.state;
        const latestText: string = conversation.response || '';
        const totalRenderedLength =
          (placeholder.text?.length || 0) + (placeholder.pending?.length || 0);

        if (latestText) {
          hasReceivedText = true;
          placeholder.loading = false;
          const diff = latestText.slice(totalRenderedLength);
          if (diff) {
            placeholder.pending = (placeholder.pending || '') + diff;
            this.startTypewriter(placeholder);
          } else if (!placeholder.pending && !placeholder.typing) {
            this.onTypewriterComplete(placeholder);
          }
          if (!this.singleCopyStates[placeholderIndex]) {
            this.singleCopyStates[placeholderIndex] = 'Copy';
          }
        }

        if (state === 'PROCESSING') {
          this.status = hasReceivedText ? 'writing…' : 'thinking…';
          return;
        }

        if (state === 'COMPLETED') {
          this.status = '';
          placeholder.loading = false;
          if (latestText.length > totalRenderedLength) {
            const finalDiff = latestText.slice(totalRenderedLength);
            placeholder.pending = (placeholder.pending || '') + finalDiff;
            this.startTypewriter(placeholder);
          } else if (!placeholder.pending && !placeholder.typing) {
            this.onTypewriterComplete(placeholder);
          }
          destroy.unsubscribe();
        } else if (state === 'ERRORED') {
          this.status = 'Oh no! Something went wrong. Please try again.';
          placeholder.loading = false;
          this.stopTypewriter(placeholder);
          this.responses.splice(placeholderIndex, 1);
          this.singleCopyStates.splice(placeholderIndex, 1);
          destroy.unsubscribe();
        }
      },
      error: (err) => {
        this.errorMsg = err.message;
        this.stopTypewriter(placeholder);
        destroy.unsubscribe();
      },
    });
  }

  private startTypewriter(msg: DisplayMessage): void {
    if (!msg.pending || msg.pending.length === 0) {
      if (!msg.typing) {
        this.onTypewriterComplete(msg);
      }
      return;
    }
    if (msg.typing) return;

    const step = () => {
      if (!msg.pending || msg.pending.length === 0) {
        msg.typing = false;
        const timer = this.typewriterTimers.get(msg);
        if (timer) {
          clearTimeout(timer);
          this.typewriterTimers.delete(msg);
        }
        this.cdRef.detectChanges();
        this.onTypewriterComplete(msg);
        return;
      }

      msg.typing = true;
      const chunk =
        msg.pending.length <= this.typewriterChunkSize
          ? msg.pending
          : msg.pending.slice(0, this.typewriterChunkSize);
      msg.pending = msg.pending.slice(chunk.length);
      msg.text += chunk;
      this.cdRef.detectChanges();
      this.scrollToBottom('auto');

      const handle = window.setTimeout(step, this.typewriterDelay);
      this.typewriterTimers.set(msg, handle);
    };

    step();
  }

  private stopTypewriter(msg: DisplayMessage): void {
    const timer = this.typewriterTimers.get(msg);
    if (timer) {
      clearTimeout(timer);
      this.typewriterTimers.delete(msg);
    }
    msg.typing = false;
    msg.pending = '';
  }

  private onTypewriterComplete(msg: DisplayMessage): void {
    if (msg.type !== 'RESPONSE') return;
    if (msg.typing) return;
    if (msg.pending && msg.pending.length) return;
    if (!msg.text || !msg.text.trim()) return;
    if (this.spokenMessages.has(msg)) return;

    this.spokenMessages.add(msg);
    if (!this.autoSpeak) {
      if (this.conversationMode) {
        this.voiceStatus = 'Listening…';
        setTimeout(
          () => this.beginConversationListening().catch(() => {}),
          250
        );
      }
      return;
    }

    if (this.conversationMode) {
      this.voiceStatus = 'Speaking…';
    }

    const speechPayload = this.prepareSpeechText(msg.text);
    this.voice
      .playText(speechPayload, { languageCode: this.voiceLanguage })
      .then(() => {
        this.lastAssistantSpeechText = speechPayload;
        this.lastAssistantSpeechTextNormalized =
          this.normalizeForComparison(speechPayload);
        this.handleSpeechCompletion();
      })
      .catch(() => {
        this.lastAssistantSpeechText = speechPayload;
        this.lastAssistantSpeechTextNormalized =
          this.normalizeForComparison(speechPayload);
        this.handleSpeechCompletion();
      });
  }

  private handleSpeechCompletion(): void {
    if (this.conversationMode && !this.suppressNextAutoListen) {
      this.voiceStatus = 'Listening…';
      setTimeout(() => this.beginConversationListening().catch(() => {}), 250);
    }
    this.suppressNextAutoListen = false;
  }

  async toggleVoiceRecording(): Promise<void> {
    // Keep voice features behind sign-in for now (easy to open later)
    if (!this.isLoggedIn) {
      this.goToLogin();
      return;
    }

    if (!this.voice.supportsRecording) {
      this.voiceStatus = 'Voice chat is not supported in this browser yet.';
      return;
    }

    if (this.conversationMode) {
      this.endConversation('Voice conversation paused.');
      return;
    }

    if (this.voiceProcessing) return;

    if (!this.isRecording) {
      try {
        this.suppressNextAutoListen = this.conversationMode;
        this.voice.stopPlayback();
        await this.voice.startRecording();
        this.isRecording = true;
        this.voiceStatus = 'Listening… tap again to send.';
      } catch (err: any) {
        this.voiceStatus =
          err?.message || 'Microphone access was blocked. Please allow it.';
        this.voice.cancelRecording();
        this.isRecording = false;
      }
      return;
    }

    await this.finishVoiceRecording();
  }

  private async finishVoiceRecording(autoTriggered = false): Promise<void> {
    this.clearConversationTimer();
    this.isRecording = false;
    this.voiceProcessing = true;
    this.voiceStatus = autoTriggered ? 'Processing…' : 'Transcribing…';

    try {
      const recording = await this.voice.stopRecording();
      if (!recording) {
        if (this.conversationMode) {
          this.voiceStatus = 'Didn’t catch that. Listening…';
          setTimeout(
            () => this.beginConversationListening().catch(() => {}),
            600
          );
        } else {
          this.voiceStatus = 'No audio captured. Try again.';
        }
        return;
      }

      if (recording.durationMs < 400) {
        if (this.conversationMode) {
          this.voiceStatus = 'Too short. Listening…';
          setTimeout(
            () => this.beginConversationListening().catch(() => {}),
            600
          );
        } else {
          this.voiceStatus = 'Audio was too short. Try again.';
        }
        return;
      }

      const transcriptRaw = await this.voice.transcribeRecording(
        recording.base64,
        recording.mimeType,
        this.voiceLanguage
      );
      const transcript = this.prepareSpeechText(transcriptRaw);

      if (!transcript) {
        if (this.conversationMode) {
          this.voiceStatus = 'I did not catch that. Listening…';
          setTimeout(
            () => this.beginConversationListening().catch(() => {}),
            600
          );
        } else {
          this.voiceStatus = 'I did not catch any words. Try again.';
        }
        return;
      }

      this.voiceStatus = this.conversationMode ? 'Waiting for response…' : '';
      await this.sendPrompt(transcript);
    } catch (err: any) {
      this.voiceStatus = 'Something went wrong. Listening…';
      if (this.conversationMode) {
        setTimeout(
          () => this.beginConversationListening().catch(() => {}),
          1200
        );
      }
    } finally {
      this.voiceProcessing = false;
      if (!this.conversationMode) this.suppressNextAutoListen = false;
    }
  }

  toggleAutoSpeak(): void {
    this.autoSpeak = !this.autoSpeak;
    if (!this.autoSpeak) {
      this.voice.stopPlayback();
      if (this.conversationMode) {
        this.endConversation('Conversation requires voice playback.');
      }
    }
  }

  async toggleConversationMode(): Promise<void> {
    // Keep behind sign-in for now
    if (this.conversationMode) {
      this.endConversation('Conversation ended.');
      return;
    }

    if (!this.isLoggedIn) {
      this.goToLogin();
      return;
    }

    if (!this.voice.supportsRecording) {
      this.voiceStatus = 'Voice chat is not supported in this browser yet.';
      return;
    }

    if (this.voiceProcessing) return;

    this.conversationMode = true;
    this.autoSpeakBeforeConversation = this.autoSpeak;
    this.autoSpeak = true;
    this.voiceStatus = 'Listening…';

    try {
      await this.beginConversationListening();
    } catch (err: any) {
      this.voiceStatus =
        err?.message ||
        'Could not access the microphone. Conversation stopped.';
      this.endConversation();
    }
  }

  private async beginConversationListening(): Promise<void> {
    if (!this.conversationMode) return;
    if (this.voiceProcessing || this.isRecording) return;

    try {
      this.suppressNextAutoListen = true;
      this.voice.stopPlayback();
      await this.voice.startRecording();
      this.isRecording = true;
      this.voiceStatus = 'Listening…';
      this.clearConversationTimer();
      this.conversationTimeoutHandle = window.setTimeout(() => {
        this.voiceStatus = 'Processing…';
        this.finishVoiceRecording(true).catch(() => {});
      }, this.maxConversationRecordingMs);
    } catch (err: any) {
      this.endConversation('Microphone access blocked. Conversation stopped.');
      throw err;
    }
  }

  private clearConversationTimer(): void {
    if (this.conversationTimeoutHandle) {
      clearTimeout(this.conversationTimeoutHandle);
      this.conversationTimeoutHandle = undefined;
    }
  }

  private endConversation(message?: string): void {
    this.clearConversationTimer();
    if (!this.conversationMode) {
      if (message !== undefined) this.voiceStatus = message;
      this.lastAssistantSpeechText = '';
      return;
    }

    this.conversationMode = false;
    this.voiceProcessing = false;
    if (this.isRecording) this.voice.cancelRecording();
    this.isRecording = false;
    this.voice.stopPlayback();
    if (this.autoSpeakBeforeConversation !== null) {
      this.autoSpeak = this.autoSpeakBeforeConversation;
      this.autoSpeakBeforeConversation = null;
    }
    if (message !== undefined) {
      this.voiceStatus = message;
    } else if (!this.autoSpeak) {
      this.voiceStatus = '';
    }
    this.suppressNextAutoListen = false;
    this.lastAssistantSpeechText = '';
    this.lastAssistantSpeechTextNormalized = '';
  }

  private prepareSpeechText(text: string): string {
    if (!text) return '';
    let cleaned = text
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/[*_`~]+/g, '')
      .replace(/\s*[-•]\s+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned;
  }

  private normalizeForComparison(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isLikelyEcho(transcript: string): boolean {
    const normTranscript = this.normalizeForComparison(transcript);
    if (!normTranscript || !this.lastAssistantSpeechTextNormalized)
      return false;

    const normLast = this.lastAssistantSpeechTextNormalized;
    if (
      normLast.includes(normTranscript) ||
      normTranscript.includes(normLast)
    ) {
      return true;
    }

    const transcriptWords = new Set(normTranscript.split(' '));
    const lastWords = new Set(normLast.split(' '));
    if (transcriptWords.size === 0 || lastWords.size === 0) return false;

    let overlap = 0;
    transcriptWords.forEach((word) => {
      if (lastWords.has(word)) overlap++;
    });

    const overlapRatio =
      overlap / Math.min(transcriptWords.size, lastWords.size);
    const lengthRatio =
      Math.abs(normTranscript.length - normLast.length) /
      Math.max(normTranscript.length, normLast.length);

    return overlapRatio >= 0.8 && lengthRatio <= 0.2;
  }

  // SDG pills (simple labels)
  sdgLabel(n: number) {
    return `SDG ${n}`;
  }

  get isLoggedIn(): boolean {
    return !!this.auth?.currentUser?.email;
  }

  public goToLogin() {
    const redirectTo = this.router.url;
    this.auth.setRedirectUrl(redirectTo);
    sessionStorage.setItem('redirectTo', redirectTo);
    this.router.navigate(['/login'], { queryParams: { redirectTo } });
  }
}
