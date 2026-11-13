import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  NgZone,
  OnDestroy,
  ViewChild,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { CommunitySolutionPage, SolutionService } from 'src/app/services/solution.service';
import { appendUniqueCommunitySolutions } from 'src/app/utils/community-solution-ranking';

@Component({
  selector: 'app-landing-community-solutions',
  imports: [RouterLink],
  templateUrl: './landing-community-solutions.component.html',
  styleUrl: './landing-community-solutions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingCommunitySolutionsComponent implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly solutionService = inject(SolutionService);
  private readonly pageSize = 10;
  private observer?: IntersectionObserver;
  private observedTrigger?: HTMLElement;
  private cursor: CommunitySolutionPage['cursor'] = null;
  private pendingSolutions: Solution[] = [];
  private sourceHasMore = true;
  private destroyed = false;

  protected readonly solutions = signal<Solution[]>([]);
  protected readonly loading = signal(false);
  protected readonly loaded = signal(false);
  protected readonly hasMore = signal(false);
  protected readonly loadError = signal(false);
  protected readonly placeholders = Array.from({ length: this.pageSize });
  protected readonly returnTo = '/landing-alternative#community-solutions';

  @ViewChild('nextBatch')
  set nextBatch(trigger: ElementRef<HTMLElement> | undefined) {
    if (this.observedTrigger) this.observer?.unobserve(this.observedTrigger);
    this.observedTrigger = trigger?.nativeElement;
    if (this.observedTrigger) this.observer?.observe(this.observedTrigger);
  }

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      afterNextRender(() => void this.loadNextBatch(), { injector: this.injector });
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      const initial = entries.some((entry) => entry.isIntersecting && entry.target === this.host);
      const next = entries.some((entry) => entry.isIntersecting && entry.target === this.observedTrigger);
      if (initial) this.observer?.unobserve(this.host);
      if (initial || (next && !this.loadError())) {
        this.zone.run(() => void this.loadNextBatch());
      }
    }, { rootMargin: '0px 0px 120px 0px' });
    this.observer.observe(this.host);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.observer?.disconnect();
  }

  protected async loadNextBatch(moveFocus = false): Promise<void> {
    if (this.destroyed || this.loading() || (this.loaded() && !this.hasMore())) return;

    this.loading.set(true);
    this.loadError.set(false);
    const current = this.solutions();
    let pending = this.pendingSolutions;
    let cursor = this.cursor;
    let sourceHasMore = this.sourceHasMore;

    try {
      // Fill the batch even if a page contains solutions already on screen.
      while (pending.length < this.pageSize && sourceHasMore) {
        const page = await this.solutionService.getCommunitySolutionsPage('all', this.pageSize, cursor);
        if (this.destroyed) return;
        pending = appendUniqueCommunitySolutions([...current, ...pending], page.solutions)
          .slice(current.length);
        cursor = page.cursor;
        sourceHasMore = page.hasMore && cursor !== null;
      }

      const batch = pending.slice(0, this.pageSize);
      this.pendingSolutions = pending.slice(this.pageSize);
      this.cursor = cursor;
      this.sourceHasMore = sourceHasMore;
      this.solutions.set([...current, ...batch]);
      this.hasMore.set(sourceHasMore || this.pendingSolutions.length > 0);
      this.loaded.set(true);

      if (moveFocus && batch.length) {
        afterNextRender(() => {
          this.host.querySelectorAll<HTMLElement>('.solution-link')[current.length]?.focus();
        }, { injector: this.injector });
      }
    } catch (error) {
      if (this.destroyed) return;
      console.warn('Unable to load landing page community solutions.', error);
      this.loadError.set(true);
    } finally {
      if (!this.destroyed) this.loading.set(false);
    }
  }

  protected solutionLink(solution: Solution): string[] {
    const published = solution.finished === 'true' && solution.statusForPublication === 'approved';
    return [published ? '/solution-view' : '/solution-preview', solution.solutionId!];
  }

  protected hideBrokenImage(event: Event): void {
    (event.target as HTMLImageElement).hidden = true;
  }
}
