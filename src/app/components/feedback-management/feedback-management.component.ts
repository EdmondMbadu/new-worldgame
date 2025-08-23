import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { map } from 'rxjs/operators';

type AskStatus = 'new' | 'read' | 'closed';
type SortKey = 'createdAt' | 'status';
type StatusFilter = 'all' | AskStatus;
type AskBuckyUseful = 'yes' | 'somewhat' | 'no' | 'not_sure';

export interface LevelsDetails {
  hsCourses: string;
  collegeCourses: string;
  professionalAreas: string;
  otherText: string;
}

export interface FeedbackDoc {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  opinion: string; // A
  levels: string[]; // B
  levelsDetails?: LevelsDetails; // B details

  improvements: string; // C
  prompts: string; // I (letter kept from form)
  courseUse: string; // J

  askBuckyUseful?: AskBuckyUseful; // F
  concerns?: string; // G
  otherAgents?: string; // H
  teamBuilding?: string; // K
  more?: string; // L

  uid?: string | null;
  createdAt?: any;
  createdAtMs?: number;
  status: AskStatus;
}

interface Row extends FeedbackDoc {
  createdAtMs: number;
  name: string;
}

@Component({
  selector: 'app-feedback-management',
  templateUrl: './feedback-management.component.html',
  styleUrls: ['./feedback-management.component.css'],
})
export class FeedbackManagementComponent implements OnInit {
  isLoggedIn = false;

  items: Row[] = [];
  filtered: Row[] = [];

  search = '';
  sortBy: SortKey = 'createdAt';
  statusFilter: StatusFilter = 'all';

  countAll = 0;
  countNew = 0;
  countRead = 0;
  countClosed = 0;

  expanded = new Set<string>();
  expandAll = false;

  constructor(public auth: AuthService, private data: DataService) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    this.isLoggedIn = !!this.auth.currentUser?.email;

