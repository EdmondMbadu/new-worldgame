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
  logoImage: string = '';
  challengePageId: string = '';
  challengePage: ChallengePage = new ChallengePage();

  private schoolId: string | null = null;
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
  ngOnInit(): void {
    // read sid from query params; fallback to user’s schoolId if exists
    this.activatedRoute.queryParamMap.subscribe((p) => {
      this.schoolId =
        p.get('sid') || (this.auth.currentUser as any)?.schoolId || null;
    });
  }
  toggleHover(event: boolean) {
    this.isHovering = event;
  }

  async startUpload(event: FileList, imageType = '') {
    if (!this.challengePageId) {
      this.challengePageId = this.afs.createId(); // Generate ID only if not already generated
    }

    let subFolder = 'feature'; // Default subfolder
    if (imageType === 'logo') {
      subFolder = 'logo';
    }

    try {
      // example: `challenge-page/<challengePageId>/logo/`
      // or      `challenge-page/<challengePageId>/feature/`
      const filePath = `challenge-page/${this.challengePageId}/${subFolder}`;

      const url = await this.data.startUpload(event, filePath, 'false');

      if (imageType === 'logo') {
        this.logoImage = url!;
      } else {
        this.imageChallenge = url!;
      }
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
      this.logoImage === '' || // Add a check for empty logoImage
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
        logoImage: this.logoImage,
        participants: [this.auth.currentUser.email],
        challengePageId: this.challengePageId,
        restricted: 'true',
        // NEW
        schoolId: this.schoolId || undefined,
        type: 'class',
        createdByUid: this.auth.currentUser.uid,
        createdAt: this.time.getCurrentDate(),
      } as any;

      this.challenge.createChallengePage(this.challengePage).then(async () => {
        // Write a denormalized summary under the school for fast listing
        if (this.schoolId) {
          await this.afs
            .doc(`schools/${this.schoolId}/classes/${this.challengePageId}`)
            .set(
              {
                challengePageId: this.challengePageId,
                name: this.name,
                heading: this.heading,
                logoImage: this.logoImage || null,
                imageChallenge: this.imageChallenge || null,
                createdAt: this.time.getCurrentDate(),
                createdByUid: this.auth.currentUser.uid,
                restricted: true,
              },
              { merge: true }
            );
        }

        this.router.navigate(['/home-challenge', this.challengePageId], {
          queryParams: this.schoolId ? { sid: this.schoolId } : {},
        });
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
    this.logoImage = '';
  }
}
