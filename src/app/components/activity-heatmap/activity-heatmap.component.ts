import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { ActivityService } from 'src/app/services/activity.service';

interface DayCell {
  date: Date;
  key: string;
  score: number;
  level: 0 | 1 | 2 | 3 | 4;
  editSeconds: number;
  edits: number;
  comments: number;
  evaluations: number;
  publishes: number;
  inRange: boolean;
}

interface MonthLabel {
  label: string;
  weekIndex: number;
}

@Component({
  selector: 'app-activity-heatmap',
  templateUrl: './activity-heatmap.component.html',
  styleUrls: ['./activity-heatmap.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityHeatmapComponent implements OnInit, OnChanges {
  @Input() uid: string | null | undefined = null;

  /** Anchor date — the right-most week of the grid is the week containing this date. */
  anchor: Date = new Date();

  weeks: DayCell[][] = [];
  monthLabels: MonthLabel[] = [];
  total: number = 0;
  activeDays: number = 0;
  loading: boolean = true;
  hover: DayCell | null = null;

  private activityByKey: { [k: string]: any } = {};

  constructor(
    private activity: ActivityService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.uid) this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['uid'] && this.uid) this.load();
  }

  private load() {
    if (!this.uid) return;
    this.loading = true;
    this.activity.getActivityForUser(this.uid, 800).subscribe((docs) => {
      this.activityByKey = {};
      for (const d of docs || []) {
        if (d?.date) this.activityByKey[d.date] = d;
      }
      this.loading = false;
      this.rebuild();
      this.cdr.markForCheck();
    });
  }

  shiftYear(direction: -1 | 1) {
    const next = new Date(this.anchor);
    next.setFullYear(next.getFullYear() + direction);
    this.anchor = next;
    this.rebuild();
  }

  resetToToday() {
    this.anchor = new Date();
    this.rebuild();
  }

  isFutureWindow(): boolean {
    const lastSunday = endOfWeek(this.anchor);
    return lastSunday.getTime() >= endOfWeek(new Date()).getTime();
  }

  rangeLabel(): string {
    if (!this.weeks.length) return '';
    const first = this.weeks[0][0]?.date;
    const last = this.weeks[this.weeks.length - 1][6]?.date;
    if (!first || !last) return '';
    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    return `${fmt(first)} – ${fmt(last)}`;
  }

  private rebuild() {
    const today = startOfDay(new Date());
    const end = endOfWeek(this.anchor);                 // Saturday of the anchor's week
    const start = new Date(end);
    start.setDate(start.getDate() - (53 * 7 - 1));      // 53 weeks total

    const weeks: DayCell[][] = [];
    let total = 0;
    let activeDays = 0;

    for (let w = 0; w < 53; w++) {
      const week: DayCell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = isoDateKey(date);
        const doc = this.activityByKey[key];
        const inRange = date.getTime() <= today.getTime();
        const cell = buildCell(date, key, doc, inRange);
        if (cell.score > 0 && inRange) {
          total += cell.score;
          activeDays += 1;
        }
        week.push(cell);
      }
      weeks.push(week);
    }

    this.weeks = weeks;
    this.total = total;
    this.activeDays = activeDays;
    this.monthLabels = computeMonthLabels(weeks);
  }

  trackWeek = (i: number) => i;
  trackDay = (_: number, c: DayCell) => c.key;

  hoverX = 0;
  hoverY = 0;

  onCellEnter(cell: DayCell, ev: MouseEvent) {
    if (!cell.inRange) return;
    this.hover = cell;
    const target = ev.currentTarget as HTMLElement;
    const grid = target.closest('[data-heatmap-grid]') as HTMLElement | null;
    if (!grid) return;
    const cellRect = target.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    // Position tooltip just above-right of the cell, relative to the grid wrapper.
    this.hoverX = cellRect.left - gridRect.left + cellRect.width / 2;
    this.hoverY = cellRect.top - gridRect.top;
  }
  onCellLeave() {
    this.hover = null;
  }

  formatHoverDate(d: Date): string {
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatMinutes(seconds: number): string {
    if (!seconds) return '0m';
    const m = Math.round(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h}h`;
  }
}

// --- helpers ---

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d: Date): Date {
  // Saturday-anchored week (so Sun..Sat columns).
  const x = startOfDay(d);
  const day = x.getDay(); // 0=Sun..6=Sat
  x.setDate(x.getDate() + (6 - day));
  return x;
}

function isoDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildCell(
  date: Date,
  key: string,
  doc: any,
  inRange: boolean
): DayCell {
  const editSeconds = Number(doc?.editSeconds || 0);
  const edits = Number(doc?.edits || 0);
  const comments = Number(doc?.comments || 0);
  const evaluations = Number(doc?.evaluations || 0);
  const publishes = Number(doc?.publishes || 0);

  // Composite score:
  //   a saved edit OR ≥ 5 min editing = 1
  //   each comment/eval up to 3
  //   publishing = 2
  const score =
    Math.max(editSeconds >= 300 ? 1 : 0, edits > 0 ? 1 : 0) +
    Math.min(comments, 3) +
    Math.min(evaluations, 3) +
    (publishes > 0 ? 2 : 0);

  let level: 0 | 1 | 2 | 3 | 4 = 0;
  if (score >= 7) level = 4;
  else if (score >= 5) level = 3;
  else if (score >= 3) level = 2;
  else if (score >= 1) level = 1;

  return {
    date,
    key,
    score,
    level,
    editSeconds,
    edits,
    comments,
    evaluations,
    publishes,
    inRange,
  };
}

function computeMonthLabels(weeks: DayCell[][]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastMonth = -1;
  for (let i = 0; i < weeks.length; i++) {
    const firstDay = weeks[i][0].date;
    const m = firstDay.getMonth();
    if (m !== lastMonth) {
      // skip if too close to the previous label
      const prev = labels[labels.length - 1];
      if (!prev || i - prev.weekIndex >= 3) {
        labels.push({
          label: firstDay.toLocaleDateString(undefined, { month: 'short' }),
          weekIndex: i,
        });
      }
      lastMonth = m;
    }
  }
  return labels;
}
