/* schools-management.component.ts */
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { combineLatest, map, switchMap, Subscription, of } from 'rxjs';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';

interface SchoolRow {
  id: string;
  name: string;
  website?: string;
  plan?: string;
  currency: string;
  amount: number; // monthly price (normalized)
  paymentStatus?: string;
  ownerUid?: string;
  ownerName?: string;
  ownerEmail?: string;
  createdAt?: any; // Firestore Timestamp|string|Date
}

@Component({
  selector: 'app-schools-management',
  templateUrl: './school-management.component.html',
  styleUrls: ['./school-management.component.css'],
})
export class SchoolManagementComponent implements OnInit, OnDestroy {
  searchTerm = '';
  showActionDropDown = false;

  allSchools: SchoolRow[] = [];
  sub?: Subscription;

  // Delete confirmation state
  schoolToDelete: SchoolRow | null = null;
  showDeleteConfirm = false;
  deleting = false;

  totalSchools = 0;
  totalMRR = 0; // sum of amounts

  constructor(private afs: AngularFirestore, public auth: AuthService) {}

  ngOnInit(): void {
    // Stream all schools, then join with owner user docs
    this.sub = this.afs
      .collection('schools')
      .valueChanges({ idField: 'id' })
      .pipe(
        switchMap((docs: any[]) => {
          if (!docs?.length) return of<SchoolRow[]>([]);
          const ownerUids = Array.from(
            new Set(docs.map((d) => d.ownerUid).filter(Boolean))
          );
          const ownerStreams = ownerUids.map((uid) =>
            this.afs
              .doc<User>(`users/${uid}`)
              .valueChanges()
              .pipe(map((user) => ({ uid, user })))
          );
          return (
            ownerStreams.length ? combineLatest(ownerStreams) : of([])
          ).pipe(
            map((ownerPairs) => {
              const ownerMap = new Map<string, User>();
              ownerPairs.forEach((p) => {
                if (p.user) ownerMap.set(p.uid, p.user);
              });

              const rows: SchoolRow[] = docs.map((s: any) => {
                const owner: User | undefined = s.ownerUid
                  ? ownerMap.get(s.ownerUid)
                  : undefined;
                const currency = s.billing?.currency || s.currency || 'usd';
                const amount = this.deriveAmount(s); // normalize to dollars
                return {
                  id: s.id,
                  name: s.name ?? '—',
                  website: s.meta?.website ?? s.website,
                  plan: s.billing?.plan ?? s.plan ?? '—',
                  currency,
                  amount,
                  paymentStatus:
                    s.paymentStatus ??
                    s.billing?.paymentStatus ??
                    s.stripe?.paymentStatus ??
                    '—',
                  ownerUid: s.ownerUid,
                  ownerName: owner
                    ? `${(owner.firstName ?? '').trim()} ${(
                        owner.lastName ?? ''
                      ).trim()}`.trim()
                    : '—',
                  ownerEmail: owner?.email ?? '—',
                  createdAt: s.createdAt ?? s.created_at ?? s.createdOn ?? null,
                };
              });

              // sort by createdAt desc if possible
              rows.sort(
                (a, b) =>
                  this.toMillis(b.createdAt) - this.toMillis(a.createdAt)
              );

              // totals
              this.totalSchools = rows.length;
              this.totalMRR = rows.reduce(
                (sum, r) => sum + (Number.isFinite(r.amount) ? r.amount : 0),
                0
              );

              return rows;
            })
          );
        })
      )
      .subscribe((rows) => (this.allSchools = rows));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ---------- helpers ----------
  get filteredSchools(): SchoolRow[] {
    const q = this.searchTerm.trim().toLowerCase();
    if (!q) return this.allSchools;
    return this.allSchools.filter((s) => {
      const hay = [
        s.name,
        s.ownerName,
        s.ownerEmail,
        s.plan,
        s.currency,
        s.website,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  toggleActionDropDown() {
    this.showActionDropDown = !this.showActionDropDown;
  }

  deriveAmount(s: any): number {
    // prefer explicit billing base/total, fallback to stripe.total, then 0
    let amt: number | undefined =
      s.billing?.total ?? s.billing?.basePrice ?? s.stripe?.total ?? s.total;

    amt = Number(amt);
    if (!Number.isFinite(amt)) amt = 0;

    // if looks like cents (very large), normalize
    if (amt > 1000) amt = amt / 100;

    return Math.max(0, amt);
  }

  toMillis(d: any): number {
    if (!d) return 0;
    if (typeof d?.toDate === 'function') return d.toDate().getTime(); // Firestore Timestamp
    if (d instanceof Date) return d.getTime();
    const parsed = Date.parse(String(d));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  money(n: number, currency = 'usd'): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.toUpperCase(),
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  }

  downloadCSV(): void {
    const headers = [
      'School',
      'Website',
      'Admin Name',
      'Admin Email',
      'Plan',
      'Price',
      'Currency',
      'Payment Status',
      'Created At',
      'School ID',
    ];
    const rows = this.allSchools.map((s) => [
      s.name,
      s.website ?? '',
      s.ownerName ?? '',
      s.ownerEmail ?? '',
      s.plan ?? '',
      s.amount?.toString() ?? '0',
      (s.currency ?? 'usd').toUpperCase(),
      s.paymentStatus ?? '',
      new Date(this.toMillis(s.createdAt)).toISOString(),
      s.id,
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schools.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---------- Delete school ----------
  openDeleteConfirm(school: SchoolRow): void {
    this.schoolToDelete = school;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.schoolToDelete = null;
    this.showDeleteConfirm = false;
  }

  async confirmDelete(): Promise<void> {
    if (!this.schoolToDelete) return;

    this.deleting = true;
    const school = this.schoolToDelete;

    try {
      // 1. Delete the school document first
      await this.afs.doc(`schools/${school.id}`).delete();

      // 2. If the school has an owner, remove the schoolId and reset role on the user
      // Using set with merge to be more permissive, and FieldValue.delete() to remove the field
      if (school.ownerUid) {
        try {
          await this.afs.doc(`users/${school.ownerUid}`).set(
            {
              schoolId: firebase.firestore.FieldValue.delete(),
              role: 'individual',
            },
            { merge: true }
          );
        } catch (userErr) {
          // Log but don't fail - the school is already deleted
          console.warn('Could not update user document:', userErr);
        }
      }

      // Close the modal
      this.showDeleteConfirm = false;
      this.schoolToDelete = null;
    } catch (err: any) {
      console.error('Error deleting school:', err);
      alert(`Failed to delete school: ${err?.message || 'Unknown error'}`);
    } finally {
      this.deleting = false;
    }
  }
}
