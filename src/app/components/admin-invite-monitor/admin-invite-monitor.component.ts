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
    // choose statuses to query
    const statuses: BroadcastStatus[] =
      this.statusFilter === 'all'
        ? ['pending', 'active', 'paused', 'stopped']
        : [this.statusFilter];

    this.sub?.unsubscribe();
    this.sub = this.solutions
      .listBroadcastsByStatuses(statuses)
      .subscribe((list) => {
        this.rows = (list || []).map((b) => ({
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

        // recompute counts (from server or recalc client-side)
        this.counts.pending = this.rows.filter(
          (r) => r.status === 'pending'
        ).length;
        this.counts.active = this.rows.filter(
          (r) => r.status === 'active'
        ).length;
        this.counts.paused = this.rows.filter(
          (r) => r.status === 'paused'
        ).length;
        this.counts.stopped = this.rows.filter(
          (r) => r.status === 'stopped'
        ).length;

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
