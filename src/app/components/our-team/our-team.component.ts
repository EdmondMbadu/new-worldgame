import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-our-team',
  templateUrl: './our-team.component.html',
  styleUrl: './our-team.component.css',
})
export class OurTeamComponent implements OnInit {
  constructor(public auth: AuthService) {}
  ourTeam: Team[] = [
    {
      name: 'Medard Gabel',
      title: 'Director of EarthGame, NewWorld Game Designer',
      description:
        'Medard is the executive director of the non-profit research and development organization EarthGame. He also leads BigPictureSmallWorld and the Global Solutions Lab. He is the former executive director of the World Game Institute and director of The Cornucopia Project and the Regeneration Project at Rodale Press. ',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/avatar%2FNG73q08IBlW39QiC3CzwTGe6zVo2-medard-jpeg.jpeg?alt=media&token=111999e5-6382-4868-b6df-0db2d06ba419',
    },
    {
      name: 'Jim Walker',
      title: 'Head of AI, NewWorld Game Designer',
      description:
        'Jim, the Head of AI at EarthGame, oversees all AI developments and is one the creative minds behind the NewWorld Game.',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/others%2Fjim.png?alt=media&token=e576589f-8879-48ad-be93-4c9ce1d1b677',
    },
    {
      name: 'Edmond Mbadu',
      title: 'Lead Developer, NewWorld Game Designer',
      description:
        'Edmond is  the lead software developer who focuses on building scalable solutions, supporting the team, and delivering reliable software systems.',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/avatar%2Flhf54MEukyMpSfk18xVBpWs1FCH3-ed-avatar.png?alt=media&token=cdfaa91c-5e77-4a3c-a49c-8d7b8a2f5a7d',
    },
    {
      name: 'Rain White',
      title: 'UI/UX Designer, Software Developer',
      description:
        'Rain is the UI/UX designer and software developer who works on creating user-friendly designs and building functional, reliable software solutions.',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/team%2Frain-white.jpg?alt=media&token=4534a5d1-3bbc-4727-99ea-edff28e6321b',
    },
  ];
  ngOnInit(): void {
    window.scroll(0, 0);
  }
}
interface Team {
  name?: string;
  title?: string;
  description?: string;
  profilePicPath?: string;
  twitter?: string;
  github?: string;
}
