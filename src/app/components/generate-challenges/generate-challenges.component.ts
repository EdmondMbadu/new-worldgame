import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-generate-challenges',
  templateUrl: './generate-challenges.component.html',
  styleUrl: './generate-challenges.component.css',
})
export class GenerateChallengesComponent implements OnInit {
  heading: string = '';
  name: string = '';
  subHeading: string = '';
  description: string = '';
  isHovering: boolean = false;
  imageChallenge: string = '';
  challengePageId: string = '';
  challengePage: ChallengePage = new ChallengePage();
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private time: TimeService,
    private afs: AngularFirestore,
    private router: Router,
    private challenge: ChallengesService
  ) {}
  ngOnInit(): void {}
  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  async startUpload(event: FileList) {
    if (!this.challengePageId) {
      this.challengePageId = this.afs.createId(); // Generate ID only if not already generated
    }

    try {
      const url = await this.data.startUpload(
        event,
        `challenge-page/${this.challengePageId}`,
        'false'
      );
      this.imageChallenge = url!;
      console.log('The URL is', url);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }

  createChallengePage() {
    if (
      this.name === '' || // Add a check for empty name
      this.heading === '' || // Add a check for empty title
      this.subHeading === '' || // Add a check for empty subtitle
      this.description === '' || // Add a check for empty description
      this.imageChallenge === '' || // Add a check for empty imageChallenge
      this.challengePageId === '' // Add a check for empty challengePageId
    ) {
      alert('Please fill in all fields');
      return;
    } else {
      this.challengePage = {
        name: this.name,
        heading: this.heading,
        subHeading: this.subHeading,
        description: this.description,
        imageChallenge: this.imageChallenge,
        challengePageId: this.challengePageId,
        restricted: 'true',
      };

      this.challenge.createChallengePage(this.challengePage).then(() => {
        this.router.navigate(['/home-challenge/' + this.challengePageId]);
        this.resetChallengePageForm();
      });
    }
  }
  resetChallengePageForm() {
    this.name = '';
    this.heading = '';
    this.subHeading = '';
    this.description = '';
    this.imageChallenge = '';
    this.challengePageId = '';
  }
}
