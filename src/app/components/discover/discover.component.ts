import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.component.html',
  styleUrl: './discover.component.css',
})
export class DiscoverComponent implements OnInit {
  user: User | null = null; // <-- nullable

  get isLoggedIn(): boolean {
    // <-- handy getter if you need it later
    return !!this.auth?.currentUser;
  }
  // Centralized data for all challenges
  challenges: {
    [key: string]: {
      ids?: string[];
      titles: string[];
      descriptions: string[];
      images: string[];
    };
  } = {};
  // add near the other class fields
  categories: string[] = [
    'All', // ➊ will show everything
    'UN SDG',
    'Climate',
    'Poverty',
    'Energy',
    'Food',
    'Health',
    'Forestry',
  ];
  private readonly categoryLabelKeyMap: Record<string, string> = {
    All: 'discover.categories.all',
    'UN SDG': 'discover.categories.unSdg',
    Climate: 'discover.categories.climate',
    Poverty: 'discover.categories.poverty',
    Energy: 'discover.categories.energy',
    Food: 'discover.categories.food',
    Health: 'discover.categories.health',
    Forestry: 'discover.categories.forestry',
  };
  activeCategory = 'All'; // ➋ currently‑selected category

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
    private router: Router,
    private time: TimeService,
    private afs: AngularFirestore
  ) {
    this.user = this.auth.currentUser;
  }
  async ngOnInit() {
    // If logged in AND has a location, hide the prompt. Guests shouldn’t see it.
    this.displayPromptLocation = !!this.user?.location;

    window.scroll(0, 0);

    // Public content (safe for guests)
    this.solution.getHomePageSolutions().subscribe((data) => {
      this.allSolutions = data;
      this.findCompletedSolutions();
      for (const s of this.allSolutions) {
        if (s.category && !this.categories.includes(s.category)) {
          this.categories.push(s.category);
        }
      }
    });

    // Auth-only streams — subscribe only if logged in
    if (this.user) {
      this.solution.getAuthenticatedUserAllSolutions().subscribe((data) => {
        this.currentUserSolutions = data;
        this.findPendingSolutions();
      });

      this.solution
        .getAuthenticatedUserPendingEvaluations()
        .subscribe((data) => {
          this.evaluationSolutions = data.filter(
            (element) =>
              element.finished !== undefined && element.finished === 'true'
          );
          this.evaluation = this.evaluationSolutions.length;
        });

      if (this.user.profilePicture?.path) {
        this.profilePicturePath = this.user.profilePicture.downloadURL;
      }
    }
  }

  extractNumber(filename: string, prefix: string): number {
    const match = filename.match(new RegExp(`${prefix}-(\\d+)`)); // Extract number based on the prefix
    return match ? parseInt(match[1], 10) : 0;
  }
  /* ➍ called by the buttons */
  setActiveCategory(cat: string) {
    this.activeCategory = cat;
    window.scroll(0, 0); // optional UX touch
  }

  /* ➎ helper used by the template */
  get filteredCompletedSolutions(): Solution[] {
    if (this.activeCategory === 'All') return this.completedSolutions;
    return this.completedSolutions.filter(
      (s) =>
        (s.category || '').toLowerCase() === this.activeCategory.toLowerCase()
    );
  }

  getCategoryLabel(category: string): string {
    return this.categoryLabelKeyMap[category] || category;
  }

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
    if (!this.user?.uid) return; // guest: ignore or show a toast
    if (this.location === '') {
      alert('Enter your Location');
      return;
    }
    try {
      await this.data.updateLocation(this.user.uid, this.location);
      this.closeDisplayPromptLocation();
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }

  async RejectSubmitLocation() {
    if (!this.user?.uid) return; // guest: ignore
    try {
      await this.data.updateLocation(this.user.uid, 'NA');
      this.closeDisplayPromptLocation();
    } catch (err) {
      console.error('Error updating location:', err);
    }
  }

  closeDisplayPromptLocation() {
    this.displayPromptLocation = !this.displayPromptLocation;
  }
  // async RejectSubmitLocation() {
  //   try {
  //     await this.data.updateLocation(this.user!.uid!, 'NA');
  //     this.closeDisplayPromptLocation();
  //     // this.ngOnInit();
  //   } catch (error) {
  //     console.error('Error updating location:', error);
  //     // Optionally, you can add more error handling logic here, such as displaying an error message to the user.
  //   }
  // }

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
}
