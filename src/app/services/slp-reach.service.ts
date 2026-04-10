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

@Injectable({
  providedIn: 'root',
})
export class SlpReachService {
  private readonly dismissedStoragePrefix = 'slp_reach_dismissed';

  constructor(private readonly fns: AngularFireFunctions) {}

  async findPeople(params: {
    solutionId: string;
    page: number;
    pageSize?: number;
    city?: string;
    country?: string;
    excludedIds?: string[];
  }): Promise<SlpReachLookupResponse> {
    const callable = this.fns.httpsCallable('findSolutionReachPeople');
    const response = await firstValueFrom(callable(params));
    return this.normalizeResponse(response);
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
}
