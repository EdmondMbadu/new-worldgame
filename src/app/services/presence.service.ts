import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  Subject,
} from 'rxjs';
import { environment } from 'environments/environments';

interface PresenceState {
  state?: 'online' | 'offline';
  lastChanged?: number;
}

export interface TypingPresence {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  activity: 'discussion' | 'solution';
  locationLabel?: string;
  updatedAt: number;
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
  private readonly typingFreshnessWindowMs = 6_000;
  private readonly typingDisconnectKeys = new Set<string>();
  private readonly localTypingStates = new Map<
    string,
    Map<string, TypingPresence>
  >();
  private readonly localTypingChanged = new Subject<void>();

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

  async setTyping(
    contextId: string,
    uid: string,
    displayName: string,
    avatarUrl?: string,
    activity: TypingPresence['activity'] = 'discussion',
    locationLabel?: string
  ): Promise<void> {
    const contextKey = this.normalizeContextKey(contextId);
    const userKey = String(uid || '').trim();
    if (!contextKey || !userKey) return;

    const localState: TypingPresence = {
      uid: userKey,
      displayName: String(displayName || 'Team member').trim().slice(0, 80),
      avatarUrl: String(avatarUrl || '').trim().slice(0, 500) || undefined,
      activity,
      locationLabel:
        String(locationLabel || '').trim().slice(0, 100) || undefined,
      updatedAt: Date.now(),
    };
    const contextTyping =
      this.localTypingStates.get(contextKey) ||
      new Map<string, TypingPresence>();
    contextTyping.set(userKey, localState);
    this.localTypingStates.set(contextKey, contextTyping);
    this.localTypingChanged.next();

    try {
      const api = await this.getDatabaseApi();
      const database = await this.getDatabase();
      const typingRef = api.ref(database, `typing/${contextKey}/${userKey}`);
      const disconnectKey = `${contextKey}/${userKey}`;

      if (!this.typingDisconnectKeys.has(disconnectKey)) {
        await api.onDisconnect(typingRef).remove();
        this.typingDisconnectKeys.add(disconnectKey);
      }

      await api.set(typingRef, {
        displayName: String(displayName || 'Team member').trim().slice(0, 80),
        avatarUrl: String(avatarUrl || '').trim().slice(0, 500),
        activity,
        locationLabel: String(locationLabel || '').trim().slice(0, 100),
        updatedAt: api.serverTimestamp(),
      });
    } catch (error) {
      this.warnPresenceUnavailable(error);
    }
  }

  async clearTyping(contextId: string, uid: string): Promise<void> {
    const contextKey = this.normalizeContextKey(contextId);
    const userKey = String(uid || '').trim();
    if (!contextKey || !userKey) return;

    const contextTyping = this.localTypingStates.get(contextKey);
    if (contextTyping?.delete(userKey)) {
      if (!contextTyping.size) {
        this.localTypingStates.delete(contextKey);
      }
      this.localTypingChanged.next();
    }

    try {
      const api = await this.getDatabaseApi();
      const database = await this.getDatabase();
      await api.remove(api.ref(database, `typing/${contextKey}/${userKey}`));
    } catch (error) {
      this.warnPresenceUnavailable(error);
    }
  }

  watchTypingUsers$(contextId: string): Observable<TypingPresence[]> {
    const contextKey = this.normalizeContextKey(contextId);
    if (!contextKey) return of([]);

    return new Observable<TypingPresence[]>((subscriber) => {
      let unsubscribe: (() => void) | undefined;
      let cancelled = false;
      let rawTypingState: Record<string, any> = {};
      let lastSignature = '';

      const emitFreshTypingUsers = () => {
        const now = Date.now();
        const combinedTypingState: Record<string, any> = {
          ...rawTypingState,
        };
        this.localTypingStates
          .get(contextKey)
          ?.forEach((state, uid) => {
            combinedTypingState[uid] = state;
          });
        const users = Object.entries(combinedTypingState)
          .map(([uid, state]): TypingPresence => ({
            uid,
            displayName: String(state?.displayName || 'Team member'),
            avatarUrl: String(state?.avatarUrl || '') || undefined,
            activity:
              state?.activity === 'solution' ? 'solution' : 'discussion',
            locationLabel:
              String(state?.locationLabel || '').trim() || undefined,
            updatedAt: Number(state?.updatedAt || 0),
          }))
          .filter(
            (state) =>
              state.updatedAt > 0 &&
              now - state.updatedAt <= this.typingFreshnessWindowMs
          )
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        const signature = users
          .map(
            (user) =>
              `${user.uid}:${user.updatedAt}:${user.activity}:${user.locationLabel || ''}`
          )
          .join('|');
        if (signature === lastSignature) return;
        lastSignature = signature;
        subscriber.next(users);
      };

      const expiryTimer = window.setInterval(emitFreshTypingUsers, 1_000);
      const localTypingSub = this.localTypingChanged.subscribe(() =>
        emitFreshTypingUsers()
      );

      Promise.all([this.getDatabaseApi(), this.getDatabase()])
        .then(([api, database]) => {
          if (cancelled) return;
          unsubscribe = api.onValue(
            api.ref(database, `typing/${contextKey}`),
            (snapshot) => {
              rawTypingState =
                (snapshot.val() as Record<string, any> | null) || {};
              emitFreshTypingUsers();
            },
            (error) => subscriber.error(error)
          );
        })
        .catch((error) => subscriber.error(error));

      return () => {
        cancelled = true;
        window.clearInterval(expiryTimer);
        localTypingSub.unsubscribe();
        unsubscribe?.();
      };
    }).pipe(
      catchError((error) => {
        this.warnPresenceUnavailable(error);
        return of([]);
      })
    );
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

  private normalizeContextKey(value: string): string {
    return String(value || '')
      .trim()
      .replace(/[.#$\/\[\]]/g, '_')
      .slice(0, 160);
  }

  private warnPresenceUnavailable(error: unknown): void {
    if (this.warnedPresenceUnavailable) return;
    this.warnedPresenceUnavailable = true;
    console.warn('Realtime presence is unavailable; using lastActiveAt fallback.', error);
  }
}
