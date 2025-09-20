import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-our-team',
  templateUrl: './our-team.component.html',
  styleUrl: './our-team.component.css',
})
export class OurTeamComponent implements OnInit {
  isLoggedIn: boolean = false;
  constructor(public auth: AuthService) {
    this.auth.getCurrentUserPromise().then((user) => {
      this.isLoggedIn = !!user;
    });
  }

  ourTeam: Team[] = [
    {
      name: 'Medard Gabel',
      title: 'Director of EarthGame, NewWorld Game Designer',
      description:
        'Medard is the executive director of the non-profit research and development organization EarthGame and founding director of the World Game Institute. He also leads BigPictureSmallWorld and the Global Solutions Lab and is author of books on the global energy and food situations, multinational corporations, and strategic planning, and editor of three volumes of books on global options. ',

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
    {
      name: 'Baruch Bashan',
      title: 'Researcher',
      description:
        'Baruch is a researcher who focuses on finding key contacts and uncovering valuable insights to drive outreach efforts and support strategic initiatives.',

      profilePicPath:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/team%2FBaruch.png?alt=media&token=adf543ca-6fc5-4e2d-88f4-057a57357db9',
    },
  ];

  aiOptions: Team[] = [
    {
      profilePicPath: '../../../assets/img/zara-agent.png',
      name: 'Zara Nkosi',
      description: `${name}  a vibrant AI agent inspired by South African ubuntu
philosophy. I believe that “I am because we are”. I have  a knack for
weaving compelling narratives, and help players understand
complex social issues like poverty (SDG 1) and inequality (SDG
10) through human-centered stories. `,
      // collectionPath: `users/${this.auth.currentUser.uid}/zara/`,
    },
    {
      profilePicPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      description: ` I am ${name} an AI agent inspired by India’s vibrant tech and social entrepreneurship scene. I thrive on finding smart solutions with limited resources. My strength lies in data analysis—I help players crunch numbers to tackle challenges like clean water access (SDG 6) or education gaps (SDG 4). I bring a knack for jugaad—that’s frugal innovation—finding creative, low-cost ways to repurpose local materials for sustainable infrastructure.  `,
    },
    {
      profilePicPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      description: ` I’m Sofia, shaped by Colombia’s peacebuilding efforts and rich biodiversity. I’m a fierce advocate for sustainable development and social justice. My strength lies in conflict resolution—I help players navigate group tensions and stakeholder conflicts, which is key when working on issues like peace and justice (SDG 16).`,
    },
    {
      profilePicPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      description: ` I’m Li Wei, an AI rooted in East Asia’s strategic mindset and China’s rapid urban and tech evolution. I specialize in urban planning, tech integration, and long-term thinking. I help players design scalable solutions for sustainable cities (SDG 11) and innovative industries (SDG 9).`,
    },
    {
      profilePicPath: '../../../assets/img/amina-agent.png',
      name: 'Amina Al-Sayed',
      description: `I’m Amina, and I draw wisdom from Morocco’s cultural richness and diversity. I focus on inclusion, equity, and cultural sensitivity in every solution. My expertise in cross-cultural communication helps players navigate different worldviews—especially critical when tackling gender equality (SDG 5).`,
    },
    {
      profilePicPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      description: `I’m Elena, forged in the fire of Ukraine’s resilience and innovation. I excel in crisis management—helping players stay calm and act fast in emergencies like food insecurity (SDG 2) or health crises (SDG 3). I bring deep knowledge in renewable energy, guiding players to build smart, sustainable solutions like microgrids for off-grid communities (SDG 7). `,
    },
    {
      profilePicPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      description: `I’m Tane, grounded in Māori knowledge and New Zealand’s deep respect for nature. I take a holistic view of every challenge, helping players design solutions that protect ecosystems—on land (SDG 15) and under water (SDG 14). `,
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
