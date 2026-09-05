import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { lastValueFrom, Subscription } from 'rxjs';
import { extractVideoThumbnails, customVideoThumbnail, VideoThumbnail } from 'src/app/utils/video-thumbnail';
import { AuthService } from 'src/app/services/auth.service';

interface Video {
  id?: string;
  title: string;
  url: string;
  speaker?: string;
  thumbUrl?: string;
  durationSeconds?: number;
  thumbnailSeconds?: number;
  thumbnailStoragePath?: string;
  thumbnailVideoRevision?: string;
  tagline?: string;
  source?: 'curated' | 'admin';
  createdAtMs?: number;
  createdAt?: any;
  createdBy?: string;
  youtubeId?: string | null;
  storagePath?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
}

interface NewsVideoSettings {
  defaultVideoId?: string;
  updatedAt?: any;
  updatedBy?: string;
}

type VideoSort = 'latest' | 'oldest' | 'title';

@Component({
    selector: 'app-nwg-news',
    templateUrl: './nwg-news.component.html',
    styleUrl: './nwg-news.component.css',
    standalone: false
})
export class NwgNewsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') heroVideo?: ElementRef<HTMLVideoElement>;

  readonly DEFAULT_THUMB = '../../../assets/img/design-science.jpg';
  readonly DEFAULT_TAGLINE =
    'Stay up to date with solutions being developed in real time';

  isLoggedIn = false;
  isAdmin = false;
  showUnmute = false;
  showAddVideoModal = false;
  showEditVideoModal = false;
  isSavingVideo = false;
  isUpdatingVideo = false;
  isDeletingVideo = false;
  isSavingDefaultVideo = false;
  addVideoError = '';
  editVideoError = '';
  defaultVideoError = '';
  sortBy: VideoSort = 'latest';
  selectedVideoFile: File | null = null;
  selectedReplacementVideoFile: File | null = null;
  uploadProgress: number | null = null;
  replaceUploadProgress: number | null = null;

  mainVideo: Video | null = null;
  previousVideos: Video[] = [];
  allVideos: Video[] = [];
  safeHeroEmbedUrl: SafeResourceUrl | null = null;
  defaultVideoId = '';
  isVideoCatalogLoading = true;
  requestedVideoUnavailable = false;

  videoForm = {
    title: '',
    speaker: '',
    tagline: '',
  };
  editVideoForm = {
    title: '',
    speaker: '',
    tagline: '',
  };
  editingVideo: Video | null = null;
  thumbnailCandidates: VideoThumbnail[] = [];
  selectedThumbnail: VideoThumbnail | null = null;
  thumbnailBusy = false;
  thumbnailError = '';
  thumbnailTimestamp = 0;
  private thumbnailGeneration = 0;

  async generateThumbnails(timestamp?: number): Promise<void> {
    const source = this.showEditVideoModal
      ? this.selectedReplacementVideoFile || this.editingVideo?.url
      : this.selectedVideoFile;
    if (!source) return;
    const generation = ++this.thumbnailGeneration;
    this.thumbnailBusy = true; this.thumbnailError = '';
    try {
      const candidates = await extractVideoThumbnails(source, timestamp);
      if (generation !== this.thumbnailGeneration) return;
      this.thumbnailCandidates = candidates;
      this.selectedThumbnail = candidates[0] || null;
    } catch (error: any) {
      if (generation === this.thumbnailGeneration) this.thumbnailError = error.message || 'Could not extract a frame. Upload a custom thumbnail.';
    } finally { if (generation === this.thumbnailGeneration) this.thumbnailBusy = false; }
  }

  async onCustomThumbnail(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return;
    const generation = ++this.thumbnailGeneration;
    this.thumbnailBusy = true; this.thumbnailError = '';
    try {
      const dataUrl = await customVideoThumbnail(file);
      if (generation === this.thumbnailGeneration) this.selectedThumbnail = { dataUrl, seconds: -1, duration: this.selectedThumbnail?.duration || this.editingVideo?.durationSeconds || 0 };
    } catch (error: any) { if (generation === this.thumbnailGeneration) this.thumbnailError = error.message; }
    finally { if (generation === this.thumbnailGeneration) this.thumbnailBusy = false; }
  }

  private resetThumbnails(): void {
    this.thumbnailGeneration++; this.thumbnailBusy = false; this.thumbnailCandidates = [];
    this.selectedThumbnail = null; this.thumbnailError = ''; this.thumbnailTimestamp = 0;
  }

  private async uploadThumbnail(id: string, revision: string): Promise<Partial<Video>> {
    const thumbnail = this.selectedThumbnail;
    if (!thumbnail) return {};
    const path = `${this.newsCollection}/thumbnails/${id}/${Date.now()}.jpg`;
    const bytes = Uint8Array.from(atob(thumbnail.dataUrl.split(',')[1]), c => c.charCodeAt(0));
    await lastValueFrom(this.storage.upload(path, new Blob([bytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000,immutable' }).snapshotChanges());
    return { thumbUrl: await lastValueFrom(this.storage.ref(path).getDownloadURL()), thumbnailStoragePath: path,
      thumbnailSeconds: thumbnail.seconds, durationSeconds: thumbnail.duration, thumbnailVideoRevision: revision };
  }

  private readonly newsCollection = 'nwgNewsVideos';
  private readonly newsSettingsDocument = 'nwgNewsSettings/default';
  private readonly curatedVideos: Video[] = [
    {
      id: 'tane-kahu',
      title: `Global Solutions Lab: Changing the World`,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FIB%20Flyer-%20Tane%20Kahu.mp4?alt=media&token=438a21d0-82a9-4043-ad20-0b004d895101',
      speaker: 'Tane Kahu',
      thumbUrl: '../../../assets/img/tane-agent.png',
      tagline: 'Global Solutions Lab AI colleague Tane Kahu',
      source: 'curated',
      createdAtMs: Date.UTC(2026, 5, 1, 9, 0),
    },
    {
      id: 'sofia-change',
      title: `Global Solutions Lab Changemakers Tournament 2025-26`,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FFor%20Tachers.%20_TN.mp4?alt=media&token=3d72ed6d-9baa-46e7-b4fc-801dcaba9208',
      speaker: 'Sofia',
      thumbUrl: '../../../assets/img/sofia-agent.png',
      source: 'curated',
      createdAtMs: Date.UTC(2026, 4, 25, 9, 0),
    },
    {
      id: 'sofia',
      title: 'Global Solutions Lab 2025 Progress - Day 5',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day-5.mp4?alt=media&token=ef413d87-6f54-42ab-a809-1d29e4b9065b',
      speaker: 'Sofia',
      thumbUrl: '../../../assets/img/sofia-agent.png',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 6, 5, 9, 0),
    },
    {
      id: 'li',
      title: 'Global Solutions Lab 2025 Progress - Day 4',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%20Day%20-4.mp4?alt=media&token=2fadd75f-0ae3-41f8-92bf-1f21c8123eb9',
      speaker: 'Li',
      thumbUrl: '../../../assets/img/li-agent.png',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 6, 4, 9, 0),
    },
    {
      id: 'elena-georgian',
      title:
        'Global Solutions Lab 2025 Progress - Day 4 - Short Message in Georgian',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%20Day%20-%20Georgia.mp4?alt=media&token=cbece233-ddbf-4735-bc77-d5afbb7f78b3',
      speaker: 'Elena',
      thumbUrl: '../../../assets/img/elena-agent.png',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 6, 4, 10, 0),
    },
    {
      id: 'georgia',
      title: 'Global Solutions Lab 2025 Progress - Day 3',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day%203.mp4?alt=media&token=d8f8f632-297c-4d0f-a629-3e55af34d17c',
      speaker: 'Georgia',
      thumbUrl: '../../../assets/img/georgia-avatar.png',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 6, 3, 9, 0),
    },
    {
      id: 'elena',
      title: 'Global Solutions Lab 2025 Progress - Day 2',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGSL%202025%20Day%202.mp4?alt=media&token=a12dd4dc-8e9e-492d-97ec-6abdaca0c797',
      speaker: 'Elena',
      thumbUrl: '../../../assets/img/elena-agent.png',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 6, 2, 9, 0),
    },
    {
      id: 'mandy',
      title: 'Mandy Welcome Participants to GSL 2026',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FGlobal%20Solutions%20Lab%20Welcome%20AI_1.mp4?alt=media&token=66be6bb7-8cd6-4ab4-a78e-85ed3c35fa2e',
      speaker: 'Mandy',
      thumbUrl: '../../../assets/img/elena-avatar.png',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 5, 25, 9, 0),
    },
    {
      id: 'renaldo',
      title: 'Global Solutions Lab News',
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FWelcome%20GSL%202025v2.mp4?alt=media&token=37dab895-9458-4865-a7bf-cc7ad853cf80',
      speaker: 'Renaldo',
      thumbUrl: '../../../assets/img/renaldo.webp',
      source: 'curated',
      createdAtMs: Date.UTC(2025, 5, 20, 9, 0),
    },
  ];
  private adminVideos: Video[] = [];
  private authSub?: Subscription;
  private newsSub?: Subscription;
  private newsSettingsSub?: Subscription;
  private routeSub?: Subscription;
  private hasLoadedAdminVideos = false;
  private hasLoadedNewsSettings = false;
  private requestedVideoWaitTimer?: ReturnType<typeof setTimeout>;

  constructor(
    public auth: AuthService,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  get heroTagline(): string {
    const t = this.mainVideo?.tagline?.trim();
    return t ? t : this.DEFAULT_TAGLINE;
  }

  get isHeroYouTube(): boolean {
    return !!this.mainVideo?.youtubeId;
  }

  ngOnInit(): void {
    window.scroll(0, 0);

    this.authSub = this.auth.user$.subscribe((user) => {
      this.isLoggedIn = !!user;
      this.isAdmin = user?.admin === 'true' || user?.role === 'admin';
    });

    this.newsSub = this.afs
      .collection<Video>(this.newsCollection)
      .valueChanges({ idField: 'id' })
      .subscribe({
        next: (videos) => {
          this.adminVideos = videos.map((video) => this.normalizeVideo(video));
          this.hasLoadedAdminVideos = true;
          this.refreshVideosFromSources();
        },
        error: (error) => {
          console.error('Could not load GSL news videos', error);
          this.hasLoadedAdminVideos = true;
          this.refreshVideosFromSources();
        },
      });

    this.newsSettingsSub = this.afs
      .doc<NewsVideoSettings>(this.newsSettingsDocument)
      .valueChanges()
      .subscribe({
        next: (settings) => {
          this.defaultVideoId = (settings?.defaultVideoId || '').trim();
          this.hasLoadedNewsSettings = true;
          this.refreshVideosFromSources();
        },
        error: (error) => {
          console.error('Could not load GSL news settings', error);
          this.hasLoadedNewsSettings = true;
          this.refreshVideosFromSources();
        },
      });

    this.routeSub = this.route.queryParamMap.subscribe(() => {
      this.refreshVideosFromSources();
    });

    this.refreshVideosFromSources();
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.autoPlayWithAudio());
  }

  ngOnDestroy(): void {
    this.resetThumbnails();
    this.authSub?.unsubscribe();
    this.newsSub?.unsubscribe();
    this.newsSettingsSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.clearRequestedVideoWaitTimer();
  }

  selectVideo(vid: Video) {
    this.setMainVideo(vid, true);
  }

  isDefaultVideo(video: Video | null | undefined): boolean {
    return !!video?.id && video.id === this.defaultVideoId;
  }

  async setDefaultVideo(video: Video) {
    if (!this.isAdmin || !video.id || this.isSavingDefaultVideo) return;
    this.isSavingDefaultVideo = true;
    this.defaultVideoError = '';

    try {
      await this.afs.doc<NewsVideoSettings>(this.newsSettingsDocument).set(
        {
          defaultVideoId: video.id,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedBy: this.auth.currentUser?.uid || '',
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Could not set the default GSL news video', error);
      this.defaultVideoError = 'Could not set this video as the default. Please try again.';
    } finally {
      this.isSavingDefaultVideo = false;
    }
  }

  openAddVideoModal() {
    if (!this.isAdmin) return;
    this.addVideoError = '';
    this.showAddVideoModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAddVideoModal() {
    if (this.isSavingVideo) return;
    this.showAddVideoModal = false;
    this.resetVideoForm();
    document.body.style.overflow = '';
  }

  openEditVideoModal(video: Video) {
    if (!this.canManageVideo(video)) return;
    this.resetThumbnails();
    this.editingVideo = video;
    this.editVideoError = '';
    this.selectedReplacementVideoFile = null;
    this.replaceUploadProgress = null;
    this.editVideoForm = {
      title: video.title || '',
      speaker: video.speaker || '',
      tagline: video.tagline || '',
    };
    this.showEditVideoModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeEditVideoModal() {
    if (this.isUpdatingVideo) return;
    this.showEditVideoModal = false;
    this.resetEditVideoForm();
    document.body.style.overflow = '';
  }

  async addVideo() {
    if (!this.isAdmin || this.isSavingVideo || this.thumbnailBusy) return;
    this.addVideoError = '';

    const file = this.selectedVideoFile;
    const title = (this.videoForm.title.trim() || this.titleFromFileName(file?.name || '')).trim();
    if (!file) {
      this.addVideoError = 'Choose a video file to upload.';
      return;
    }
    if (!file.type.startsWith('video/')) {
      this.addVideoError = 'Choose a valid video file.';
      return;
    }
    if (!title) {
      this.addVideoError = 'Add a title for this video.';
      return;
    }

    this.isSavingVideo = true;
    const docRef = this.afs.collection(this.newsCollection).doc();
    const now = Date.now();
    const safeName = this.safeFileName(file.name);
    const year = new Date(now).getFullYear();
    const storagePath = `${this.newsCollection}/videos/${year}/${docRef.ref.id}-${safeName}`;
    const storageRef = this.storage.ref(storagePath);
    const task = this.storage.upload(storagePath, file, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: this.auth.currentUser?.uid || '',
        originalName: file.name,
      },
    });
    const progressSub = task.percentageChanges().subscribe((progress) => {
      this.uploadProgress = Math.round(progress || 0);
    });

    try {
      await lastValueFrom(task.snapshotChanges());
      const url = await lastValueFrom(storageRef.getDownloadURL());
      await docRef.set({
        title,
        url,
        speaker: this.videoForm.speaker.trim(),
        thumbUrl: '',
        ...await this.uploadThumbnail(docRef.ref.id, storagePath),
        tagline: this.videoForm.tagline.trim(),
        source: 'admin',
        youtubeId: null,
        storagePath,
        fileName: file.name,
        contentType: file.type,
        size: file.size,
        createdAtMs: now,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: this.auth.currentUser?.uid || '',
      });
      this.showAddVideoModal = false;
      this.resetVideoForm();
      document.body.style.overflow = '';
    } catch (error) {
      console.error('Could not add GSL news video', error);
      this.addVideoError = 'Could not add this video. Please try again.';
    } finally {
      progressSub.unsubscribe();
      this.isSavingVideo = false;
      this.uploadProgress = null;
    }
  }

  async updateVideo() {
    if (!this.isAdmin || this.isUpdatingVideo || this.thumbnailBusy || !this.editingVideo?.id) return;
    if (!this.canManageVideo(this.editingVideo)) return;
    this.editVideoError = '';

    const title = this.editVideoForm.title.trim();
    if (!title) {
      this.editVideoError = 'Add a title for this video.';
      return;
    }

    const replacement = this.selectedReplacementVideoFile;
    if (replacement && !replacement.type.startsWith('video/')) {
      this.editVideoError = 'Choose a valid replacement video file.';
      return;
    }

    this.isUpdatingVideo = true;
    const docRef = this.afs.collection<Video>(this.newsCollection).doc(this.editingVideo.id);
    const updates: Partial<Video> & { updatedAt?: any; updatedBy?: string } = {
      title,
      speaker: this.editVideoForm.speaker.trim(),
      tagline: this.editVideoForm.tagline.trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: this.auth.currentUser?.uid || '',
    };

    let oldStoragePathToDelete = '';
    let progressSub: Subscription | undefined;

    try {
      if (replacement) {
        const now = Date.now();
        const safeName = this.safeFileName(replacement.name);
        const year = new Date(now).getFullYear();
        const storagePath = `${this.newsCollection}/videos/${year}/${this.editingVideo.id}-${safeName}`;
        const storageRef = this.storage.ref(storagePath);
        const task = this.storage.upload(storagePath, replacement, {
          contentType: replacement.type,
          customMetadata: {
            uploadedBy: this.auth.currentUser?.uid || '',
            originalName: replacement.name,
            replacedVideoId: this.editingVideo.id,
          },
        });
        progressSub = task.percentageChanges().subscribe((progress) => {
          this.replaceUploadProgress = Math.round(progress || 0);
        });

        await lastValueFrom(task.snapshotChanges());
        const url = await lastValueFrom(storageRef.getDownloadURL());
        oldStoragePathToDelete = this.editingVideo.storagePath || '';
        updates.url = url;
        updates.youtubeId = null;
        updates.storagePath = storagePath;
        updates.fileName = replacement.name;
        updates.contentType = replacement.type;
        updates.size = replacement.size;
      }

      if (replacement) {
        // Never reuse a thumbnail or duration from a replaced video.
        updates.thumbUrl = ''; updates.thumbnailStoragePath = ''; updates.thumbnailSeconds = 0; updates.durationSeconds = 0;
      }
      Object.assign(updates, await this.uploadThumbnail(this.editingVideo.id!, updates.storagePath || this.editingVideo.storagePath || this.editingVideo.url));
      await docRef.update(updates as any);

      if (oldStoragePathToDelete && oldStoragePathToDelete !== updates.storagePath) {
        await this.deleteStorageFile(oldStoragePathToDelete);
      }

      this.showEditVideoModal = false;
      this.resetEditVideoForm();
      document.body.style.overflow = '';
    } catch (error) {
      console.error('Could not update GSL news video', error);
      this.editVideoError = 'Could not update this video. Please try again.';
    } finally {
      progressSub?.unsubscribe();
      this.isUpdatingVideo = false;
      this.replaceUploadProgress = null;
    }
  }

  async deleteVideo(video: Video) {
    if (!this.canManageVideo(video) || !video.id || this.isDeletingVideo) return;
    const confirmed = window.confirm(`Delete "${video.title}" from Global Solutions Lab News?`);
    if (!confirmed) return;

    this.isDeletingVideo = true;
    try {
      await this.afs.collection(this.newsCollection).doc(video.id).delete();
      if (this.isDefaultVideo(video)) {
        await this.afs.doc<NewsVideoSettings>(this.newsSettingsDocument).set(
          {
            defaultVideoId: '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: this.auth.currentUser?.uid || '',
          },
          { merge: true }
        );
      }
      if (video.storagePath) {
        await this.deleteStorageFile(video.storagePath);
      }
      if (this.mainVideo?.id === video.id) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { v: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
      if (this.editingVideo?.id === video.id) {
        this.showEditVideoModal = false;
        this.resetEditVideoForm();
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Could not delete GSL news video', error);
      alert('Could not delete this video. Please try again.');
    } finally {
      this.isDeletingVideo = false;
    }
  }

  onVideoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.resetThumbnails();
    this.selectedVideoFile = file;
    if (file) void this.generateThumbnails();
    this.addVideoError = '';
    this.uploadProgress = null;
    if (file && !this.videoForm.title.trim()) {
      this.videoForm.title = this.titleFromFileName(file.name);
    }
  }

  onReplacementVideoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.resetThumbnails();
    this.selectedReplacementVideoFile = file;
    if (file) void this.generateThumbnails();
    this.editVideoError = '';
    this.replaceUploadProgress = null;
    if (file && !this.editVideoForm.title.trim()) {
      this.editVideoForm.title = this.titleFromFileName(file.name);
    }
  }

  onSortChange() {
    this.refreshVideosFromSources();
  }

  onImageError(e: Event) {
    (e.target as HTMLImageElement).src = this.DEFAULT_THUMB;
  }

  trackById(_: number, v: Video) {
    return v.id || v.url;
  }

  onLoadedMeta() {
    this.autoPlayWithAudio();
  }

  unmuteAndPlay() {
    const v = this.heroVideo?.nativeElement;
    if (!v) return;
    v.muted = false;
    v.volume = 1.0;
    v.play().finally(() => (this.showUnmute = false));
  }

  getVideoThumb(video: Video): string {
    if (video.thumbUrl) return video.thumbUrl;
    if (video.youtubeId) return this.youtubeThumbUrl(video.youtubeId);
    return this.DEFAULT_THUMB;
  }

  getDisplayDate(video: Video): number | null {
    return video.createdAtMs || null;
  }

  canManageVideo(video: Video | null | undefined): boolean {
    return !!this.isAdmin && !!video?.id && video.source === 'admin';
  }

  private refreshVideosFromSources() {
    this.allVideos = this.sortVideos([
      ...this.adminVideos,
      ...this.curatedVideos.map((video) => this.normalizeVideo(video)),
    ]);

    const requestedId = (this.route.snapshot.queryParamMap.get('v') || '').trim();

    if (requestedId) {
      const requestedVideo = this.allVideos.find((video) => video.id === requestedId);
      if (requestedVideo) {
        this.clearRequestedVideoWaitTimer();
        this.isVideoCatalogLoading = false;
        this.requestedVideoUnavailable = false;
        this.setMainVideo(requestedVideo, false);
        return;
      }

      // A `v` link is an explicit selection. Never start a default video while
      // Firestore is still resolving that document; doing so causes the wrong
      // briefing to play before the requested upload arrives from the server.
      this.clearMainVideo();
      this.isVideoCatalogLoading = true;
      this.requestedVideoUnavailable = false;
      if (this.hasLoadedAdminVideos) {
        this.startRequestedVideoWaitTimer();
      }
      return;
    }

    this.clearRequestedVideoWaitTimer();
    this.requestedVideoUnavailable = false;
    if (!this.hasLoadedAdminVideos || !this.hasLoadedNewsSettings) {
      this.isVideoCatalogLoading = true;
      this.clearMainVideo();
      return;
    }

    const candidate =
      this.allVideos.find((video) => video.id === this.defaultVideoId) ||
      this.allVideos[0];
    this.isVideoCatalogLoading = false;
    if (candidate) {
      this.setMainVideo(candidate, false);
    } else {
      this.clearMainVideo();
    }
  }

  private sortVideos(videos: Video[]): Video[] {
    const clone = [...videos];
    if (this.sortBy === 'oldest') {
      return clone.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
    }
    if (this.sortBy === 'title') {
      return clone.sort((a, b) => a.title.localeCompare(b.title));
    }
    return clone.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }

  private setMainVideo(vid: Video, updateUrl: boolean) {
    const mainVideo = this.normalizeVideo(vid);
    this.mainVideo = mainVideo;
    this.safeHeroEmbedUrl = mainVideo.youtubeId
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube.com/embed/${mainVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`
        )
      : null;
    this.previousVideos = this.allVideos.filter((v) => v.id !== mainVideo.id);

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { v: mainVideo.id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => this.autoPlayWithAudio(), 0);
  }

  private clearMainVideo() {
    const videoElement = this.heroVideo?.nativeElement;
    videoElement?.pause();
    this.mainVideo = null;
    this.safeHeroEmbedUrl = null;
    this.previousVideos = [...this.allVideos];
    this.showUnmute = false;
  }

  private startRequestedVideoWaitTimer() {
    if (this.requestedVideoWaitTimer) return;
    this.requestedVideoWaitTimer = setTimeout(() => {
      this.requestedVideoWaitTimer = undefined;
      if (!this.mainVideo && this.route.snapshot.queryParamMap.get('v')) {
        this.isVideoCatalogLoading = false;
        this.requestedVideoUnavailable = true;
      }
    }, 8000);
  }

  private clearRequestedVideoWaitTimer() {
    if (!this.requestedVideoWaitTimer) return;
    clearTimeout(this.requestedVideoWaitTimer);
    this.requestedVideoWaitTimer = undefined;
  }

  private normalizeVideo(video: Video): Video {
    const youtubeId = video.youtubeId || this.extractYouTubeId(video.url);
    return {
      ...video,
      id: video.id || this.slugify(video.title),
      speaker: (video.speaker || '').trim(),
      thumbUrl: video.thumbUrl || (youtubeId ? this.youtubeThumbUrl(youtubeId) : ''),
      source: video.source || 'admin',
      createdAtMs: this.normalizeCreatedAtMs(video),
      youtubeId,
    };
  }

  private normalizeCreatedAtMs(video: Video): number {
    if (typeof video.createdAtMs === 'number') return video.createdAtMs;
    if (video.createdAt?.toMillis) return video.createdAt.toMillis();
    return Date.now();
  }

  private extractYouTubeId(url: string): string | null {
    const match = String(url || '').match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    return match?.[1] || null;
  }

  private youtubeThumbUrl(id: string): string {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || `video-${Date.now()}`
    );
  }

  private resetVideoForm() {
    this.resetThumbnails();
    this.videoForm = {
      title: '',
      speaker: '',
      tagline: '',
    };
    this.selectedVideoFile = null;
    this.uploadProgress = null;
    this.addVideoError = '';
  }

  private resetEditVideoForm() {
    this.resetThumbnails();
    this.editVideoForm = {
      title: '',
      speaker: '',
      tagline: '',
    };
    this.editingVideo = null;
    this.selectedReplacementVideoFile = null;
    this.replaceUploadProgress = null;
    this.editVideoError = '';
  }

  private titleFromFileName(fileName: string): string {
    return fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private safeFileName(fileName: string): string {
    const cleaned = fileName
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    return cleaned || `video-${Date.now()}.mp4`;
  }

  private async deleteStorageFile(storagePath: string) {
    try {
      await lastValueFrom(this.storage.ref(storagePath).delete());
    } catch (error) {
      console.warn('Could not delete stored GSL news video file', error);
    }
  }

  private async autoPlayWithAudio() {
    if (this.isHeroYouTube) {
      this.showUnmute = false;
      return;
    }

    const v = this.heroVideo?.nativeElement;
    if (!v) return;

    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;

    try {
      await v.play();
    } catch {
      /* browser may block autoplay */
    }

    v.muted = false;
    v.volume = 1.0;
    try {
      await v.play();
      this.showUnmute = false;
    } catch {
      this.showUnmute = true;
      const unlock = () => this.unmuteAndPlay();
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }
}
