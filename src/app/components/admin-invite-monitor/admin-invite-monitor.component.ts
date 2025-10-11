import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';
import { Subscription } from 'rxjs';

type BroadcastStatus = 'active' | 'paused' | 'pending' | 'stopped';

interface AdminBroadcastRow {
  broadcastId: string;
  solutionId: string;
  title: string;
  status: BroadcastStatus;
  active: boolean;
  inviteLink?: string;
  joinLink?: string;
  createdAtMs?: number | null;
  updatedAtMs?: number | null;
  createdByName?: string;
  createdByEmail?: string;
}

@Component({
  selector: 'app-admin-invite-monitor',
  templateUrl: './admin-invite-monitor.component.html',
})
export class AdminInviteMonitorComponent implements OnInit, OnDestroy {
  constructor(public auth: AuthService, private solutions: SolutionService) {}

  rows: AdminBroadcastRow[] = [];
  filtered: AdminBroadcastRow[] = [];

  // UI state
  search = '';
  statusFilter: 'pending' | 'active' | 'paused' | 'stopped' | 'all' = 'pending';
  sortBy: 'createdAt' | 'updatedAt' | 'title' = 'createdAt';

  counts = { pending: 0, active: 0, paused: 0, stopped: 0 };
  get countCurrentFilter(): number {
    if (this.statusFilter === 'all') return this.rows.length;
    return this.rows.filter((r) => r.status === this.statusFilter).length;
  }

  private sub?: Subscription;

  ngOnInit(): void {
    this.refreshQuery();
  }
  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  refreshQuery() {
    const statuses: BroadcastStatus[] =
      this.statusFilter === 'all'
        ? ['pending', 'active', 'paused', 'stopped']
        : [this.statusFilter];

    this.sub?.unsubscribe();
    this.sub = this.solutions
      .listBroadcastsByStatuses(statuses)
      .subscribe((list) => {
        // 1) raw map
        this.rowsRaw = (list || []).map((b) => ({
          broadcastId: b.broadcastId,
          solutionId: b.solutionId,
          title: b.title || 'Untitled',
          status: b.status,
          active: !!b.active,
          inviteLink: b.inviteLink,
          joinLink: b.joinLink,
          createdAtMs: toMs(b.createdAt),
          updatedAtMs: toMs(b.updatedAt),
          createdByName: b.createdByName,
          createdByEmail: b.createdByEmail,
        }));

        // 2) per-status counts (deduped per solution)
        const by = (s: BroadcastStatus) =>
          this.dedupeBySolution(this.rowsRaw.filter((r) => r.status === s))
            .length;
        this.counts.pending = by('pending');
        this.counts.active = by('active');
        this.counts.paused = by('paused');
        this.counts.stopped = by('stopped');

        // 3) dataset used for display:
        //    - if filtering a single status → dedupe within that status
        //    - if "all" → dedupe across all statuses (latest overall per solution)
        const base =
          this.statusFilter === 'all'
            ? this.rowsRaw
            : this.rowsRaw.filter((r) => r.status === this.statusFilter);

        this.rows = this.dedupeBySolution(base);

        this.applySort();
        this.applyFilter();
      });
  }

  applyFilter() {
    const q = (this.search || '').trim().toLowerCase();
    let list = [...this.rows];

    if (this.statusFilter !== 'all') {
      list = list.filter((r) => r.status === this.statusFilter);
    }
    if (q) {
      list = list.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.createdByName || '').toLowerCase().includes(q) ||
          (r.createdByEmail || '').toLowerCase().includes(q) ||
          (r.solutionId || '').toLowerCase().includes(q) ||
          (r.broadcastId || '').toLowerCase().includes(q)
      );
    }

    this.filtered = list;
  }

  applySort() {
    const list = [...this.rows];
    switch (this.sortBy) {
      case 'title':
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'updatedAt':
        list.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
        break;
      default: // createdAt
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    }
    this.rows = list;
    this.applyFilter();
  }

  trackById(_: number, r: AdminBroadcastRow) {
    return r.broadcastId;
  }

  copy(text?: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
  }

  // ===== Status control =====

  readonly cycle: BroadcastStatus[] = [
    'pending',
    'active',
    'paused',
    'stopped',
  ];

  nextStatusLabel(curr: BroadcastStatus): BroadcastStatus {
    const i = this.cycle.indexOf(curr);
    return this.cycle[(i + 1) % this.cycle.length];
  }

  async toggleStatus(r: AdminBroadcastRow) {
    const next = this.nextStatusLabel(r.status);
    await this.setStatus(r, next);
  }

  async setStatus(r: AdminBroadcastRow, status: BroadcastStatus) {
    try {
      await this.solutions.setBroadcastStatus(r.broadcastId, status);
      // optimistic UI
      r.status = status;
      r.active = status === 'active' || status === 'paused';
      r.updatedAtMs = Date.now();
      this.applyFilter();
    } catch (e) {
      console.error('Failed to set status', e);
      alert('Failed to update status.');
    }
  }
  rowsRaw: AdminBroadcastRow[] = []; // <— raw from Firestore, may contain multiples

  private dedupeBySolution(list: AdminBroadcastRow[]): AdminBroadcastRow[] {
    const pickTime = (r: AdminBroadcastRow) =>
      r.updatedAtMs ?? r.createdAtMs ?? 0;
    const latest = new Map<string, AdminBroadcastRow>();
    for (const r of list) {
      const key = r.solutionId;
      const prev = latest.get(key);
      if (!prev || pickTime(r) > pickTime(prev)) latest.set(key, r);
    }
    return Array.from(latest.values());
  }
}

function toMs(ts: any): number | null {
  // Firebase Timestamp or Date → number
  if (!ts) return null;
  // Firestore Timestamp has .toDate()
  const d =
    typeof ts.toDate === 'function'
      ? ts.toDate()
      : ts instanceof Date
      ? ts
      : null;
  return d ? d.getTime() : null;
}
