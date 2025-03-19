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
  private readonly AGE_GROUP_ORDER = [
    'Under 18',
    '18-24',
    '25-34',
    '35-44',
    '45-54',
    '55-64',
    '65+',
  ];

  // Summaries
  summaryByAgeGroup: { [key: string]: number } = {};
  summaryByContinent: { [key: string]: number } = {};
  paymentSummary = { totalPaid: 0, averagePaid: 0 };
  summaryByOccupation: { [key: string]: number } = {};
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

        this.generateSummary(); // Generate summaries after data load
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

  /* -------------------------
   *   SUMMARY GENERATION
   * ------------------------*/
  private generateSummary() {
    // Reset summary objects
    this.summaryByAgeGroup = {};
    this.summaryByContinent = {};
    this.summaryByOccupation = {};

    let totalPaidInCents = 0;

    for (const user of this.globalLabData) {
      // 1. Age Group
      const ageGroup = this.getAgeGroup(user.age);
      if (!this.summaryByAgeGroup[ageGroup]) {
        this.summaryByAgeGroup[ageGroup] = 0;
      }
      this.summaryByAgeGroup[ageGroup]++;

      // 2. Continent
      const continent = this.getContinent(user.country);
      if (!this.summaryByContinent[continent]) {
        this.summaryByContinent[continent] = 0;
      }
      this.summaryByContinent[continent]++;

      // 3. Payment Summaries
      const paidCents = user.amountPaid || 0;
      totalPaidInCents += paidCents;

      // 4. Occupation Summaries
      const occupation = user.occupation ? user.occupation : 'Unknown';
      if (!this.summaryByOccupation[occupation]) {
        this.summaryByOccupation[occupation] = 0;
      }
      this.summaryByOccupation[occupation]++;
    }

    // Calculate Payment Summaries
    const count = this.globalLabData.length;
    this.paymentSummary.totalPaid = totalPaidInCents;
    this.paymentSummary.averagePaid = count > 0 ? totalPaidInCents / count : 0;
  }

  private getAgeGroup(age: number): string {
    if (age < 18) return 'Under 18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  private getContinent(country: string): string {
    // Basic country -> continent lookup (expand as needed)
    const countryToContinentMap: { [key: string]: string } = {
      Canada: 'North America',
      'United States': 'North America',
      Mexico: 'North America',
      Brazil: 'South America',
      Argentina: 'South America',
      Germany: 'Europe',
      France: 'Europe',
      Spain: 'Europe',
      Nigeria: 'Africa',
      Egypt: 'Africa',
      'South Africa': 'Africa',
      China: 'Asia',
      Japan: 'Asia',
      India: 'Asia',
      Australia: 'Australia',
      // ... more mappings
    };
    return countryToContinentMap[country] || 'Other';
  }
  /**
   * Return age group keys in the desired order,
   * skipping any group that doesn't actually appear in the data.
   */
  getAgeGroupKeys(): string[] {
    const allKeys = Object.keys(this.summaryByAgeGroup);
    // Filter AGE_GROUP_ORDER by those that appear in summaryByAgeGroup
    return this.AGE_GROUP_ORDER.filter((group) => allKeys.includes(group));
  }

  getKeys(obj: any): string[] {
    return Object.keys(obj);
  }
}
