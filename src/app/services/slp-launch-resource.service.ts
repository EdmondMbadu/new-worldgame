import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';
import { SlpLane, SlpLocationContext } from './slp-context.service';

export type SlpResourceLane = Extract<SlpLane, 'publish' | 'fund' | 'partner'>;

export interface SlpLaunchResource {
  id: string;
  lane: SlpResourceLane;
  name: string;
  type: string;
  url: string;
  location?: string;
  whyRelevant: string;
  specificFit: string;
  nextAction: string;
  sourceTitle?: string;
  eligibility?: string;
  deadline?: string;
  contactHint?: string;
  fitScore: number;
}

export interface SlpLaunchResourceResponse {
  lane: SlpResourceLane;
  resources: SlpLaunchResource[];
  summary: string;
  generatedAt: string;
  locationMode: 'location' | 'global';
}

@Injectable({
  providedIn: 'root',
})
export class SlpLaunchResourceService {
  private readonly cacheStoragePrefix = 'slp_launch_resources_cache';

  constructor(private readonly fns: AngularFireFunctions) {}

  async findResources(params: {
    solutionId: string;
    lane: SlpResourceLane;
    location: SlpLocationContext;
    pageSize?: number;
    forceRefresh?: boolean;
  }): Promise<SlpLaunchResourceResponse> {
    const callable = this.fns.httpsCallable('findSolutionLaunchResources');
    const response = await firstValueFrom(
      callable({
        solutionId: params.solutionId,
        lane: params.lane,
        city: params.location.city || '',
        region: params.location.region || '',
        country: params.location.country || '',
        locationMode: params.location.mode === 'global' ? 'global' : 'location',
        pageSize: params.pageSize || 8,
        forceRefresh: params.forceRefresh === true,
      })
    );
    return this.normalizeResponse(response, params.lane);
  }

  readCachedSearch(params: {
    solutionId?: string;
    lane: SlpResourceLane;
    location: SlpLocationContext;
  }): SlpLaunchResourceResponse | null {
    const cacheKey = this.getSearchCacheKey(
      params.solutionId,
      params.lane,
      params.location
    );
    if (!cacheKey) {
      return null;
    }

    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) {
        return null;
      }
      const normalized = this.normalizeResponse(JSON.parse(raw), params.lane);
      if (!normalized.resources.length || this.isExpired(normalized.generatedAt)) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return normalized;
    } catch {
      return null;
    }
  }

  writeCachedSearch(
    params: {
      solutionId?: string;
      lane: SlpResourceLane;
      location: SlpLocationContext;
    },
    data: SlpLaunchResourceResponse
  ): void {
    const cacheKey = this.getSearchCacheKey(
      params.solutionId,
      params.lane,
      params.location
    );
    if (!cacheKey) {
      return;
    }
    localStorage.setItem(cacheKey, JSON.stringify(data));
  }

  clearCachedSearch(params: {
    solutionId?: string;
    lane: SlpResourceLane;
    location: SlpLocationContext;
  }): void {
    const cacheKey = this.getSearchCacheKey(
      params.solutionId,
      params.lane,
      params.location
    );
    if (cacheKey) {
      localStorage.removeItem(cacheKey);
    }
  }

  private normalizeResponse(
    response: any,
    lane: SlpResourceLane
  ): SlpLaunchResourceResponse {
    const resources = Array.isArray(response?.resources)
      ? response.resources
          .map((item: unknown) => this.normalizeResource(item, lane))
          .filter((item: SlpLaunchResource | null): item is SlpLaunchResource => !!item)
      : [];

    return {
      lane,
      resources,
      summary: String(response?.summary || '').trim(),
      generatedAt: String(response?.generatedAt || '').trim(),
      locationMode: response?.locationMode === 'global' ? 'global' : 'location',
    };
  }

  private normalizeResource(item: any, lane: SlpResourceLane): SlpLaunchResource | null {
    const id = String(item?.id || '').trim();
    const name = String(item?.name || '').trim();
    const type = String(item?.type || '').trim();
    const url = String(item?.url || '').trim();
    const whyRelevant = String(item?.whyRelevant || '').trim();
    const specificFit = String(item?.specificFit || '').trim();
    const nextAction = String(item?.nextAction || '').trim();
    const fitScore = Math.max(55, Math.min(98, Math.round(Number(item?.fitScore) || 82)));

    if (!id || !name || !type || !url || !whyRelevant || !specificFit || !nextAction) {
      return null;
    }

    return {
      id,
      lane,
      name,
      type,
      url,
      location: String(item?.location || '').trim() || undefined,
      whyRelevant,
      specificFit,
      nextAction,
      sourceTitle: String(item?.sourceTitle || '').trim() || undefined,
      eligibility: String(item?.eligibility || '').trim() || undefined,
      deadline: String(item?.deadline || '').trim() || undefined,
      contactHint: String(item?.contactHint || '').trim() || undefined,
      fitScore,
    };
  }

  private getSearchCacheKey(
    solutionId: string | undefined,
    lane: SlpResourceLane,
    location: SlpLocationContext
  ): string {
    const cleanSolutionId = String(solutionId || '').trim();
    if (!cleanSolutionId) {
      return '';
    }

    const locationKey =
      location.mode === 'global'
        ? 'global'
        : [location.city, location.region, location.country]
            .map((value) =>
              String(value || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
            )
            .filter(Boolean)
            .join('__') || 'global';

    return `${this.cacheStoragePrefix}:${cleanSolutionId}:${lane}:${locationKey}`;
  }

  private isExpired(generatedAt: string): boolean {
    const parsed = Date.parse(generatedAt);
    if (Number.isNaN(parsed)) {
      return true;
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return parsed < cutoff.getTime();
  }
}
