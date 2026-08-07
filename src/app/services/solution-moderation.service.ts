import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom, Observable } from 'rxjs';

import {
  SolutionModerationQueueItem,
  SolutionModerationStatus,
} from '../models/solution';

export type PoliticalContentMode =
  | 'allow_neutral_review_partisan'
  | 'review_all'
  | 'block_partisan';

export interface SolutionModerationPolicy {
  version: string;
  reviewThreshold: number;
  autoBlockThreshold: number;
  politicalMode: PoliticalContentMode;
  enabledCategories: Record<string, boolean>;
}

export interface ModerationBackfillResult {
  processed: number;
  cursor: string;
  hasMore: boolean;
}

@Injectable({ providedIn: 'root' })
export class SolutionModerationService {
  constructor(
    private afs: AngularFirestore,
    private fns: AngularFireFunctions
  ) {}

  watchRecentQueue(limit = 250): Observable<SolutionModerationQueueItem[]> {
    return this.afs
      .collection<SolutionModerationQueueItem>(
        'solutionModerationQueue',
        (ref) => ref.orderBy('updatedAtMs', 'desc').limit(limit)
      )
      .valueChanges({ idField: 'solutionId' });
  }

  review(
    solutionId: string,
    contentHash: string,
    action: 'approve' | 'keep_hidden' | 'rescan',
    note = ''
  ): Promise<{ success: boolean; action: string }> {
    const callable = this.fns.httpsCallable('reviewSolutionModeration');
    return firstValueFrom(callable({ solutionId, contentHash, action, note }));
  }

  async getPolicy(): Promise<SolutionModerationPolicy> {
    const callable = this.fns.httpsCallable('getSolutionModerationPolicy');
    const response: any = await firstValueFrom(callable({}));
    return response.policy as SolutionModerationPolicy;
  }

  async updatePolicy(
    policy: SolutionModerationPolicy
  ): Promise<SolutionModerationPolicy> {
    const callable = this.fns.httpsCallable('updateSolutionModerationPolicy');
    const response: any = await firstValueFrom(callable({ policy }));
    return response.policy as SolutionModerationPolicy;
  }

  backfill(cursor = ''): Promise<ModerationBackfillResult> {
    const callable = this.fns.httpsCallable('backfillSolutionModeration');
    return firstValueFrom(callable({ cursor }));
  }

  labelForStatus(status: SolutionModerationStatus): string {
    return status.replace('_', ' ');
  }
}
