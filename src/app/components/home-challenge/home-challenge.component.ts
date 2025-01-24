import { Component } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-home-challenge',
  templateUrl: './home-challenge.component.html',
  styleUrl: './home-challenge.component.css',
})
export class HomeChallengeComponent {
  titleCreateChallenge: string = '';
  imageCreateChallenge: string = '';
  descriptionCreateChallenge: string = '';
  categoryCreateChallenge: string = '';

  isSidebarOpen = false;
  heading: string = '';
  subHeading: string = '';
  image: string = '';
  showAddChallenge: boolean = false;
  challengePage: ChallengePage = new ChallengePage();
  challengePageId?: any = '';
  categories: string[] = [];
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      descriptions: string[];
      images: string[];
    };
  } = {};
  challengeId: string = '';
  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];
  ids: string[] = [];

  isHovering: boolean = false;

  activeCategory: string = '';
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private router: Router,
    private solution: SolutionService,
    private data: DataService,
    private time: TimeService,
    private afs: AngularFirestore,
    private challenge: ChallengesService
  ) {}
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.challengePageId = this.activatedRoute.snapshot.paramMap.get('id');
    console.log('the current user is ', this.auth.currentUser);
    this.challenge
      .getChallengePageById(this.challengePageId)
      .subscribe((data: any) => {
        this.challengePage = data;
        this.heading = this.challengePage.heading!;
        this.subHeading = this.challengePage.subHeading!;
        this.image = this.challengePage.imageChallenge!;
        this.challenge
          .getThisUserChallenges()
          .subscribe((challenges: any[]) => {
            const uniqueCategories = Array.from(
              new Set(challenges.map((challenge) => challenge.category))
            );
            this.categories = uniqueCategories;
            this.activeCategory = this.categories[0];
            this.fetchChallenges(this.activeCategory);
          });

        console.log('The challenge page is', this.challengePage);
      });
  }
  get isAuthorPage(): boolean {
    return this.challengePage.authorId === this.auth.currentUser.uid;
  }
  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  async setActiveCategory(category: string) {
    this.activeCategory = category;
    this.fetchChallenges(category);
    this.updateChallenges();
  }

  fetchChallenges(category: string) {
    // only fetch challenges if the category is present and not an empty string
    if (!category) {
      console.warn('No category provided to fetch challenges.');
      return;
    }
    this.challenge
      .getUserChallengesByCategory(category)
      .subscribe((data: any[]) => {
        // Transform the array into the expected format
        const transformedData = {
          ids: data.map((challenge) => challenge.id),
          titles: data.map((challenge) => challenge.title),
          descriptions: data.map((challenge) => challenge.description),
          images: data.map(
            (challenge) => challenge.image || 'No image available'
          ),
        };
        this.challenges[category] = transformedData; // Assign to the challenges object
        // console.log(
        //   `Challenges for category ${category}:`,
        //   this.challenges[category]
        // );
        this.updateChallenges(); // Update the active challenge display
      });
  }
  updateChallenges(): void {
    const categoryData = this.challenges[this.activeCategory];
    if (!categoryData) {
      console.warn(`No challenges found for category: ${this.activeCategory}`);
      this.titles = [];
      this.descriptions = [];
      this.challengeImages = [];
      this.ids = [];
      return;
    }
    this.titles = categoryData.titles;
    this.descriptions = categoryData.descriptions;
    this.challengeImages = categoryData.images;
    this.ids = categoryData.ids!;
  }
  toggle(property: 'isSidebarOpen' | 'showAddChallenge') {
    this[property] = !this[property];
  }

  // deleteChallengePage() {
  //   if (!confirm('Are you sure you want to delete this challenge page?')) {
  //     return;
  //   }
  //   this.challenge
  //     .deleteChallengePage(this.challengePageId)
  //     .then(() => {
  //       console.log('Challenge page deleted successfully.');
  //       this.router.navigate(['/home']);
  //     })
  //     .catch((error) => {
  //       console.error('Error deleting challenge page:', error);
  //       alert(
  //         'There was an error while deleting the challenge page. Try again.'
  //       );
  //     });
  // }
  deleteChallengePage() {
    if (
      !confirm(
        'Are you sure you want to delete this challenge page and all associated user challenges?'
      )
    ) {
      return;
    }

    const batch = this.afs.firestore.batch();
    const challengePageRef = this.afs.doc(
      `challengePages/${this.challengePageId}`
    ).ref;

    // Delete the challenge page
    batch.delete(challengePageRef);

    // Fetch and delete all user challenges where `authorId` matches the current user ID
    const userId = this.auth.currentUser.uid;
    this.afs
      .collection('user-challenges', (ref) =>
        ref.where('authorId', '==', userId)
      )
      .get()
      .subscribe((snapshot) => {
        snapshot.forEach((doc) => {
          batch.delete(doc.ref); // Add each user challenge document to the batch
        });

        // Commit the batch
        batch
          .commit()
          .then(() => {
            console.log(
              'Challenge page and related user challenges deleted successfully.'
            );
            this.router.navigate(['/home']);
          })
          .catch((error) => {
            console.error(
              'Error deleting challenge page or related challenges:',
              error
            );
            alert(
              'There was an error while deleting the challenge page. Try again.'
            );
          });
      });
  }

  toggleHover(event: boolean) {
    this.isHovering = event;
  }
  async startUpload(event: FileList) {
    if (!this.challengeId) {
      this.challengeId = this.afs.createId(); // Generate ID only if not already generated
    }

    try {
      const url = await this.data.startUpload(
        event,
        `challenges/${this.challengeId}`,
        'false'
      );
      this.imageCreateChallenge = url!;
      console.log('The URL is', url);
      console.log('The ID is', this.challengeId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }
  addCreateChallenge() {
    if (
      !this.titleCreateChallenge ||
      !this.descriptionCreateChallenge ||
      !this.categoryCreateChallenge ||
      !this.imageCreateChallenge
    ) {
      alert('Please fill in all required fields before adding the challenge.');
      return;
    }

    const newChallenge = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      category: this.categoryCreateChallenge,
      image: this.imageCreateChallenge,
      authordId: this.auth.currentUser.uid,
    };

    this.challenge
      .addUserChallenge(newChallenge)
      .then(() => {
        console.log('Challenge added successfully:', newChallenge);

        // Automatically select the added challenge and navigate
        this.selectChallenge();

        // Clear the form fields
        this.resetCreateChallengeInfo();
      })
      .catch((error) => {
        console.error('Error adding challenge:', error);
      });
  }

  resetCreateChallengeInfo() {
    this.titleCreateChallenge = '';
    this.descriptionCreateChallenge = '';
    this.categoryCreateChallenge = '';
    this.imageCreateChallenge = '';
  }
  selectChallenge() {
    if (!this.challengeId) {
      console.error('No challenge ID available to select.');
      return;
    }
    const selectedChallengeItem = {
      id: this.challengeId,
      title: this.titleCreateChallenge,
      description: this.descriptionCreateChallenge,
      image: this.imageCreateChallenge,
      restricted: 'true',
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }
}
