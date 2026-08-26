import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom, take } from 'rxjs';

export type CampaignWebsiteStatus = 'draft' | 'published' | 'unpublished';
export type CampaignWebsiteGoal = 'awareness' | 'partners' | 'funding' | 'volunteers';

export interface CampaignWebsiteMetrics {
  views: number;
  shares: number;
  supporters: number;
  connections: number;
}

export interface CampaignConnection {
  id: string;
  name: string;
  email: string;
  reason: string;
  message: string;
  createdAtMs: number;
}

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
  sourceType: 'pasted' | 'uploaded' | 'generated';
  generationBrief: string;
  generationGoal: CampaignWebsiteGoal;
  generationTone: string;
  generationFocusAreas: string[];
  sourceWarning: string;
  strategyReviewAvailable: boolean;
  metrics: CampaignWebsiteMetrics;
  recentConnections: CampaignConnection[];
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
  supportCount?: number;
  imageUrl?: string;
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

  generateDraft(input: {
    solutionId: string;
    title: string;
    description: string;
    slug: string;
    brief: string;
    goal: CampaignWebsiteGoal;
    tone: string;
    focusAreas: string[];
  }): Promise<CampaignDraftResult & {
    title: string;
    description: string;
    sourceWarning: string;
  }> {
    return this.call('generateCampaignDraft', input);
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

  engage(input: {
    slug: string;
    action: 'view' | 'support' | 'share' | 'connect';
    visitorId: string;
    channel?: string;
    name?: string;
    email?: string;
    reason?: string;
    message?: string;
  }): Promise<{
    success: boolean;
    recorded?: boolean;
    supported?: boolean;
    supportCount?: number;
  }> {
    return this.call('engageCampaignWebsite', input);
  }

  private call<T>(name: string, data: unknown): Promise<T> {
    return firstValueFrom(
      this.functions.httpsCallable(name)(data).pipe(take(1))
    ) as Promise<T>;
  }
}
