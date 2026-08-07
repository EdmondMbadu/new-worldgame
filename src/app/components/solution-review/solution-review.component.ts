import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import {
  SolutionModerationQueueItem,
  SolutionModerationStatus,
} from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import {
  SolutionModerationPolicy,
  SolutionModerationService,
} from 'src/app/services/solution-moderation.service';

interface StatusTab {
  value: 'all' | SolutionModerationStatus;
  label: string;
}

@Component({
  selector: 'app-solution-review',
  templateUrl: './solution-review.component.html',
  styleUrl: './solution-review.component.css',
  standalone: false,
})
export class SolutionReviewComponent implements OnInit, OnDestroy {
  readonly tabs: StatusTab[] = [
    { value: 'needs_review', label: 'Needs review' },
    { value: 'blocked', label: 'Hidden' },
    { value: 'error', label: 'Errors' },
    { value: 'pending', label: 'Pending' },
    { value: 'scanning', label: 'Scanning' },
    { value: 'approved', label: 'Approved' },
    { value: 'all', label: 'All recent' },
  ];
  readonly categories = [
    ['sexual_minors', 'Sexual content involving minors'],
    ['explicit_sexual', 'Explicit sexual content'],
    ['graphic_violence', 'Graphic violence'],
    ['violence_promotion', 'Promotion of violence'],
    ['credible_threat', 'Credible threats'],
    ['extremism', 'Extremism'],
    ['hate', 'Hate or dehumanization'],
    ['self_harm', 'Self-harm encouragement'],
    ['criminal_instructions', 'Criminal instructions'],
    ['privacy_exposure', 'Private information exposure'],
    ['scam_or_fraud', 'Scams or fraud'],
    ['political_persuasion', 'Partisan political persuasion'],
  ] as const;
  readonly lockedCategories = new Set([
    'sexual_minors',
    'explicit_sexual',
    'credible_threat',
  ]);

  queue: SolutionModerationQueueItem[] = [];
  activeStatus: 'all' | SolutionModerationStatus = 'needs_review';
  searchTerm = '';
  loading = true;
  policyLoading = true;
  policySaving = false;
  policy: SolutionModerationPolicy | null = null;
  message = '';
  errorMessage = '';
  backfillCursor = '';
  backfillHasMore = true;
  backfillRunning = false;
  backfillProcessed = 0;
  readonly revealedImages = new Set<string>();
  readonly busySolutions = new Set<string>();
  readonly notes: Record<string, string> = {};
  private queueSub?: Subscription;

  constructor(
    public auth: AuthService,
    private moderation: SolutionModerationService
  ) {}

  ngOnInit(): void {
    this.queueSub = this.moderation.watchRecentQueue().subscribe({
      next: (items) => {
        this.queue = items;
        this.loading = false;
      },
      error: (error) => {
        console.error('Unable to load Safety Review queue', error);
        this.errorMessage = 'Unable to load the review queue.';
        this.loading = false;
      },
    });
    void this.loadPolicy();
  }

  ngOnDestroy(): void {
    this.queueSub?.unsubscribe();
  }

  get filteredQueue(): SolutionModerationQueueItem[] {
    const query = this.searchTerm.trim().toLowerCase();
    return this.queue.filter((item) => {
      const statusMatches =
        this.activeStatus === 'all' || item.status === this.activeStatus;
      if (!statusMatches) return false;
      if (!query) return true;
      return [
        item.title,
        item.authorName,
        item.solutionId,
        item.summary,
        ...(item.reasonCodes || []),
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }

  countFor(status: 'all' | SolutionModerationStatus): number {
    return status === 'all'
      ? this.queue.length
      : this.queue.filter((item) => item.status === status).length;
  }

  setStatus(status: 'all' | SolutionModerationStatus): void {
    this.activeStatus = status;
  }

  statusLabel(status: SolutionModerationStatus): string {
    return this.moderation.labelForStatus(status);
  }

  statusClass(status: SolutionModerationStatus): string {
    return `status-${status.replace('_', '-')}`;
  }

  riskLabel(value: string): string {
    return value.replace(/_/g, ' ');
  }

  riskPercent(value: number): number {
    return Math.round(Math.min(1, Math.max(0, Number(value) || 0)) * 100);
  }

  updatedLabel(value: number): string {
    if (!value) return 'Not yet';
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }

  toggleImage(solutionId: string): void {
    if (this.revealedImages.has(solutionId)) {
      this.revealedImages.delete(solutionId);
    } else {
      this.revealedImages.add(solutionId);
    }
  }

  isImageRevealed(solutionId: string): boolean {
    return this.revealedImages.has(solutionId);
  }

  async takeAction(
    item: SolutionModerationQueueItem,
    action: 'approve' | 'keep_hidden' | 'rescan'
  ): Promise<void> {
    if (!item.contentHash || this.busySolutions.has(item.solutionId)) return;
    this.clearMessages();
    this.busySolutions.add(item.solutionId);
    try {
      await this.moderation.review(
        item.solutionId,
        item.contentHash,
        action,
        this.notes[item.solutionId] || ''
      );
      const actionLabel =
        action === 'approve'
          ? 'approved for public display'
          : action === 'keep_hidden'
          ? 'kept hidden'
          : 'queued for a new scan';
      this.message = `${item.title} was ${actionLabel}.`;
      this.notes[item.solutionId] = '';
    } catch (error: any) {
      console.error('Safety Review action failed', error);
      this.errorMessage =
        error?.message || 'The review decision could not be saved.';
    } finally {
      this.busySolutions.delete(item.solutionId);
    }
  }

  async loadPolicy(): Promise<void> {
    this.policyLoading = true;
    try {
      this.policy = await this.moderation.getPolicy();
    } catch (error) {
      console.error('Unable to load moderation policy', error);
      this.errorMessage = 'Unable to load the safety policy.';
    } finally {
      this.policyLoading = false;
    }
  }

  async savePolicy(): Promise<void> {
    if (!this.policy || this.policySaving) return;
    this.clearMessages();
    this.policySaving = true;
    try {
      this.policy = await this.moderation.updatePolicy(this.policy);
      this.message =
        'Safety policy saved. New and re-scanned versions will use it.';
    } catch (error: any) {
      console.error('Unable to save moderation policy', error);
      this.errorMessage = error?.message || 'Unable to save the safety policy.';
    } finally {
      this.policySaving = false;
    }
  }

  async scanNextLegacyBatch(): Promise<void> {
    if (this.backfillRunning || !this.backfillHasMore) return;
    this.clearMessages();
    this.backfillRunning = true;
    try {
      const result = await this.moderation.backfill(this.backfillCursor);
      this.backfillCursor = result.cursor;
      this.backfillHasMore = result.hasMore;
      this.backfillProcessed += result.processed;
      this.message = result.processed
        ? `${result.processed} existing solutions were queued. ${
            result.hasMore ? 'Continue with the next batch.' : 'Backfill complete.'
          }`
        : 'No additional existing solutions need to be queued.';
    } catch (error: any) {
      console.error('Unable to queue legacy moderation', error);
      this.errorMessage = error?.message || 'Unable to queue the next batch.';
    } finally {
      this.backfillRunning = false;
    }
  }

  trackBySolutionId(_index: number, item: SolutionModerationQueueItem): string {
    return item.solutionId;
  }

  private clearMessages(): void {
    this.message = '';
    this.errorMessage = '';
  }
}
