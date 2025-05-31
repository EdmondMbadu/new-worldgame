import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

interface AiOption {
  avatarPath: string;
  name: string;
  intro: string;
  videoUrl: string;
}

interface StepBlock {
  title: string;
  ai: AiOption;
}

@Component({
  selector: 'app-nwg-steps',
  templateUrl: './nwg-steps.component.html',
  styleUrl: './nwg-steps.component.css',
})
export class NwgStepsComponent implements OnInit {
  isLoggedIn = false;

  /** ▼ 1-to-5 steps */
  readonly steps: string[] = [
    'Step I: Defining the Problem State',
    'Step II: Envisioning the Preferred State',
    'Step III: Developing Our Solution',
    'Step IV: Implementation',
    'Step V: Strategy Review',
  ];

  /** ▼ videos + avatars (only first five used)  */
  readonly aiOptions: AiOption[] = [
    {
      avatarPath: '../../../assets/img/sofia-agent.png',
      name: 'Sofia Morales',
      intro: `I’m Sofia, shaped by Colombia’s peacebuilding efforts…`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-1.mp4?alt=media&token=caa04230-9e04-403d-b08b-2c5a7090dc98',
    },
    {
      avatarPath: '../../../assets/img/arjun-agent.png',
      name: 'Arjun Patel',
      intro: `I’m Arjun, thriving on jugaad—frugal innovation…`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step2.mp4?alt=media&token=359333b0-dbb9-4fbb-b675-c58365f637de',
    },
    {
      avatarPath: '../../../assets/img/elena-agent.png',
      name: 'Elena Volkov',
      intro: `I’m Elena, forged in Ukraine’s resilience; I excel in crisis management…`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-3.mp4?alt=media&token=f5046a0f-e5dc-4da9-8a0b-9cb473e56a67',
    },
    {
      avatarPath: '../../../assets/img/tane-agent.png',
      name: 'Tane Kahu',
      intro: `I’m Tane, grounded in Māori knowledge and ecosystem care…`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-4.mp4?alt=media&token=4c8d9c1f-efcf-430a-a99a-6c0329ef29c9',
    },
    {
      avatarPath: '../../../assets/img/li-agent.png',
      name: 'Li Wei',
      intro: `I’m Li Wei, specialising in urban planning and tech integration…`,
      videoUrl:
        'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/videos%2FNWG-Step-5.mp4?alt=media&token=fb9edabb-7e55-4f54-a8e9-110b24248005',
    },
  ];

  /** combined data → used in template */
  readonly stepBlocks: StepBlock[] = this.steps.map((title, i) => ({
    title,
    ai: this.aiOptions[i],
  }));

  constructor(public auth: AuthService, private route: ActivatedRoute) {
    // navbar login state
    this.auth
      .getCurrentUserPromise()
      .then((user) => (this.isLoggedIn = !!user));
  }

  ngOnInit(): void {
    window.scrollTo({ top: 0 });
    // optional deep-link:  ?step=3  → scroll to Step-3
    const stepParam = this.route.snapshot.queryParamMap.get('step');
    if (stepParam) {
      const target = document.getElementById(`step-${stepParam}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
