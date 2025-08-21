// management-ask.component.ts
import { Component, OnInit } from '@angular/core';
import { AskDoc, AskStatus } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

type SortKey = 'createdAt' | 'status';
type StatusFilter = 'all' | AskStatus;

interface AskRow extends AskDoc {
  createdAtMs: number; // normalized ms for sorting/formatting
  name: string; // convenience for display/search
}

@Component({
  selector: 'app-management-ask',
  templateUrl: './management-ask.component.html',
  styleUrls: ['./management-ask.component.css'], // (file can exist empty; UI uses inline tailwind)
})
export class ManagementAskComponent implements OnInit {
  isLoggedIn = false;

  items: AskRow[] = [];
  filtered: AskRow[] = [];

  search = '';
  sortBy: SortKey = 'createdAt';
  statusFilter: StatusFilter = 'all';

  // quick counts
  countAll = 0;
  countNew = 0;
  countRead = 0;
  countClosed = 0;

  constructor(public auth: AuthService, private data: DataService) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.isLoggedIn = !!this.auth.currentUser?.email;

    this.data.listAskAnything().subscribe((docs) => {
      this.items = docs.map((d) => this.hydrate(d));
      this.updateCounts();
      this.sortItems();
      this.applyFilter();
    });
  }

  private hydrate(d: AskDoc): AskRow {
    const createdAtMs = this.normalizeTimestamp(d.createdAt);
    const name = `${(d.firstName || '').trim()} ${(
      d.lastName || ''
    ).trim()}`.trim();
    return { ...d, createdAtMs, name };
  }

  private normalizeTimestamp(v: any): number {
    if (!v) return 0;
    if (typeof v === 'number') return v < 1e12 ? v * 1000 : v; // seconds vs ms
    if (typeof v === 'string') {
      const n = Date.parse(v);
      return Number.isFinite(n) ? n : 0;
    }
    if (v?.seconds) return v.seconds * 1000;
    if (typeof v.toDate === 'function') {
      const d = v.toDate();
      return d instanceof Date && !isNaN(+d) ? +d : 0;
    }
    return 0;
  }

  updateCounts(): void {
    this.countAll = this.items.length;
    this.countNew = this.items.filter((i) => i.status === 'new').length;
    this.countRead = this.items.filter((i) => i.status === 'read').length;
    this.countClosed = this.items.filter((i) => i.status === 'closed').length;
  }

  toggleSort(): void {
    this.sortBy = this.sortBy === 'createdAt' ? 'status' : 'createdAt';
    this.sortItems();
    this.applyFilter();
  }

  private sortItems(): void {
    if (this.sortBy === 'createdAt') {
      // newest first
      this.items.sort((a, b) => b.createdAtMs - a.createdAtMs);
    } else {
      // status priority: new > read > closed, then newest first
      const order: Record<AskStatus, number> = { new: 0, read: 1, closed: 2 };
      this.items.sort((a, b) => {
        const c = order[a.status] - order[b.status];
        return c !== 0 ? c : b.createdAtMs - a.createdAtMs;
      });
    }
  }

  onSortChange(): void {
    this.sortItems();
    this.applyFilter();
  }

  setFilter(f: StatusFilter) {
    this.statusFilter = f;
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.items.filter((i) => {
      const matchesStatus =
        this.statusFilter === 'all' ? true : i.status === this.statusFilter;
      const matchesQuery =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.question.toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }

  async markStatus(row: AskRow, status: AskStatus) {
    await this.data.setAskStatus(row.id, status);
    row.status = status;
    this.updateCounts();
    this.sortItems();
    this.applyFilter();
  }

  /** Download visible rows to CSV */
  downloadCsv(): void {
    const rows = this.filtered.map((r, i) =>
      [
        `${i + 1}. ${r.name}`,
        r.email,
        r.status,
        `"${(r.question || '').replace(/"/g, '""')}"`,
        new Date(r.createdAtMs || 0).toLocaleString(),
      ].join(',')
    );
    const csv = ['Name,Email,Status,Question,Asked At', ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ask_anything_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
