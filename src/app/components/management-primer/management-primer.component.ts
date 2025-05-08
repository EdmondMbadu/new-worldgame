import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';

import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-management-primer',

  templateUrl: './management-primer.component.html',
  styleUrl: './management-primer.component.css',
})
export class ManagementPrimerComponent implements OnInit {
  ngOnInit(): void {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
      this.isLoggedIn = true;
    }
  }
  email: string = '';
  primerpData: any[] = [];
  firstName: string = '';
  lastName: string = '';
  readyToSubmit: boolean = false;
  loading: boolean = false;
  wid: string = '';
  success = false;
  isLoggedIn: boolean = false;
  constructor(
    public auth: AuthService,
    private data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private time: TimeService
  ) {
    this.data.getPrimerData().subscribe((data: any) => {
      this.primerpData = data[0].signUps;
      this.wid = data[0].wid;
      console.log('info ', this.primerpData);
      this.primerpData = this.primerpData.sort((a, b) => {
        const dateA = this.data.parseDateMMDDYYYY(a.registerDate!);
        const dateB = this.data.parseDateMMDDYYYY(b.registerDate!);
        // console.log('Parsed dates for sorting:', dateA, dateB);
        return dateB - dateA; // Sort in descending order
      });
    });
  }
  /* ---------- NEW: export CSV ---------- */
  downloadCsv(): void {
    // 1) Deduplicate by e‑mail (first occurrence wins)
    const seen = new Set<string>();
    const unique = this.primerpData.filter(
      (u) => !seen.has(u.email) && seen.add(u.email)
    );

    // 2) Build CSV header + rows (same order & date format as UI)
    const rows = unique.map((u, i) => {
      const name = `${u.firstName} ${u.lastName}`.trim();
      const date = (u.registerDate || '').split('-').slice(0, 3).join('-'); // keep YYYY‑MM‑DD
      return `"${i + 1}. ${name}","${u.email}","${date}"`;
    });

    const csv = ['Name,Email,Register Date', ...rows].join('\r\n');

    // 3) Trigger client‑side download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `primer_downloads_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  /* ------------------------------------- */
}
