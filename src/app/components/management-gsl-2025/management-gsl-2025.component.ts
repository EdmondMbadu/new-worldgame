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
  private readonly bulkEmailImportKey = 'bulkEmail.recipientImport.v1';
  globalLabData: any[] = [];
  filteredData: any[] = [];
  searchQuery: string = '';
  currentYear: number = new Date().getFullYear();
  selectedYear: number = this.currentYear;
  availableYears: number[] = [];
  registrationsByYear: { [year: number]: number } = {};
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
  dropdownOpen = false;
  summaryByFocusTopic: { [key: string]: number } = {};
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
        this.availableYears = this.computeAvailableYears(this.globalLabData);
        this.registrationsByYear = this.computeRegistrationsByYear(
          this.globalLabData
        );
        this.applyFilters();
      }
    });
  }

  // Filter results based on search input
  filterData() {
    this.applyFilters();
  }

  onYearChange(year: string | number) {
    const nextYear = parseInt(String(year), 10);
    this.selectedYear = Number.isNaN(nextYear) ? this.currentYear : nextYear;
    this.applyFilters();
    this.expandedRows = {};
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
    this.summaryByFocusTopic = {};

    let totalPaidInCents = 0;

    for (const user of this.filteredData) {
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
      /* 5) NEW — Focus Topic Summary */
      const focus = user.focusTopic ? user.focusTopic : 'Unspecified';
      this.summaryByFocusTopic[focus] =
        (this.summaryByFocusTopic[focus] || 0) + 1;
    }

    // Calculate Payment Summaries
    const count = this.filteredData.length;
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

  getYearKeys(): number[] {
    return this.availableYears;
  }

  formatHeardAboutUs(user: any): string {
    const heardAboutUs = user?.heardAboutUs ?? '';
    const heardAboutUsOther = user?.heardAboutUsOther?.trim?.() ?? '';

    if (!heardAboutUs && !heardAboutUsOther) {
      return 'Not provided';
    }

    if (heardAboutUs === 'other') {
      return heardAboutUsOther ? `Other: ${heardAboutUsOther}` : 'Other';
    }

    if (!heardAboutUs) {
      return heardAboutUsOther;
    }

    const labels: { [key: string]: string } = {
      discord: 'Discord',
      email: 'Email',
      friend: 'Friend',
      google: 'Google',
      other: 'Other',
    };

    return labels[heardAboutUs] || heardAboutUs;
  }

  private applyFilters() {
    const query = this.searchQuery.toLowerCase().trim();
    this.filteredData = this.globalLabData.filter((user) => {
      const year = this.extractYear(user.registerDate);
      const matchesYear = year === this.selectedYear;
      const matchesQuery =
        query === '' ||
        `${user.firstName ?? ''} ${user.lastName ?? ''}`
          .toLowerCase()
          .includes(query) ||
        `${user.email ?? ''}`.toLowerCase().includes(query) ||
        `${user.organization ?? ''}`.toLowerCase().includes(query);

      return matchesYear && matchesQuery;
    });
    this.generateSummary();
  }

  private computeAvailableYears(data: any[]): number[] {
    const years = new Set<number>([this.currentYear]);
    data.forEach((user) => years.add(this.extractYear(user.registerDate)));

    return [...years]
      .filter((year) => Number.isFinite(year) && year > 0)
      .sort((a, b) => b - a);
  }

  private computeRegistrationsByYear(data: any[]): { [year: number]: number } {
    const summary: { [year: number]: number } = {};
    for (const user of data) {
      const year = this.extractYear(user.registerDate);
      if (!summary[year]) {
        summary[year] = 0;
      }
      summary[year]++;
    }
    return summary;
  }

  private extractYear(dateStr?: string): number {
    if (!dateStr) {
      return this.currentYear;
    }
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[2], 10);
      if (!Number.isNaN(year)) {
        return year;
      }
    }
    const timestamp = this.data.parseDateMMDDYYYY(dateStr);
    if (!timestamp) {
      return this.currentYear;
    }
    return new Date(timestamp).getFullYear();
  }

  downloadCSV() {
    // 1) Prepare header row
    const headers = [
      'Name',
      'Email',
      'Country',
      'Register Date',
      'Target Group',
      'Phone',
      'Address',
      'City',
      'State/Province',
      'Age',
      'Organization',
      'Occupation',
      'Why Attend',
      'Focus Topic',
      'In Person vs Online',
      'How Heard About Us',
    ];

    // 2) Map your filteredData into CSV rows
    const rows = this.filteredData.map((user) => {
      const name = `${user.firstName} ${user.lastName}`;
      const email = user.email;
      const country = user.country;
      // match your displayed format
      const registerDate = user.registerDate.split('-').slice(0, 3).join('-');
      const targetGroup = `${user.targetGroup} - $${(
        user.amountPaid / 100
      ).toFixed(2)}`;
      const phone = user.phone ?? '';
      const address = user.address ?? '';
      const city = user.city ?? '';
      const stateProvince = user.stateProvince ?? '';
      const age = user.age ?? '';
      const organization = user.organization ?? '';
      const occupation = user.occupation ?? '';
      const whyAttend = user.whyAttend ?? '';
      const focusTopic = user.focusTopic ?? '';
      const labMode = user.labMode ?? '';
      const heardAboutUs = this.formatHeardAboutUs(user);
      // Escape any commas in fields by wrapping in quotes
      return [
        name, email, country, registerDate, targetGroup,
        phone, address, city, stateProvince, age,
        organization, occupation, whyAttend, focusTopic, labMode,
        heardAboutUs,
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(',');
    });

    // 3) Combine header + rows
    const csvContent = [headers.join(','), ...rows].join('\r\n');

    // 4) Create Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    // name it however you like; e.g. include date
    a.setAttribute('download', `gsl-${this.selectedYear}-registrations.csv`);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // close dropdown
    this.dropdownOpen = false;
  }

  composeBulkEmail() {
    if (!this.filteredData.length) {
      alert(`No registrations found for GSL ${this.selectedYear}.`);
      this.dropdownOpen = false;
      return;
    }

    const recipients = this.filteredData.map((user) => ({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      fullName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      email: user.email ?? '',
      country: user.country ?? '',
      registerDate: user.registerDate ?? '',
      targetGroup: user.targetGroup ?? '',
      amountPaid: user.amountPaid ?? 0,
      amountPaidDollars:
        typeof user.amountPaid === 'number'
          ? (user.amountPaid / 100).toFixed(2)
          : '',
      phone: user.phone ?? '',
      address: user.address ?? '',
      city: user.city ?? '',
      stateProvince: user.stateProvince ?? '',
      age: user.age ?? '',
      organization: user.organization ?? '',
      occupation: user.occupation ?? '',
      whyAttend: user.whyAttend ?? '',
      focusTopic: user.focusTopic ?? '',
      labMode: user.labMode ?? '',
      heardAboutUs: user.heardAboutUs ?? '',
      heardAboutUsOther: user.heardAboutUsOther ?? '',
      gslYear: this.selectedYear,
    }));

    localStorage.setItem(
      this.bulkEmailImportKey,
      JSON.stringify({
        source: 'management-gsl',
        label: `GSL ${this.selectedYear} filtered registrations (${recipients.length})`,
        recipients,
      })
    );

    this.dropdownOpen = false;
    this.router.navigate(['/bulk-emails']);
  }
}
