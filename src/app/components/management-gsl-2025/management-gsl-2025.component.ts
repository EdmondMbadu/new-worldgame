import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-management-gsl-2025',
  templateUrl: './management-gsl-2025.component.html',
  styleUrl: './management-gsl-2025.component.css',
})
export class ManagementGsl2025Component implements OnInit {
  globalLabData: any[] = [];
  filteredData: any[] = [];
  searchQuery: string = '';
  expandedRows: { [key: number]: boolean } = {}; // Track expanded rows
  gid: string = '';

  constructor(
    public auth: AuthService,
    private data: DataService,
    private router: Router,
    private fns: AngularFireFunctions,
    private time: TimeService
  ) {}

  ngOnInit(): void {
    window.scroll(0, 0);
    if (
      this.auth.currentUser !== null &&
      this.auth.currentUser.email !== undefined
    ) {
    }

    this.data.getGlobalLab2025Data().subscribe((data: any) => {
      if (data.length > 0 && data[0].registrations) {
        this.globalLabData = data[0].registrations;
        this.gid = data[0].id;
        console.log('registrations', this.globalLabData);

        // Sort by registration date (most recent first)
        this.globalLabData.sort((a, b) => {
          const dateA = this.data.parseDateMMDDYYYY(a.registerDate);
          const dateB = this.data.parseDateMMDDYYYY(b.registerDate);
          return dateB - dateA;
        });

        this.filteredData = [...this.globalLabData];
      }
    });
  }

  // Filter results based on search input
  filterData() {
    this.filteredData = this.globalLabData.filter(
      (user) =>
        `${user.firstName} ${user.lastName}`
          .toLowerCase()
          .includes(this.searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        user.organization.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  // Toggle row expansion
  toggleExpand(index: number) {
    this.expandedRows[index] = !this.expandedRows[index];
  }
}
