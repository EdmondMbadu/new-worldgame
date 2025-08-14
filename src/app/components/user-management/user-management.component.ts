import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css',
})
export class UserManagementComponent implements OnInit {
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService,
    private time: TimeService,
    private data: DataService
  ) {}
  searchTerm: string = '';
  showActionDropDown: boolean = false;
  userDetails: boolean[] = [];
  showSolutions: boolean[] = [];
  userSolutions: Solution[] = [];
  userFinishedSolutions: Solution[] = [];
  userUnfinishedSolutions: Solution[] = [];
  allUsers: User[] = [];
  everySolution: Solution[] = [];
  // component.ts
  solutionTab: ('all' | 'finished' | 'unfinished')[] = [];
  toggleSolutions(email: string, i: number) {
    // Load data first
    this.findSolutionsByEmail(email, i);

    // Toggle ONLY here
    this.showSolutions = this.showSolutions.map(
      (open, idx) => (idx === i ? !open : false) // optional: close others; use just "!open" if you want multiple open
    );

    if (!this.solutionTab[i]) this.solutionTab[i] = 'all';
  }

  setSolutionTab(i: number, tab: 'all' | 'finished' | 'unfinished') {
    this.solutionTab[i] = tab;
  }

  ngOnInit(): void {
    this.auth.getALlUsers().subscribe((data) => {
      this.allUsers = data.sort((a, b) => {
        const dateA = this.data.parseDateMMDDYYYY(a.dateJoined!);
        const dateB = this.data.parseDateMMDDYYYY(b.dateJoined!);
        return dateB - dateA; // descending
      });

      this.userDetails = Array.from(
        { length: this.allUsers.length },
        () => false
      );
      this.showSolutions = Array.from(
        { length: this.allUsers.length },
        () => false
      );

      // fetch solutions
      this.solution.getAllSolutionsFromAllAccounts().subscribe((solutions) => {
        this.everySolution = solutions;
        // do your existing logic for counting solutions, etc.
        for (let user of this.allUsers) {
          let solutionCount = 0;
          let solutionSubmittedCount = 0;
          const normalizedUserEmail = user.email!.trim().toLowerCase();

          for (let sol of this.everySolution) {
            if (sol.participants && Array.isArray(sol.participants)) {
              const isParticipant = sol.participants.some(
                (p: { name: string }) =>
                  p.name.trim().toLowerCase() === normalizedUserEmail
              );
              if (isParticipant) {
                solutionCount++;
                if (sol.finished === 'true') {
                  solutionSubmittedCount++;
                }
              }
            }
          }
          user.tempSolutionstarted = solutionCount.toString();
          user.tempSolutionSubmitted = solutionSubmittedCount.toString();
        }
      });
    });
  }

  // A simple computed property that filters users by the search term.
  get filteredUsers(): User[] {
    if (!this.searchTerm.trim()) {
      return this.allUsers;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.allUsers.filter((user) => {
      const first = user.firstName?.toLowerCase() || '';
      const last = user.lastName?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return (
        first.includes(lowerTerm) ||
        last.includes(lowerTerm) ||
        email.includes(lowerTerm)
      );
    });
  }

  toggleUserDetails(index: number) {
    this.userDetails[index] = !this.userDetails[index];
  }
  public findSolutionsByEmail(email: string, index: number) {
    const normalizedEmail = email.trim().toLowerCase();
    this.userSolutions = this.everySolution.filter(
      (solution) =>
        solution.participants &&
        Array.isArray(solution.participants) &&
        solution.participants.some(
          (participant: { name: string }) =>
            participant.name.trim().toLowerCase() === normalizedEmail
        )
    );
    this.userFinishedSolutions = this.userSolutions.filter(
      (solution) => solution.finished === 'true'
    );
    this.userUnfinishedSolutions = this.userSolutions.filter(
      (solution) => solution.finished !== 'true'
    );

    // ❌ remove this — it caused double toggle
    // this.toggleShowSolution(index);
  }

  toggleActionDropDown() {
    this.showActionDropDown = !this.showActionDropDown;
  }
  downloadCSV(): void {
    // Define the headers for the CSV file
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Date Joined',
      'Goal',
      'Location',
      'Solutions Started',
      'Solutions Submitted',
    ];

    // Map user data to match the headers
    const rows = this.allUsers.map((user) => [
      user.firstName,
      user.lastName,
      user.email,
      user.dateJoined,
      user.goal,
      user.location,
      user.tempSolutionstarted || '0', // Default to '0' if undefined
      user.tempSolutionSubmitted || '0', // Default to '0' if undefined
    ]);

    // Combine headers and rows into CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Create a Blob for the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'user_details.csv');
    link.style.visibility = 'hidden';

    // Append the link, trigger click, and clean up
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  asNum(v: unknown): number {
    if (typeof v === 'number') return v;
    const n = Number(v ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  finishedCount(u: any): number {
    return this.asNum(u?.tempSolutionSubmitted);
  }

  inProgressCount(u: any): number {
    const started = this.asNum(u?.tempSolutionstarted);
    const submitted = this.asNum(u?.tempSolutionSubmitted);
    return Math.max(0, started - submitted);
  }
}