    this.data
      .listAskFeedback()
      .pipe(map((docs) => docs.map((d) => this.hydrate(d))))
      .subscribe((rows) => {
        this.items = rows;
        this.updateCounts();
        this.sortItems();
        this.applyFilter();
      });
  }

  private hydrate(d: FeedbackDoc): Row {
    const createdAtMs =
      (d as any).createdAtMs ?? this.normalizeTimestamp((d as any).createdAt);

    const name = `${(d.firstName || '').trim()} ${(
      d.lastName || ''
    ).trim()}`.trim();
    return { ...d, createdAtMs, name };
  }

  private normalizeTimestamp(v: any): number {
    if (!v) return 0;
    if (typeof v === 'number') return v < 1e12 ? v * 1000 : v;
    if (typeof v === 'string') {
      const n = Date.parse(v);
      return Number.isFinite(n) ? n : 0;
    }
    if (v?.seconds) return v.seconds * 1000;
    if (typeof v?.toDate === 'function') {
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

  onSortChange(): void {
    this.sortItems();
    this.applyFilter();
  }

  private sortItems(): void {
    if (this.sortBy === 'createdAt') {
      this.items.sort((a, b) => b.createdAtMs - a.createdAtMs);
    } else {
      const order: Record<AskStatus, number> = { new: 0, read: 1, closed: 2 };
      this.items.sort((a, b) => {
        const c = order[a.status] - order[b.status];
        return c !== 0 ? c : b.createdAtMs - a.createdAtMs;
      });
    }
  }

  applyFilter(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.items.filter((i) => {
      const matchesStatus =
        this.statusFilter === 'all' ? true : i.status === this.statusFilter;

      const levelDetailsBlob = Object.values(i.levelsDetails || {}).join(' ');
      const big = [
        i.name,
        i.email,
        i.opinion,
        i.improvements,
        i.prompts,
        i.courseUse,
        i.concerns,
        i.otherAgents,
        i.teamBuilding,
        i.more,
        levelDetailsBlob,
        ...(i.levels || []),
        i.askBuckyUseful ? this.formatBucky(i.askBuckyUseful) : '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !q || big.includes(q);
      return matchesStatus && matchesQuery;
    });

    if (this.expandAll) this.filtered.forEach((r) => this.expanded.add(r.id));
  }

  toggle(id: string) {
    if (this.expanded.has(id)) this.expanded.delete(id);
    else this.expanded.add(id);
  }

  toggleExpandAll() {
    this.expandAll = !this.expandAll;
    this.expanded.clear();
    if (this.expandAll) this.filtered.forEach((r) => this.expanded.add(r.id));
  }

  async markStatus(row: Row, status: AskStatus) {
    await this.data.setAskFeedbackStatus(row.id, status);
    row.status = status;
    this.updateCounts();
    this.sortItems();
    this.applyFilter();
  }

  // --- Ask Bucky helpers ---
  formatBucky(v?: AskBuckyUseful): string {
    if (!v) return '—';
    const map: Record<AskBuckyUseful, string> = {
      yes: 'Yes',
      somewhat: 'Somewhat',
      no: 'No',
      not_sure: 'Not sure',
    };
    return map[v] ?? '—';
  }

  buckyBadgeClass(v?: AskBuckyUseful) {
    return {
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200':
        v === 'yes',
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200':
        v === 'somewhat',
      'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200':
        v === 'no',
      'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200':
        v === 'not_sure' || !v,
    };
  }

  // --- CSV export (A–L) ---
  downloadCsv(): void {
    const esc = (s: any) => `"${String(s ?? '').replace(/"/g, '""')}"`;
    const rows = this.filtered.map((r) =>
      [
        r.name,
        r.email,
        r.status,
        new Date(r.createdAtMs || 0).toLocaleString(),
        r.opinion,
        (r.levels || []).join('; '),
        r.levelsDetails?.hsCourses || '',
        r.levelsDetails?.collegeCourses || '',
        r.levelsDetails?.professionalAreas || '',
        r.levelsDetails?.otherText || '',
        r.improvements,
        this.formatBucky(r.askBuckyUseful),
        r.concerns,
        r.otherAgents,
        r.prompts,
        r.courseUse,
        r.teamBuilding,
        r.more,
      ]
        .map(esc)
        .join(',')
    );

    const header = [
      'Name',
      'Email',
      'Status',
      'Submitted',
      'A_Opinion',
      'B_Levels',
      'B_HS_Courses',
      'B_College_Courses',
      'B_Professional_Areas',
      'B_Other',
      'C_Improvements',
      'F_AskBuckyUseful',
      'G_Concerns',
      'H_OtherAgents',
      'I_Prompts',
      'J_CourseUse',
      'K_TeamBuilding',
      'L_More',
    ].join(',');

    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nwg_feedback_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copy(text: string) {
    navigator.clipboard?.writeText(text);
  }

  copyThread(r: Row) {
    const txt = `NWG Feedback — ${r.name} <${r.email}>
Submitted: ${r.createdAtMs ? new Date(r.createdAtMs).toLocaleString() : '—'}
Status: ${r.status.toUpperCase()}

A) Opinion:
${r.opinion || '—'}

B) Levels:
${(r.levels || []).join(', ') || '—'}
B) Details:
HS: ${r.levelsDetails?.hsCourses || '—'}
College: ${r.levelsDetails?.collegeCourses || '—'}
Professional: ${r.levelsDetails?.professionalAreas || '—'}
Other: ${r.levelsDetails?.otherText || '—'}

C) Improvements:
${r.improvements || '—'}

F) Ask Bucky useful?: ${this.formatBucky(r.askBuckyUseful)}

G) Problems / issues:
${r.concerns || '—'}

H) Other AI agents:
${r.otherAgents || '—'}

I) Prompts:
${r.prompts || '—'}

J) Course usefulness:
${r.courseUse || '—'}

K) Team building:
${r.teamBuilding || '—'}

L) Anything else:
${r.more || '—'}
`;
    navigator.clipboard?.writeText(txt);
  }
}
