import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';

interface AvatarIntroVideo {
  id?: string;
  title: string;
  url: string;
}

@Component({
    selector: 'app-our-team',
    templateUrl: './our-team.component.html',
    styleUrl: './our-team.component.css',
    standalone: false
})
export class OurTeamComponent implements OnInit, OnDestroy {
  @ViewChild('teamIntroVideoPlayer')
  private introVideoPlayer?: ElementRef<HTMLVideoElement>;

  isLoggedIn: boolean = false;
  introVideos: Record<string, AvatarIntroVideo> = {};
  selectedAi: Team | null = null;
  selectedIntroVideo: AvatarIntroVideo | null = null;
  showIntroVideoModal = false;
  private introVideosSub?: Subscription;

  constructor(
    public auth: AuthService,
    private readonly afs: AngularFirestore,
    private readonly cdRef: ChangeDetectorRef
  ) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }

  ourTeam: Team[] = [
    {
      name: 'Medard Gabel',
      titleKey: 'ourTeamPage.human.members.medard.title',
      descriptionKey: 'ourTeamPage.human.members.medard.description',
      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/avatar%2FNG73q08IBlW39QiC3CzwTGe6zVo2-medard-jpeg.jpeg?alt=media&token=111999e5-6382-4868-b6df-0db2d06ba419',
      profileUrl: 'https://www.bigpicturesmallworld.com/medard-gabel.shtml',
    },
    {
      name: 'Jim Walker',
      titleKey: 'ourTeamPage.human.members.jim.title',
      descriptionKey: 'ourTeamPage.human.members.jim.description',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/others%2Fjim.png?alt=media&token=e576589f-8879-48ad-be93-4c9ce1d1b677',
    },
    {
      name: 'Edmond Mbadu',
      titleKey: 'ourTeamPage.human.members.edmond.title',
      descriptionKey: 'ourTeamPage.human.members.edmond.description',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/avatar%2Flhf54MEukyMpSfk18xVBpWs1FCH3-ed-avatar.png?alt=media&token=cdfaa91c-5e77-4a3c-a49c-8d7b8a2f5a7d',
    },
    {
      name: 'Rain White',
      titleKey: 'ourTeamPage.human.members.rain.title',
      descriptionKey: 'ourTeamPage.human.members.rain.description',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/team%2Frain-white.jpg?alt=media&token=4534a5d1-3bbc-4727-99ea-edff28e6321b',
    },
    {
      name: 'Baruch Bashan',
      titleKey: 'ourTeamPage.human.members.baruch.title',
      descriptionKey: 'ourTeamPage.human.members.baruch.description',
      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/team%2FBaruch.png?alt=media&token=cdced396-f1be-4e93-9be6-bc1a98923a87',
      fit: 'contain', // 👈 only this card shows the full image (no crop)
    },
  ];

  aiOptions: Team[] = [
    {
      profilePicPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      descriptionKey: 'ourTeamPage.ai.members.zara.description',
      // collectionPath: `users/${this.auth.currentUser.uid}/zara/`,
    },
    {
      profilePicPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      descriptionKey: 'ourTeamPage.ai.members.arjun.description',
    },
    {
      profilePicPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      descriptionKey: 'ourTeamPage.ai.members.sofia.description',
    },
    {
      profilePicPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      descriptionKey: 'ourTeamPage.ai.members.li.description',
    },
    {
      profilePicPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      descriptionKey: 'ourTeamPage.ai.members.amina.description',
    },
    {
      profilePicPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      descriptionKey: 'ourTeamPage.ai.members.elena.description',
    },
    {
      profilePicPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      descriptionKey: 'ourTeamPage.ai.members.tane.description',
    },
  ];
  ngOnInit(): void {
    window.scroll(0, 0);
    this.introVideosSub = this.afs
      .collection<AvatarIntroVideo>('avatar_intro_videos')
      .valueChanges({ idField: 'id' })
      .subscribe((videos) => {
        this.introVideos = videos.reduce<Record<string, AvatarIntroVideo>>(
          (result, video) => {
            if (video.id) result[video.id] = video;
            return result;
          },
          {}
        );
      });
  }

  ngOnDestroy(): void {
    this.introVideosSub?.unsubscribe();
    document.body.style.overflow = '';
  }

  hasIntroVideo(team: Team): boolean {
    return Boolean(this.introVideos[this.slugify(team.name)]);
  }

  openIntroVideo(team: Team): void {
    const video = this.introVideos[this.slugify(team.name)];
    if (!video) return;

    this.selectedAi = team;
    this.selectedIntroVideo = video;
    this.showIntroVideoModal = true;
    document.body.style.overflow = 'hidden';

    this.cdRef.detectChanges();
    const player = this.introVideoPlayer?.nativeElement;
    if (player) {
      player.currentTime = 0;
      void player.play().catch(() => {
        // Native controls remain available if autoplay is blocked.
      });
    }
  }

  closeIntroVideo(): void {
    this.introVideoPlayer?.nativeElement.pause();
    this.showIntroVideoModal = false;
    this.selectedAi = null;
    this.selectedIntroVideo = null;
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape')
  closeIntroVideoOnEscape(): void {
    if (this.showIntroVideoModal) this.closeIntroVideo();
  }

  private slugify(name?: string): string {
    return (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
interface Team {
  name?: string;
  title?: string;
  description?: string;
  titleKey?: string;
  descriptionKey?: string;
  profilePicPath?: string;
  twitter?: string;
  github?: string;
  fit?: 'contain' | 'cover'; // 👈 optional per-item override
  profileUrl?: string;
}
