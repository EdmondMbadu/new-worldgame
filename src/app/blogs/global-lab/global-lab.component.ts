import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-global-lab',
  templateUrl: './global-lab.component.html',
  styleUrl: './global-lab.component.css',
})
export class GlobalLabComponent implements OnInit {
  ngOnInit(): void {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }

  videoPlaying = false;
  reachOutVisa: string = 'info@1earthgame.org';

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
}

interface Team {
  name?: string;
  title?: string;
  description?: string;
  profilePicPath?: string;
  twitter?: string;
  github?: string;
}
