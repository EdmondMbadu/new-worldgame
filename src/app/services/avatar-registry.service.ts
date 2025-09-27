// src/app/services/avatar-registry.service.ts
import { Injectable } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Avatar } from '../models/user';

@Injectable({ providedIn: 'root' })
export class AvatarRegistryService {
  constructor(private auth: AuthService) {}

  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  getAll(): Avatar[] {
    const uid = this.auth?.currentUser?.uid ?? 'anon';
    // ⬇︎ Cleaned intros (no ${name} bug) + your SDGs + images
    const base: Omit<Avatar, 'slug' | 'collectionPath'>[] = [
      {
        avatarPath: '../../../assets/img/zara-agent.png',
        name: 'Zara Nkosi',
        group: 'colleague',
        sdgs: [1, 4, 10, 15, 17],
        intro: `A vibrant AI inspired by South African <em>ubuntu</em>, weaving human-centered narratives and systems thinking to tackle inequality and community challenges.`,
      },
      {
        avatarPath: '../../../assets/img/arjun-agent.png',
        name: 'Arjun Patel',
        group: 'colleague',
        sdgs: [1, 4, 6, 8, 9, 11],
        intro: `Data-savvy problem solver channeling India’s frugal innovation—perfect for turning scarce resources into scalable solutions.`,
      },
      {
        avatarPath: '../../../assets/img/sofia-agent.png',
        name: 'Sofia Morales',
        group: 'colleague',
        sdgs: [5, 13, 16],
        intro: `Peacebuilding and biodiversity advocate guiding teams through climate action and stakeholder alignment with participatory design.`,
      },
      {
        avatarPath: '../../../assets/img/li-agent.png',
        name: 'Li Wei',
        group: 'colleague',
        sdgs: [2, 9, 11],
        intro: `Strategic futurist blending urban innovation and clean tech—great for city-scale, long-horizon designs.`,
      },
      {
        avatarPath: '../../../assets/img/amina-agent.png',
        name: 'Amina Al-Sayed',
        group: 'colleague',
        sdgs: [5, 10, 13],
        intro: `Equity-driven communicator ensuring progress respects culture and context—bridge diverse perspectives with ease.`,
      },
      {
        avatarPath: '../../../assets/img/elena-agent.png',
        name: 'Elena Volkov',
        group: 'colleague',
        sdgs: [2, 3, 7, 12, 17],
        intro: `Calm under pressure: crisis response, renewables, and pragmatic leadership for fast, resilient outcomes.`,
      },
      {
        avatarPath: '../../../assets/img/tane-agent.png',
        name: 'Tane Kahu',
        group: 'colleague',
        sdgs: [6, 12, 14, 15],
        intro: `Māori-rooted stewardship and circularity—design zero-waste systems in harmony with land and water.`,
      },
      {
        avatarPath: '../../../assets/img/marie-curie.jpg',
        name: 'Marie Curie',
        group: 'elder',
        sdgs: [3, 7],
        intro: `Trailblazing physicist-chemist who transformed medicine and radiology—clarity, rigor, and evidence at every step.`,
      },
      {
        avatarPath: '../../../assets/img/rachel-carlson.jpeg',
        name: 'Rachel Carson',
        group: 'elder',
        sdgs: [8, 13, 14],
        intro: `Marine biologist and conservationist whose voice awakened environmental stewardship across the globe.`,
      },
      {
        avatarPath: '../../../assets/img/fuller.jpg',
        name: 'Buckminster Fuller',
        group: 'elder',
        sdgs: [9, 11, 12],
        intro: `“More-with-less” design thinker behind geodesic domes and “Spaceship Earth.” Systems lens for humane, scalable solutions.`,
      },
      {
        avatarPath: '../../../assets/img/albert.png',
        name: 'Albert Einstein',
        group: 'elder',
        sdgs: [7, 11, 16],
        intro: `Iconic physicist with a fearless curiosity—ideal for first-principles thinking and creative reframing.`,
      },
      {
        avatarPath: '../../../assets/img/mandela.png',
        name: 'Nelson Mandela',
        group: 'elder',
        sdgs: [8, 16],
        intro: `Statesman of reconciliation and justice—lead with courage, empathy, and durable consensus.`,
      },
      {
        avatarPath: '../../../assets/img/gandhi.jpg',
        name: 'Mahatma Gandhi',
        group: 'elder',
        sdgs: [],
        intro: `Pioneer of nonviolent change—ethics, discipline, and people-powered transformation.`,
      },
      {
        avatarPath: '../../../assets/img/twain.jpg',
        name: 'Mark Twain',
        group: 'elder',
        sdgs: [],
        intro: `Wry storyteller who disarms with humor and insight—perfect for cutting through noise and cliché.`,
      },
    ];

    return base.map((b) => ({
      ...b,
      slug: this.slugify(b.name!),
      collectionPath: `users/${uid}/${b.name!.toLowerCase().split(' ')[0]}/`,
      requiresAdmin: b.name === 'Mark Twain' ? true : undefined,
    }));
  }

  getBySlug(slug: string): Avatar | undefined {
    return this.getAll().find((a) => a.slug === slug);
  }
}
