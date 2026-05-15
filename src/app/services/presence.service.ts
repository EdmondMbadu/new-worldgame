import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
} from 'rxjs';
import { environment } from 'environments/environments';

interface PresenceState {
  state?: 'online' | 'offline';
  lastChanged?: number;
}

type DatabaseApi = typeof import('firebase/database');

@Injectable({
  providedIn: 'root',
})
export class PresenceService {
  private activeUid: string | null = null;
  private connectedUnsubscribe?: () => void;
  private databaseApiPromise?: Promise<DatabaseApi>;
  private databasePromise?: Promise<ReturnType<DatabaseApi['getDatabase']>>;
  private warnedPresenceUnavailable = false;
  private readonly activeFallbackWindowMs = 10 * 60 * 1000;

  setCurrentUser(uid: string | null): void {
    if (uid === this.activeUid) return;

    const previousUid = this.activeUid;
    this.detachConnectionListener();
    this.activeUid = uid;

    if (previousUid) {
      void this.markOffline(previousUid);
    }

    if (uid) {
      this.attachConnectionListener(uid);
    }
  }

  watchOnlineUids$(
    uids: string[],
    fallbackLastActiveByUid: Map<string, string | undefined> = new Map()
  ): Observable<Set<string>> {
    const uniqueUids = Array.from(
      new Set(uids.map((uid) => String(uid || '').trim()).filter(Boolean))
    );

    if (!uniqueUids.length) {
      return of(new Set<string>());
    }

    return combineLatest(
      uniqueUids.map((uid) =>
        this.watchUidOnline$(uid, fallbackLastActiveByUid.get(uid)).pipe(
          map((online) => ({ uid, online }))
        )
      )
    ).pipe(
      map(
        (states) =>
          new Set(states.filter((state) => state.online).map((state) => state.uid))
      ),
      distinctUntilChanged((a, b) => this.sameUidSet(a, b))
    );
  }

  isActiveRecently(lastActiveAt?: string): boolean {
    if (!lastActiveAt) return false;
    const lastActiveMs = Date.parse(lastActiveAt);
    if (!Number.isFinite(lastActiveMs)) return false;
    return Date.now() - lastActiveMs <= this.activeFallbackWindowMs;
  }

  private watchUidOnline$(
    uid: string,
    fallbackLastActiveAt?: string
  ): Observable<boolean> {
    if (uid === this.activeUid) {
      return of(true);
    }

    return this.watchPresenceState$(uid).pipe(
      map((presence) => {
        if (presence?.state === 'online') return true;
        if (presence?.state === 'offline') return false;
        return this.isActiveRecently(fallbackLastActiveAt);
      }),
      catchError((error) => {
        this.warnPresenceUnavailable(error);
        return of(this.isActiveRecently(fallbackLastActiveAt));
      })
    );
  }

  private async attachConnectionListener(uid: string): Promise<void> {
    try {
      const api = await this.getDatabaseApi();
      const database = await this.getDatabase();
      if (this.activeUid !== uid) return;

      const connectedRef = api.ref(database, '.info/connected');
      this.connectedUnsubscribe = api.onValue(connectedRef, (snapshot) => {
        if (snapshot.val() !== true || this.activeUid !== uid) return;

        const statusRef = api.ref(database, `status/${uid}`);
        const offlineState = {
          state: 'offline',
          lastChanged: api.serverTimestamp(),
        };
        const onlineState = {
          state: 'online',
          lastChanged: api.serverTimestamp(),
        };

        api
          .onDisconnect(statusRef)
          .set(offlineState)
          .then(() => api.set(statusRef, onlineState))
          .catch((error) => this.warnPresenceUnavailable(error));
      });
    } catch (error) {
      this.warnPresenceUnavailable(error);
    }
  }

  private detachConnectionListener(): void {
    this.connectedUnsubscribe?.();
    this.connectedUnsubscribe = undefined;
  }

  private async markOffline(uid: string): Promise<void> {
    try {
      const api = await this.getDatabaseApi();
      const database = await this.getDatabase();
      await api.set(api.ref(database, `status/${uid}`), {
        state: 'offline',
        lastChanged: api.serverTimestamp(),
      });
    } catch (error) {
      this.warnPresenceUnavailable(error);
    }
  }

  private watchPresenceState$(uid: string): Observable<PresenceState | null> {
    return new Observable<PresenceState | null>((subscriber) => {
      let unsubscribe: (() => void) | undefined;
      let cancelled = false;

      Promise.all([this.getDatabaseApi(), this.getDatabase()])
        .then(([api, database]) => {
          if (cancelled) return;
          unsubscribe = api.onValue(
            api.ref(database, `status/${uid}`),
            (snapshot) => subscriber.next(snapshot.val() as PresenceState | null),
            (error) => subscriber.error(error)
          );
        })
        .catch((error) => subscriber.error(error));

      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    });
  }

  private getDatabaseApi(): Promise<DatabaseApi> {
    if (!this.databaseApiPromise) {
      this.databaseApiPromise = import('firebase/database');
    }
    return this.databaseApiPromise;
  }

  private getDatabase(): Promise<ReturnType<DatabaseApi['getDatabase']>> {
    if (!this.databasePromise) {
      this.databasePromise = this.getDatabaseApi().then((api) =>
        api.getDatabase(undefined, environment.firebase.databaseURL)
      );
    }
    return this.databasePromise;
  }

  private sameUidSet(a: Set<string>, b: Set<string>): boolean {
    if (a.size !== b.size) return false;
    for (const value of a) {
      if (!b.has(value)) return false;
    }
    return true;
  }

  private warnPresenceUnavailable(error: unknown): void {
    if (this.warnedPresenceUnavailable) return;
    this.warnedPresenceUnavailable = true;
    console.warn('Realtime presence is unavailable; using lastActiveAt fallback.', error);
  }
}
