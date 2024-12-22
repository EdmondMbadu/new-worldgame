// src/app/components/meeting/meeting.component.ts

import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, take } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-meeting',
  templateUrl: './meeting.component.html',
  styleUrls: ['./meeting.component.css'],
})
export class MeetingComponent implements OnInit {
  id: string = '';
  currentSolution: Solution = {};
  solutionTitle: string = '';
  currentUser: User = {};
  meetLink: string = '';
  dark: boolean = true;
  isLoading: boolean = true; // To handle loading state
  authorizedEmails: string[] = []; // Array of authorized emails
  hasRedirected: boolean = false; // Flag to prevent multiple redirects

  constructor(
    public auth: AuthService,
    private activatedRoute: ActivatedRoute,
    private solutionService: SolutionService,
    public data: DataService,
    private router: Router,
    private fns: AngularFireFunctions
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.currentUser;
    this.dark = true;
    const darkModeInitialized = localStorage.getItem('darkModeInitialized');

    if (!darkModeInitialized) {
      // set the default to dark mode if and only if not initialized before
      this.data.darkModeInitial();

      // Mark dark mode as initialized so it doesn't run again
      localStorage.setItem('darkModeInitialized', 'true');
    }

    // Get the solution ID from the route
    this.id = this.activatedRoute.snapshot.paramMap.get('id') || '';

    if (!this.id) {
      // Handle the case where no ID is present
      this.router.navigate(['/']);
      return;
    }

    // Subscribe to the Solution document once using take(1)
    this.solutionService
      .getSolution(this.id)
      .pipe(take(1))
      .subscribe(async (solutionDoc) => {
        if (!solutionDoc) {
          // Handle the case where the solution doesn't exist
          this.router.navigate(['/home']);
          return;
        }

        this.currentSolution = solutionDoc;
        this.solutionTitle = this.currentSolution.title || '';
        console.log('solution title');
        this.getAuthorizedEmails();
        if (this.currentSolution.meetLink) {
          // Meet link already exists
          this.meetLink = this.currentSolution.meetLink;
          this.isLoading = false;
          if (!this.hasRedirected) {
            this.hasRedirected = true;
            this.redirectToMeet();
            this.router.navigate(['/playground-steps/' + this.id]);
          }
        } else {
          // No meet link yet -> create automatically
          try {
            const data: any = await this.createMeetLink(
              this.id,
              this.solutionTitle
            ).toPromise();
            this.meetLink = data.hangoutLink;

            // Update Firestore with the new meet link
            await this.solutionService.updateSolutionMeetLink(
              this.id,
              this.meetLink
            );

            this.isLoading = false;
            // Redirect if not already done
            if (!this.hasRedirected) {
              this.hasRedirected = true;
              this.redirectToMeet();
              this.router.navigate(['/playground-steps/' + this.id]);
            }
          } catch (error) {
            console.error('Error generating Meet link:', error);
            // Optionally, display an error message to the user
            this.isLoading = false;
          }
        }
      });
  }

  // Method to join the meeting
  redirectToMeet(): void {
    if (this.meetLink) {
      window.open(this.meetLink, '_blank');
    }
  }
  createMeetLink(solutionId: string, title: string): Observable<any> {
    const callable = this.fns.httpsCallable('createGoogleMeet');
    return callable({ solutionId, title });
  }
  getAuthorizedEmails() {
    if (this.currentSolution && this.currentSolution.participants) {
      for (const key in this.currentSolution.participants) {
        let participant = this.currentSolution.participants[key];
        let email = Object.values(participant)[0];
        this.authorizedEmails.push(email);
      }
    }
  }
}
