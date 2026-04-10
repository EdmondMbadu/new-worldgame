import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { firstValueFrom } from 'rxjs';

export interface SlpReachPerson {
  id: string;
  name: string;
  title: string;
  organization: string;
  email: string;
  url: string;
  whyRelevant: string;
  location?: string;
}

export interface SlpReachLookupResponse {
  people: SlpReachPerson[];
  page: number;
  nextPage: number;
  hasMore: boolean;
  summary: string;
  generatedAt: string;
}

export interface SlpReachCachedSearch {
  people: SlpReachPerson[];
  page: number;
  nextPage: number;
  hasMore: boolean;
  summary: string;
  generatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class SlpReachService {
  private readonly dismissedStoragePrefix = 'slp_reach_dismissed';
  private readonly cacheStoragePrefix = 'slp_reach_cache';

  constructor(private readonly fns: AngularFireFunctions) {}

  async findPeople(params: {
    solutionId: string;
    page: number;
    pageSize?: number;
    city?: string;
    country?: string;
    excludedIds?: string[];
    forceRefresh?: boolean;
  }): Promise<SlpReachLookupResponse> {
    const callable = this.fns.httpsCallable('findSolutionReachPeople');
    const response = await firstValueFrom(callable(params));
    return this.normalizeResponse(response);
  }

  readCachedSearch(params: {
    solutionId?: string;
    city?: string;
    country?: string;
  }): SlpReachCachedSearch | null {
    const cacheKey = this.getSearchCacheKey(
      params.solutionId,
      params.city,
      params.country
    );
    if (!cacheKey) {
      return null;
    }

    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const normalized = this.normalizeCachedSearch(parsed);
      if (!normalized) {
        return null;
      }

      if (this.isExpired(normalized.generatedAt)) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return normalized;
    } catch {
      return null;
    }
  }

  writeCachedSearch(
    params: { solutionId?: string; city?: string; country?: string },
    data: SlpReachLookupResponse
  ): void {
    const cacheKey = this.getSearchCacheKey(
      params.solutionId,
      params.city,
      params.country
    );
    if (!cacheKey) {
      return;
    }

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        people: data.people,
        page: data.page,
        nextPage: data.nextPage,
        hasMore: data.hasMore,
        summary: data.summary,
        generatedAt: data.generatedAt,
      })
    );
  }

  clearCachedSearch(params: {
    solutionId?: string;
    city?: string;
    country?: string;
  }): void {
    const cacheKey = this.getSearchCacheKey(
      params.solutionId,
      params.city,
      params.country
    );
    if (!cacheKey) {
      return;
    }
    localStorage.removeItem(cacheKey);
  }

  readDismissedIds(solutionId?: string): string[] {
    if (!solutionId) {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.getDismissedStorageKey(solutionId));
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  dismissPerson(solutionId: string | undefined, personId: string): void {
    if (!solutionId || !personId.trim()) {
      return;
    }

    const next = Array.from(
      new Set([...this.readDismissedIds(solutionId), personId.trim()])
    );
    localStorage.setItem(
      this.getDismissedStorageKey(solutionId),
      JSON.stringify(next)
    );
  }

  private normalizeResponse(response: any): SlpReachLookupResponse {
    const people = Array.isArray(response?.people)
      ? response.people
          .map((item: unknown) => this.normalizePerson(item))
          .filter((item: SlpReachPerson | null): item is SlpReachPerson => !!item)
      : [];

    return {
      people,
      page: Math.max(1, Number(response?.page) || 1),
      nextPage: Math.max(2, Number(response?.nextPage) || 2),
      hasMore: response?.hasMore !== false,
      summary: String(response?.summary || '').trim(),
      generatedAt: String(response?.generatedAt || '').trim(),
    };
  }

  private normalizeCachedSearch(value: any): SlpReachCachedSearch | null {
    const normalized = this.normalizeResponse(value);
    if (!normalized.people.length || !normalized.generatedAt) {
      return null;
    }

    return normalized;
  }

  private normalizePerson(item: any): SlpReachPerson | null {
    const id = String(item?.id || '').trim();
    const name = String(item?.name || '').trim();
    const title = String(item?.title || '').trim();
    const organization = String(item?.organization || '').trim();
    const email = String(item?.email || '').trim().toLowerCase();
    const url = String(item?.url || '').trim();
    const whyRelevant = String(item?.whyRelevant || '').trim();
    const location = String(item?.location || '').trim();

    if (!id || !name || !title || !organization || !email || !url) {
      return null;
    }

    return {
      id,
      name,
      title,
      organization,
      email,
      url,
      whyRelevant,
      location: location || undefined,
    };
  }

  private getDismissedStorageKey(solutionId: string): string {
    return `${this.dismissedStoragePrefix}:${solutionId}`;
  }

  private getSearchCacheKey(
    solutionId?: string,
    city?: string,
    country?: string
  ): string {
    const cleanSolutionId = String(solutionId || '').trim();
    if (!cleanSolutionId) {
      return '';
    }

    const locationKey = [city, country]
      .map((value) =>
        String(value || '')
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
      .filter(Boolean)
      .join('__') || 'global';

    return `${this.cacheStoragePrefix}:${cleanSolutionId}:${locationKey}`;
  }

  private isExpired(generatedAt: string): boolean {
    const parsed = Date.parse(generatedAt);
    if (Number.isNaN(parsed)) {
      return true;
    }

    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    return parsed < cutoff.getTime();
  }
}
