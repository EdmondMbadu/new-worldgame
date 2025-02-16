import { Component, Input, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  user: User;
  // Centralized data for all challenges
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      descriptions: string[];
      images: string[];
    };
  } = {};

  titleChallenge: string = '';
  descriptionChallenge: string = '';
  categoryChallenge: string = '';
  imageChallenge: string = '';
  challengeId: string = '';
  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];
  ids: string[] = [];

  isHovering: boolean = false;
  showAddChallenge: boolean = false;

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

  categoryImages: { [key: string]: string[] } = {};

  showSortByDrowpDown: boolean = false;
  allUsers: User[] = [];
  evaluationSolutions: Solution[] = [];
  evaluationSolutionsUsers: User[] = [];
  allSolutions: Solution[] = [];
  everySolution: Solution[] = [];
  currentUserSolutions: Solution[] = [];
  pendingSolutions: Solution[] = [];
  pendingSolutionsUsers: User[] = [];
  completedSolutionsUsers: User[] = [];
  completedSolutions: Solution[] = [];
  profilePicturePath?: string = '';
  pending: number = 0;
  evaluation: number = 0;
  location: string = '';
  displayPromptLocation: boolean = true;
  isSidebarOpen: boolean = true;
  imageDownloadUrl: string = '';
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private storage: AngularFireStorage,
    private challenge: ChallengesService,
    private router: Router,
    private time: TimeService,
    private afs: AngularFirestore
  ) {
    this.user = this.auth.currentUser;
  }
  async ngOnInit() {
    this.filterSolutions();
    if (this.user && this.user.location) {
      this.displayPromptLocation = false;
    }
    window.scroll(0, 0);
    this.solution.getHomePageSolutions().subscribe((data) => {
      this.allSolutions = data;
      this.findCompletedSolutions();
    });

    this.solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
      // console.log('this is the current user solutions', data);
      this.currentUserSolutions = data;
      this.findPendingSolutions();
    });

    this.solution.getAuthenticatedUserPendingEvaluations().subscribe((data) => {
      this.evaluationSolutions = data.filter((element) => {
        return element.finished !== undefined && element.finished === 'true';
      });

      this.evaluation = this.evaluationSolutions.length;
    });

    if (this.user!.profilePicture && this.user.profilePicture.path) {
      this.profilePicturePath = this.user.profilePicture.downloadURL;
    }
    this.challenge.getAllChallenges().subscribe((challenges: any[]) => {
      const uniqueCategories = Array.from(
        new Set(challenges.map((challenge) => challenge.category))
      );
      // this.categories = uniqueCategories;
      this.fetchChallenges(this.activeCategory);
    });
  }

  fetchChallenges(category: string) {
    this.challenge
      .getChallengesByCategory(category)
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

  extractNumber(filename: string, prefix: string): number {
    const match = filename.match(new RegExp(`${prefix}-(\\d+)`)); // Extract number based on the prefix
    return match ? parseInt(match[1], 10) : 0;
  }

  findAwaitingEvaluationSolutionLength() {}

  findPendingSolutions() {
    this.pendingSolutions = [];

    for (let s of this.currentUserSolutions) {
      if (s.finished === undefined || s.finished === 'false') {
        this.pendingSolutions.push(s);
      }
    }
    this.pending = this.pendingSolutions.length;
  }

  findCompletedSolutions() {
    this.completedSolutions = [];

    for (let s of this.allSolutions) {
      if (s.finished === 'true') {
        this.completedSolutions.push(s);
      }
    }
    // added sorted by number of likes. so that not random solutions appear first
    this.sortByNumLikes('descending');
    this.toggleSortyByDropDown();
  }

  toggleSortyByDropDown() {
    this.showSortByDrowpDown = !this.showSortByDrowpDown;
  }

  sortByNumLikes(order: string) {
    const sortedSolutions = this.completedSolutions.sort((a, b) => {
      // Convert numLikes from string to number
      const likesA = parseInt(a.numLike!, 10);
      const likesB = parseInt(b.numLike!, 10);

      // Compare likes for sorting

      return order === 'ascending' ? likesA - likesB : likesB - likesA;
    });
    this.completedSolutions = sortedSolutions;
    this.toggleSortyByDropDown();
  }
  sortBySubmissionDate(order: string) {
    const sortedSolutions = this.completedSolutions.sort((a, b) => {
      // Correctly parse the submissionDate to a comparable format
      const dateA = new Date(
        a.submissionDate!.replace(
          /(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)/,
          '$3/$1/$2 $4:$5:$6'
        )
      );
      const dateB = new Date(
        b.submissionDate!.replace(
          /(\d+)-(\d+)-(\d+)-(\d+)-(\d+)-(\d+)/,
          '$3/$1/$2 $4:$5:$6'
        )
      );

      // Compare the dates based on the specified order
      return order === 'ascending'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    });

    this.completedSolutions = sortedSolutions;
    this.toggleSortyByDropDown();
  }
  // we might use this part.
  async submitLocation() {
    if (this.location === '') {
      alert('Enter your Location');
      return;
    }
    try {
      await this.data.updateLocation(this.user.uid!, this.location);
      this.closeDisplayPromptLocation();
      // this.ngOnInit();
    } catch (error) {
      console.error('Error updating location:', error);
      // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
    }
  }
  closeDisplayPromptLocation() {
    this.displayPromptLocation = !this.displayPromptLocation;
  }
  async RejectSubmitLocation() {
    try {
      await this.data.updateLocation(this.user.uid!, 'NA');
      this.closeDisplayPromptLocation();
      // this.ngOnInit();
    } catch (error) {
      console.error('Error updating location:', error);
      // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
    }
  }
  categories: string[] = [
    'UN SDG',
    'Climate',
    'Poverty',
    'Energy',
    'Food',
    'Health',
    'Forestry',
  ];
  // Define the solutions data

  activeCategory: string = 'Forestry';
  filteredSolutions: Solution[] = [];

  async setActiveCategory(category: string) {
    this.activeCategory = category;
    // await this.loadCategoryImages(category);
    this.fetchChallenges(category);
    // this.updateChallenges();
  }

  // Filter solutions based on the active category
  filterSolutions(): void {
    if (this.activeCategory === 'All') {
      this.filteredSolutions = this.completedSolutions;
    } else {
      this.filteredSolutions = this.completedSolutions.filter(
        (solution) => solution.category === this.activeCategory
      );
    }
  }
  toggleAside() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }
  toggle(property: 'isSidebarOpen' | 'showAddChallenge') {
    this[property] = !this[property];
  }

  async fetchImagesForCategory(category: string): Promise<string[]> {
    try {
      const folderPath = `challenges/${category.toLowerCase()}`;
      const storageRef = this.storage.ref(folderPath);

      const imageUrls = await storageRef
        .listAll()
        .pipe(
          map((result) =>
            result.items.map((itemRef) => itemRef.getDownloadURL())
          )
        )
        .toPromise()
        .then((urlPromises: any) => Promise.all(urlPromises));

      console.log(`Images fetched for category ${category}:`, imageUrls);
      return imageUrls; // Return fetched images
    } catch (error) {
      console.error(`Error fetching images for category ${category}:`, error);
      return []; // Return an empty array if fetching fails
    }
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
      this.imageChallenge = url!;
      console.log('The URL is', url);
      console.log('The ID is', this.challengeId);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error occurred while uploading file. Please try again.');
    }
  }

  addChallenge() {
    if (
      !this.titleChallenge ||
      !this.descriptionChallenge ||
      !this.categoryChallenge ||
      !this.imageChallenge
    ) {
      alert('Please fill in all required fields before adding the challenge.');
      return;
    }

    const newChallenge = {
      id: this.challengeId,
      title: this.titleChallenge,
      description: this.descriptionChallenge,
      category: this.categoryChallenge,
      image: this.imageChallenge,
    };

    this.challenge
      .addChallenge(newChallenge)
      .then(() => {
        console.log('Challenge added successfully:', newChallenge);

        // Automatically select the added challenge and navigate
        this.selectChallenge();

        // Clear the form fields
        this.challengeId = '';
        this.titleChallenge = '';
        this.descriptionChallenge = '';
        this.categoryChallenge = '';
        this.imageChallenge = '';
      })
      .catch((error) => {
        console.error('Error adding challenge:', error);
      });
  }

  selectChallenge() {
    if (!this.challengeId) {
      console.error('No challenge ID available to select.');
      return;
    }
    const selectedChallengeItem = {
      id: this.challengeId,
      title: this.titleChallenge,
      description: this.descriptionChallenge,
      image: this.imageChallenge,
      restricted: 'false',
    };

    this.challenge.setSelectedChallengeItem(selectedChallengeItem);

    this.router.navigate(['/start-challenge/']);
  }
}
