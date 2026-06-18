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
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

interface Video {
  id?: string;
  title: string;
  url: string;
  speaker?: string;
  thumbUrl?: string;
  tagline?: string;
  source?: 'curated' | 'admin';
  createdAtMs?: number;
  createdAt?: any;
  createdBy?: string;
  youtubeId?: string | null;
}

type VideoSort = 'latest' | 'oldest' | 'title';

@Component({
  selector: 'app-nwg-news',
  templateUrl: './nwg-news.component.html',
  styleUrl: './nwg-news.component.css',
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
  isSavingVideo = false;
  addVideoError = '';
  sortBy: VideoSort = 'latest';

  mainVideo!: Video;
  previousVideos: Video[] = [];
  allVideos: Video[] = [];
  safeHeroEmbedUrl: SafeResourceUrl | null = null;

  videoForm = {
    title: '',
    url: '',
    speaker: '',
    thumbUrl: '',
    tagline: '',
  };

  private readonly newsCollection = 'nwgNewsVideos';
  private readonly curatedVideos: Video[] = [
    {
      id: 'tane-kahu',
      title: `NewWorld Game: Changing the World`,
      url: 'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FIB%20Flyer-%20Tane%20Kahu.mp4?alt=media&token=438a21d0-82a9-4043-ad20-0b004d895101',
      speaker: 'Tane Kahu',
      thumbUrl: '../../../assets/img/tane-agent.png',
      tagline: 'NewWorld Game AI colleague Tane Kahu',
      source: 'curated',
      createdAtMs: Date.UTC(2026, 5, 1, 9, 0),
    },
    {
      id: 'sofia-change',
      title: `NewWorld Game Changemakers Tournament 2025-26`,
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
      title: 'NewWorld Game News',
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
  private routeSub?: Subscription;

  constructor(
    public auth: AuthService,
    private afs: AngularFirestore,
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
      .subscribe((videos) => {
        this.adminVideos = videos.map((video) => this.normalizeVideo(video));
        this.refreshVideosFromSources();
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
    this.authSub?.unsubscribe();
    this.newsSub?.unsubscribe();
    this.routeSub?.unsubscribe();
  }

  selectVideo(vid: Video) {
    this.setMainVideo(vid, true);
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

  async addVideo() {
    if (!this.isAdmin || this.isSavingVideo) return;
    this.addVideoError = '';

    const title = this.videoForm.title.trim();
    const url = this.videoForm.url.trim();
    if (!title || !url) {
      this.addVideoError = 'Add a title and video URL.';
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      this.addVideoError = 'Use a full https:// video URL.';
      return;
    }

    this.isSavingVideo = true;
    const docRef = this.afs.collection(this.newsCollection).doc();
    const now = Date.now();
    const youtubeId = this.extractYouTubeId(url);
    const thumbUrl =
      this.videoForm.thumbUrl.trim() ||
      (youtubeId ? this.youtubeThumbUrl(youtubeId) : '');

    try {
      await docRef.set({
        title,
        url,
        speaker: this.videoForm.speaker.trim(),
        thumbUrl,
        tagline: this.videoForm.tagline.trim(),
        source: 'admin',
        youtubeId,
        createdAtMs: now,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: this.auth.currentUser?.uid || '',
      });
      this.showAddVideoModal = false;
      this.resetVideoForm();
      document.body.style.overflow = '';
    } catch (error) {
      console.error('Could not add NWG news video', error);
      this.addVideoError = 'Could not add this video. Please try again.';
    } finally {
      this.isSavingVideo = false;
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

  private refreshVideosFromSources() {
    this.allVideos = this.sortVideos([
      ...this.adminVideos,
      ...this.curatedVideos.map((video) => this.normalizeVideo(video)),
    ]);

    if (!this.allVideos.length) return;

    const requestedId = this.route.snapshot.queryParamMap.get('v');
    const currentId = this.mainVideo?.id;
    const candidate =
      this.allVideos.find((v) => v.id === requestedId) ||
      this.allVideos.find((v) => v.id === currentId) ||
      this.allVideos[0];

    this.setMainVideo(candidate, false);
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
    this.mainVideo = this.normalizeVideo(vid);
    this.safeHeroEmbedUrl = this.mainVideo.youtubeId
      ? this.sanitizer.bypassSecurityTrustResourceUrl(
          `https://www.youtube.com/embed/${this.mainVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`
        )
      : null;
    this.previousVideos = this.allVideos.filter((v) => v.id !== this.mainVideo.id);

    if (updateUrl) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { v: this.mainVideo.id },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => this.autoPlayWithAudio(), 0);
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
    this.videoForm = {
      title: '',
      url: '',
      speaker: '',
      thumbUrl: '',
      tagline: '',
    };
    this.addVideoError = '';
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
