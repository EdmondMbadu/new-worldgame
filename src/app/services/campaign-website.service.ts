import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom, take } from 'rxjs';

export type CampaignWebsiteStatus = 'draft' | 'published' | 'unpublished';

export interface CampaignWebsiteState {
  campaignId: string;
  solutionId: string;
  solutionTitle: string;
  title: string;
  description: string;
  slug: string;
  html: string;
  sanitizedHtml: string;
  status: CampaignWebsiteStatus;
  hasUnpublishedChanges: boolean;
  canEdit: boolean;
  canPublish: boolean;
  liveUrl: string;
  updatedAtMs: number;
  publishedAtMs: number;
}

export interface CampaignDraftResult {
  success: boolean;
  versionId: string;
  slug: string;
  sanitizedHtml: string;
  sourceBytes: number;
  sanitizedBytes: number;
}

export interface PublishedCampaignResult {
  slug?: string;
  html?: string;
  title?: string;
  description?: string;
  contentHash?: string;
  redirectTo?: string;
}

@Injectable({ providedIn: 'root' })
export class CampaignWebsiteService {
  constructor(private readonly functions: AngularFireFunctions) {}

  getWebsite(solutionId: string): Promise<CampaignWebsiteState> {
    return this.call<CampaignWebsiteState>('getCampaignWebsite', { solutionId });
  }

  checkSlug(solutionId: string, slug: string): Promise<{
    slug: string;
    available: boolean;
    liveUrl: string;
  }> {
    return this.call('checkCampaignSlugAvailability', { solutionId, slug });
  }

  saveDraft(input: {
    solutionId: string;
    title: string;
    description: string;
    slug: string;
    html: string;
    sourceType?: 'pasted' | 'uploaded' | 'generated';
  }): Promise<CampaignDraftResult> {
    return this.call<CampaignDraftResult>('saveCampaignDraft', input);
  }

  publish(solutionId: string, slug: string): Promise<{
    success: boolean;
    status: CampaignWebsiteStatus;
    slug: string;
    liveUrl: string;
    publishedVersionId: string;
  }> {
    return this.call('publishCampaignWebsite', { solutionId, slug });
  }

  unpublish(solutionId: string): Promise<{
    success: boolean;
    status: CampaignWebsiteStatus;
  }> {
    return this.call('unpublishCampaignWebsite', { solutionId });
  }

  getPublished(slug: string): Promise<PublishedCampaignResult> {
    return this.call<PublishedCampaignResult>('getPublishedCampaignWebsite', { slug });
  }

  private call<T>(name: string, data: unknown): Promise<T> {
    return firstValueFrom(
      this.functions.httpsCallable(name)(data).pipe(take(1))
    ) as Promise<T>;
  }
}
