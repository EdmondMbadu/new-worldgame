import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  of,
  Subscription,
  map,
  shareReplay,
  switchMap,
  startWith,
  combineLatest,
} from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

type Status = 'active' | 'paused' | 'stopped';

interface BroadcastVM {
  broadcastId: string;
  solutionId: string;
  title: string;
  message: string;
  includeReadMe: boolean;
  readMe?: string;
  channels?: {
    email?: boolean;
    broadcastFeed?: boolean;
    social?: boolean;
    customApi?: boolean;
  };
  inviteLink: string;
  joinLink: string;
  status: Status;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;

  // Enriched from Solution
  image?: string;
  authorName?: string;
  authorAccountId?: string;
  designersCount: number;
  sdgsCount: number;

  // UI helpers
  isOwner: boolean;
}
@Component({
  selector: 'app-broadcasted-solutions',
  templateUrl: './broadcasted-solutions.component.html',
  styleUrl: './broadcasted-solutions.component.css',
})
export class BroadcastedSolutionsComponent implements OnInit, OnDestroy {
  // filters
  searchTerm = new BehaviorSubject<string>('');
  statusFilter = new BehaviorSubject<'all' | 'active' | 'paused'>('all');
  sort = new BehaviorSubject<'newest' | 'oldest' | 'title'>('newest');

  // loading state
  loading$ = new BehaviorSubject<boolean>(true);

  // outputs
  cards$ = of<BroadcastVM[]>([]);
  stats$ = of<{ total: number; active: number } | undefined>(undefined);

  // busy actions (pause/stop)
  busyId: string | null = null;

  private sub?: Subscription;

  constructor(
    public auth: AuthService,
    private solutionService: SolutionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Stream of broadcasts (active=true OR paused while active=true)
    // We fetch all active broadcasts at the collection and keep those with status active/paused.
    const broadcasts$ = this.solutionService.listActiveBroadcasts().pipe(
      map((list) =>
        list.filter((b) => b.status === 'active' || b.status === 'paused')
      ),
      shareReplay(1)
    );

    // Enrich with Solution docs
    const enriched$ = broadcasts$.pipe(
      switchMap((bcs: any[]) => {
        const ids = bcs.map((b) => b.solutionId);
        if (!ids.length) return of([] as BroadcastVM[]);
        return this.solutionService.getSolutionsByIds(ids).pipe(
          map((solutions: Solution[]) => {
            const byId = new Map(solutions.map((s) => [s.solutionId!, s]));
            return bcs.map((b) => {
              const s = byId.get(b.solutionId);
              const designersCount = this.countParticipants(s?.participants);
              const sdgsCount = Array.isArray(s?.sdgs) ? s!.sdgs!.length : 0;
              const isOwner =
                !!s?.authorAccountId &&
                s.authorAccountId === this.auth.currentUser.uid;
              const vm: BroadcastVM = {
                broadcastId: b.broadcastId,
                solutionId: b.solutionId,
                title: b.title || s?.title || 'Untitled Solution',
                message: b.message || s?.broadCastInviteMessage || '',
                includeReadMe: !!b.includeReadMe,
                readMe: b.readMe,
                channels: b.channels,
                inviteLink: b.inviteLink,
                joinLink: b.joinLink || `/join/${b.solutionId}`,
                status: (b.status || 'active') as Status,
                active: b.active !== false,
                createdAt: b.createdAt,
                updatedAt: b.updatedAt,

                image: s?.image,
                authorName: s?.authorName,
                authorAccountId: s?.authorAccountId,
                designersCount,
                sdgsCount,

                isOwner,
              };
              return vm;
            });
          })
        );
      }),
      shareReplay(1)
    );

    // Stats
    this.stats$ = enriched$.pipe(
      map((arr) => ({
        total: arr.length,
        active: arr.filter((a) => a.status === 'active').length,
      })),
      startWith({ total: 0, active: 0 })
    );

    // Apply filters and sorts
    this.cards$ = combineLatest([
      enriched$,
      this.searchTerm.pipe(startWith('')),
      this.statusFilter.pipe(startWith('all')),
      this.sort.pipe(startWith('newest')),
    ]).pipe(
      map(([arr, q, status, sort]) => {
        const needle = (q || '').toLowerCase();

        let out = arr.filter((c) => {
          const matchesQ =
            !needle ||
            c.title?.toLowerCase().includes(needle) ||
            c.message?.toLowerCase().includes(needle) ||
            c.authorName?.toLowerCase().includes(needle);

          const matchesStatus = status === 'all' ? true : c.status === status;

          return matchesQ && matchesStatus;
        });

        // Sort
        if (sort === 'title') {
          out = out.sort((a, b) =>
            (a.title || '').localeCompare(b.title || '')
          );
        } else if (sort === 'oldest') {
          out = out.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return ta - tb;
          });
        } else {
          // newest
          out = out.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() ?? 0;
            const tb = b.createdAt?.toMillis?.() ?? 0;
            return tb - ta;
          });
        }

        return out;
      }),
      shareReplay(1)
    );

    // Simulate loading pulse end when first data arrives
    this.sub = this.cards$.subscribe(() => this.loading$.next(false));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
  onSearchInput(e: Event) {
    const val = (e.target as HTMLInputElement)?.value ?? '';
    this.searchTerm.next(val.trim());
  }
  onStatusChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as
      | 'all'
      | 'active'
      | 'paused';
    this.statusFilter.next(val);
  }
  onSortChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as
      | 'newest'
      | 'oldest'
      | 'title';
    this.sort.next(val);
  }

  // Actions
  async togglePause(c: BroadcastVM) {
    if (!c.isOwner) return;
    this.busyId = c.broadcastId;
    try {
      await this.solutionService.setBroadcastPaused(
        c.solutionId,
        c.status === 'active'
      );
    } catch (e) {
      console.error(e);
      alert('Could not update status. Please try again.');
    } finally {
      this.busyId = null;
    }
  }

  async stop(c: BroadcastVM) {
    if (!c.isOwner) return;
    if (!confirm('Stop this broadcast? It will disappear from the list.'))
      return;
    this.busyId = c.broadcastId;
    try {
      await this.solutionService.stopBroadcastBySolutionId(c.solutionId);
    } catch (e) {
      console.error(e);
      alert('Could not stop broadcast.');
    } finally {
      this.busyId = null;
    }
  }

  // Helpers
  trackById = (_: number, x: BroadcastVM) => x.broadcastId;

  private countParticipants(p: any): number {
    if (!p) return 0;
    // supports both array of {name} or map form
    if (Array.isArray(p)) return p.length;
    return Object.keys(p).length;
  }

  // Expose Observables to template (for template binding convenience)
  get search$() {
    return this.searchTerm.asObservable();
  }
  get statusFilter$() {
    return this.statusFilter.asObservable();
  }
  get sort$() {
    return this.sort.asObservable();
  }
}
