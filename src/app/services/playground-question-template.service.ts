import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Observable, firstValueFrom, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  PLAYGROUND_QUESTION_SCHEMA_VERSION,
  PLAYGROUND_QUESTION_KEYS_FLAT,
  getDefaultQuestionLocales,
  resolveQuestionTemplate,
} from '../config/playground-question-schema';
import {
  ChallengeQuestionTemplate,
  PlaygroundQuestionLanguage,
  ResolvedPlaygroundQuestionTemplate,
} from '../models/challenge-question-template';
import { Solution } from '../models/solution';

@Injectable({ providedIn: 'root' })
export class PlaygroundQuestionTemplateService {
  constructor(
    private readonly afs: AngularFirestore,
    private readonly fns: AngularFireFunctions
  ) {}

  watchForChallenge(challengePageId: string): Observable<ResolvedPlaygroundQuestionTemplate> {
    if (!challengePageId) return of(resolveQuestionTemplate(null, null));
    return this.afs
      .doc<ChallengeQuestionTemplate>(`challengeQuestionTemplates/${challengePageId}`)
      .valueChanges()
      .pipe(
        map((template) => resolveQuestionTemplate(challengePageId, template as any)),
        catchError((error) => {
          console.warn('Unable to load challenge question template; using standard questions.', error);
          return of(resolveQuestionTemplate(challengePageId, null));
        })
      );
  }

  watchForSolution(solutionId: string, solution?: Solution): Observable<ResolvedPlaygroundQuestionTemplate> {
    const directChallengePageId = String(solution?.challengePageId || '').trim();
    if (!solutionId) {
      return directChallengePageId
        ? this.watchForChallenge(directChallengePageId)
        : of(resolveQuestionTemplate(null, null));
    }

    return this.afs.doc<{ challengePageId?: string }>(`user-challenges/${solutionId}`).valueChanges().pipe(
      switchMap((link) => {
        const challengePageId = String(link?.challengePageId || '').trim();
        // The link is authoritative. Deleting it must stop inheritance even
        // if an older denormalized solution pointer remains.
        return challengePageId
          ? this.watchForChallenge(challengePageId)
          : of(resolveQuestionTemplate(null, null));
      }),
      catchError((error) => {
        console.warn('Unable to resolve the solution challenge; using standard questions.', error);
        return of(resolveQuestionTemplate(null, null));
      })
    );
  }

  createEditorDraft(template?: ResolvedPlaygroundQuestionTemplate | null): Record<PlaygroundQuestionLanguage, Record<string, string>> {
    const source = template?.locales || getDefaultQuestionLocales();
    return { en: { ...source.en }, fr: { ...source.fr } };
  }

  async save(
    challengePageId: string,
    locales: Record<PlaygroundQuestionLanguage, Record<string, string>>
  ): Promise<ResolvedPlaygroundQuestionTemplate> {
    const defaults = getDefaultQuestionLocales();
    const changedKeys = PLAYGROUND_QUESTION_KEYS_FLAT.filter((key) =>
      (['en', 'fr'] as PlaygroundQuestionLanguage[]).some(
        (language) => locales[language][key].trim() !== defaults[language][key].trim()
      )
    );
    const callable = this.fns.httpsCallable('saveChallengeQuestionTemplate');
    const response = await firstValueFrom(callable({
      challengePageId,
      schemaVersion: PLAYGROUND_QUESTION_SCHEMA_VERSION,
      locales,
      changedKeys,
    }));
    return resolveQuestionTemplate(challengePageId, response as Partial<ResolvedPlaygroundQuestionTemplate>);
  }

  async reset(challengePageId: string): Promise<ResolvedPlaygroundQuestionTemplate> {
    const callable = this.fns.httpsCallable('resetChallengeQuestionTemplate');
    const response = await firstValueFrom(callable({ challengePageId }));
    return resolveQuestionTemplate(challengePageId, response as Partial<ResolvedPlaygroundQuestionTemplate>);
  }
}
