import { Component, OnDestroy, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import { AIOption, DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-landing-test',
  templateUrl: './landing-test.component.html',
  styleUrls: ['./landing-test.component.css'],
})
export class LandingTestComponent implements OnInit, OnDestroy {
  playersCount = 0;
  teamsCount = 0;
  solutionsCount = 0;
  aiOptions: AIOption[] = [];
  private rafId?: number;

  constructor(private data: DataService, private router: Router) {}
  ngOnInit(): void {
    // Animate counters to friendly demo targets.
    this.animateCount('playersCount', 1280, 900);
    this.animateCount('teamsCount', 86, 700);
    this.animateCount('solutionsCount', 312, 650);
    this.aiOptions = this.data.aiOptions;
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
  private slugify(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  openAvatar(ai: any) {
    const slug = this.slugify(ai.name);
    this.router.navigate(['/avatar', slug], { state: { avatar: ai } });
  }

  private animateCount(
    prop: 'playersCount' | 'teamsCount' | 'solutionsCount',
    target: number,
    duration = 800
  ) {
    const start = performance.now();
    const initial = (this as any)[prop] as number;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      (this as any)[prop] = Math.round(initial + (target - initial) * eased);
      if (p < 1) this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }
}
