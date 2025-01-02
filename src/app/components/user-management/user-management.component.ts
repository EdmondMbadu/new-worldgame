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
  showActionDropDown: boolean = false;
  userDetails: boolean[] = [];
  showSolutions: boolean[] = [];
  userSolutions: Solution[] = [];
  userFinishedSolutions: Solution[] = [];
  userUnfinishedSolutions: Solution[] = [];
  allUsers: User[] = [];
  everySolution: Solution[] = [];
  ngOnInit(): void {
    this.auth.getALlUsers().subscribe((data) => {
      this.allUsers = data;
      // console.log('this is all users', this.allUsers);

      // Sort the allUsers array by dateJoined in descending order
      this.allUsers = this.allUsers.sort((a, b) => {
        const dateA = this.data.parseDateMMDDYYYY(a.dateJoined!);
        const dateB = this.data.parseDateMMDDYYYY(b.dateJoined!);
        // console.log('Parsed dates for sorting:', dateA, dateB);
        return dateB - dateA; // Sort in descending order
      });
      this.userDetails = Array.from(
        { length: this.allUsers.length },
        () => false
      );
      this.showSolutions = Array.from(
        { length: this.allUsers.length },
        () => false
      );

      // Fetch all solutions after sorting users
      this.solution.getAllSolutionsFromAllAccounts().subscribe((solutions) => {
        this.everySolution = solutions;

        // Iterate through all users
        for (let user of this.allUsers) {
          let solutionCount = 0;
          let solutionSubmittedCount = 0;

          // Normalize the user's email by trimming spaces and converting to lowercase
          const normalizedUserEmail = user.email!.trim().toLowerCase();

          // Iterate through all solutions to check if the user is a participant
          for (let solution of this.everySolution) {
            if (solution.participants && Array.isArray(solution.participants)) {
              // Check if the user's email is in the participants array
              const isParticipant = solution.participants.some(
                (participant: { name: string }) =>
                  participant.name.trim().toLowerCase() === normalizedUserEmail
              );

              if (isParticipant) {
                solutionCount++; // Increment the count if the user is a participant

                // Check if the solution is submitted (finished is 'true')
                if (solution.finished === 'true') {
                  solutionSubmittedCount++; // Increment the count if the solution is submitted
                }
              }
            }
          }

          // Log the user details along with the number of solutions started and submitted
          console.log(
            user.firstName,
            user.lastName,
            user.email,
            user.dateJoined,
            user.goal,
            solutionCount,
            solutionSubmittedCount
          );
          user.tempSolutionstarted = solutionCount.toString();
          user.tempSolutionSubmitted = solutionSubmittedCount.toString();
        }
      });
    });
  }

  toggleUserDetails(index: number) {
    this.userDetails[index] = !this.userDetails[index];
  }
  public findSolutionsByEmail(email: string, index: number) {
    const normalizedEmail = email.trim().toLowerCase();

    // Filter everySolution to find solutions where the email is included in participants
    this.userSolutions = this.everySolution.filter(
      (solution) =>
        solution.participants &&
        Array.isArray(solution.participants) &&
        solution.participants.some(
          (participant: { name: string }) =>
            participant.name.trim().toLowerCase() === normalizedEmail
        )
    );
    this.userFinishedSolutions = this.userSolutions.filter((solution) => {
      return solution.finished === 'true';
    });
    this.userUnfinishedSolutions = this.userSolutions.filter((solution) => {
      return solution.finished !== 'true';
    });
    console.log('this user solutions', this.userSolutions);

    this.toggleShowSolution(index);
  }
  toggleShowSolution(index: number) {
    this.showSolutions[index] = !this.showSolutions[index];
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
}
