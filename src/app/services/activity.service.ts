import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Observable, of } from 'rxjs';

/**
 * Tracks user engagement and writes to users/{uid}/activity/{YYYY-MM-DD}.
 *
 * Cost guardrails:
 *  - Edit time accumulates in memory and flushes at most every FLUSH_INTERVAL_MS
 *    (5 min) OR on pagehide / blur / explicit stopEditing(). Never per keystroke.
 *  - Idle after IDLE_TIMEOUT_MS without a beat() -> counter pauses.
 *  - Tab hidden (visibilitychange) -> counter pauses.
 *  - Events (comment/eval/publish) piggy-back as a single merge write.
 *  - All writes use FieldValue.increment(), so no read-before-write.
 */

const FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const IDLE_TIMEOUT_MS = 60 * 1000;       // 60s without a beat -> idle
const MIN_FLUSH_SECONDS = 30;            // don't flush sub-30s slivers

export type ActivityEvent = 'comment' | 'evaluation' | 'publish';

interface ActivityDoc {
  date: string;
  editSeconds?: number;
  solutions?: { [solutionId: string]: number };
  comments?: number;
  evaluations?: number;
  publishes?: number;
  updatedAt?: any;
}

@Injectable({ providedIn: 'root' })
export class ActivityService implements OnDestroy {
  private uid: string | null = null;
  private currentSolutionId: string | null = null;

  private accumulatedSeconds = 0;
  private accumulatedPerSolution: { [sid: string]: number } = {};

  private lastBeatMs = 0;
  private tickerHandle: any = null;
  private flushHandle: any = null;
  private bound = false;

  constructor(
    private afs: AngularFirestore,
    private fireauth: AngularFireAuth,
    private zone: NgZone
  ) {
    this.fireauth.authState.subscribe((u) => this.setActiveUser(u?.uid ?? null));
  }

  private setActiveUser(uid: string | null) {
    if (uid === this.uid) return;
    if (this.uid) {
      void this.flush();
    }
    this.uid = uid;
    this.bindGlobalHandlersOnce();
  }

  /**
   * Call when the user enters a solution editor / playground for solution `sid`.
   * Beats are required to actually accumulate seconds.
   */
  startEditing(sid: string) {
    if (!sid) return;
    if (this.currentSolutionId !== sid) {
      // switching solutions: flush partial seconds against the previous one
      void this.flush();
      this.currentSolutionId = sid;
    }
    this.lastBeatMs = Date.now();
    this.ensureTicker();
  }

  /**
   * Call from the editor on real input (debounce upstream — once a second is fine).
   * No write happens here; this just tells us the user is still alive.
   */
  beat() {
    if (!this.uid || !this.currentSolutionId) return;
    this.lastBeatMs = Date.now();
    this.ensureTicker();
  }

  /** Call when leaving the editor (route change / unmount). Flushes immediately. */
  stopEditing() {
    void this.flush();
    this.currentSolutionId = null;
    this.clearTicker();
  }

  /** Bump a discrete event counter for today. One small write. */
  recordEvent(kind: ActivityEvent, sid?: string): Promise<void> | void {
    if (!this.uid) return;
    const dayKey = todayKey();
    const docRef = this.afs.firestore.doc(
      `users/${this.uid}/activity/${dayKey}`
    );
    const FieldValue = firebase.firestore.FieldValue;
    const fieldByKind: Record<ActivityEvent, string> = {
      comment: 'comments',
      evaluation: 'evaluations',
      publish: 'publishes',
    };
    const payload: any = {
      date: dayKey,
      [fieldByKind[kind]]: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (sid) {
      payload.solutions = { [sid]: FieldValue.increment(0) }; // ensures key exists
    }
    return docRef.set(payload, { merge: true }).catch((err) => {
      console.warn('activity.recordEvent failed', err);
    });
  }

  /** Read 365 days of activity for a user. Used by the heatmap. */
  getActivityForUser(uid: string, daysBack = 365): Observable<ActivityDoc[]> {
    if (!uid) return of([]);
    const start = new Date();
    start.setDate(start.getDate() - daysBack);
    const startKey = isoDateKey(start);
    return new Observable<ActivityDoc[]>((sub) => {
      this.afs.firestore
        .collection(`users/${uid}/activity`)
        .where('date', '>=', startKey)
        .get()
        .then((snap) => {
          const docs: ActivityDoc[] = [];
          snap.forEach((d) => docs.push(d.data() as ActivityDoc));
          sub.next(docs);
          sub.complete();
        })
        .catch((err) => {
          console.warn('activity.getActivityForUser failed', err);
          sub.next([]);
          sub.complete();
        });
    });
  }

  ngOnDestroy() {
    void this.flush();
    this.clearTicker();
  }

  // --- internals ---

  private ensureTicker() {
    if (this.tickerHandle) return;
    // Run outside Angular zone so we don't trigger change detection every second.
    this.zone.runOutsideAngular(() => {
      this.tickerHandle = setInterval(() => this.tick(), 1000);
      this.flushHandle = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    });
  }

  private clearTicker() {
    if (this.tickerHandle) {
      clearInterval(this.tickerHandle);
      this.tickerHandle = null;
    }
    if (this.flushHandle) {
      clearInterval(this.flushHandle);
      this.flushHandle = null;
    }
  }

  private tick() {
    if (!this.uid || !this.currentSolutionId) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    if (Date.now() - this.lastBeatMs > IDLE_TIMEOUT_MS) return;
    this.accumulatedSeconds += 1;
    const sid = this.currentSolutionId;
    this.accumulatedPerSolution[sid] = (this.accumulatedPerSolution[sid] || 0) + 1;
  }

  private async flush(): Promise<void> {
    if (!this.uid) return;
    const seconds = this.accumulatedSeconds;
    if (seconds < MIN_FLUSH_SECONDS) return;

    const perSolution = this.accumulatedPerSolution;
    this.accumulatedSeconds = 0;
    this.accumulatedPerSolution = {};

    const dayKey = todayKey();
    const FieldValue = firebase.firestore.FieldValue;
    const solutionsPayload: { [k: string]: any } = {};
    for (const sid of Object.keys(perSolution)) {
      solutionsPayload[sid] = FieldValue.increment(perSolution[sid]);
    }

    try {
      await this.afs.firestore
        .doc(`users/${this.uid}/activity/${dayKey}`)
        .set(
          {
            date: dayKey,
            editSeconds: FieldValue.increment(seconds),
            solutions: solutionsPayload,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
    } catch (err) {
      console.warn('activity.flush failed', err);
      // restore so the user doesn't lose their counted time
      this.accumulatedSeconds += seconds;
      for (const sid of Object.keys(perSolution)) {
        this.accumulatedPerSolution[sid] =
          (this.accumulatedPerSolution[sid] || 0) + perSolution[sid];
      }
    }
  }

  private bindGlobalHandlersOnce() {
    if (this.bound || typeof window === 'undefined') return;
    this.bound = true;
    const flushNow = () => void this.flush();
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('blur', flushNow);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushNow();
      });
    }
  }
}

function isoDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return isoDateKey(new Date());
}
