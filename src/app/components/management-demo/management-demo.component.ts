import { Component, OnInit } from '@angular/core';
import { DemoBooking } from 'src/app/models/tournament';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-management-demo',
  templateUrl: './management-demo.component.html',
  styleUrl: './management-demo.component.css',
})
export class ManagementDemoComponent implements OnInit {
  bookings: DemoBooking[] = [];
  filtered: DemoBooking[] = [];
  search = '';
  isLoggedIn = false;

  constructor(public auth: AuthService) {}

  sortBy: 'createdAt' | 'demoDateTime' = 'createdAt';

  ngOnInit(): void {
    window.scroll(0, 0);
    this.isLoggedIn = !!this.auth.currentUser?.email;

    this.auth.listAll().subscribe((list) => {
      this.bookings = [...list].map((b) => ({
        ...b,
        createdAt: this.normalizeTimestamp(b.createdAt),
      }));
      this.sortBookings();
      this.applyFilter();
    });
  }

  toggleSort(): void {
    this.sortBy = this.sortBy === 'createdAt' ? 'demoDateTime' : 'createdAt';
    this.sortBookings();
    this.applyFilter(); // re-apply after sort
  }

  private sortBookings(): void {
    if (this.sortBy === 'createdAt') {
      // Newest first
      this.bookings.sort((a, b) => b.createdAt - a.createdAt);
    } else if (this.sortBy === 'demoDateTime') {
      // Soonest first
      this.bookings.sort((a, b) => a.demoDateTime - b.demoDateTime);
    }
  }

  private normalizeTimestamp(timestamp: any): number {
    if (typeof timestamp === 'number') return timestamp;
    if (timestamp?.seconds) return timestamp.seconds * 1000;
    return Date.now();
  }

  applyFilter(): void {
    const q = this.search.toLowerCase().trim();
    this.filtered = this.bookings.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.demoDate.includes(q) ||
        b.demoTime.toLowerCase().includes(q)
    );
  }

  /** Download visible rows to CSV */
  downloadCsv(): void {
    const rows = this.filtered.map((b, i) =>
      [
        `${i + 1}. ${b.name}`,
        b.email,
        `${b.demoDate} ${b.demoTime}`,
        `"${b.notes?.replace(/"/g, '""') || ''}"`,
        new Date(b.createdAt).toLocaleString(), // <-- Add this line
      ].join(',')
    );
    const csv = ['Name,Email,Slot,Notes,Scheduled At', ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo_signups_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
