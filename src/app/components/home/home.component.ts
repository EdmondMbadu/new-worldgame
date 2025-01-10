import { Component, Input, OnInit } from '@angular/core';

import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  user: User;
  titles: string[] = [
    'Revitalizing Urban Green Spaces in Post-Industrial Cities',
    'Mitigating Urban Heat Islands through Strategic Tree Planting',
    'Enhancing Tree Canopy in Underserved Communities',
    'Developing Urban Forestry Education Programs for Youth',
    'Implementing Community-Led Tree Inventory and Mapping',
    'Restoring Urban Riparian Buffers to Improve Water Quality',
    'Creating Pollinator-Friendly Urban Forest Corridors',
    'Establishing Urban Orchards to Address Food Insecurity',
    'Promoting Urban Wood Utilization to Reduce Waste',
    'Assessing and Managing Urban Tree Health Amid Climate Change',
  ];

  descriptions: string[] = [
    'Many post-industrial cities face challenges with vacant lots and deteriorating green spaces. Teams can develop strategies to transform these areas into vibrant urban forests, enhancing community well-being and environmental health.',
    'Urban heat islands contribute to increased energy consumption and health risks. Implementing targeted tree-planting initiatives in heat-prone neighborhoods can provide cooling effects and improve air quality.',
    'Equitable distribution of urban tree canopy is essential for environmental justice. Projects can focus on increasing tree coverage in underserved areas to promote health and social benefits.',
    'Engaging the next generation in urban forestry is crucial for sustainability. Teams can create educational workshops and hands-on planting experiences for local schools.',
    'Accurate data on urban trees aids in effective management. Organizing community volunteers to conduct tree inventories can foster stewardship and inform future planting efforts.',
    'Urban waterways often suffer from pollution and erosion. Planting native trees along streams and rivers can stabilize banks and enhance water quality.',
    'Pollinators are vital for biodiversity. Establishing urban forest corridors with pollinator-friendly species can support local ecosystems and beautify the cityscape.',
    'Urban orchards can provide fresh produce in food deserts. Teams can plan and plant fruit-bearing trees in accessible community spaces.',
    'Urban tree removals often result in waste. Developing programs to repurpose urban wood into furniture or art can reduce landfill use and generate community income.',
    'Climate change poses threats to urban tree health. Conducting assessments and developing management plans can enhance resilience and inform species selection for future plantings.',
  ];
  challengeImages: string[] = [
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-1.webp?alt=media&token=967ce44e-2e67-4c91-b293-ac52bb8d79b5',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-2.webp?alt=media&token=05d6dc53-ad65-4fa5-b5d8-8a91bfd90934',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-3.webp?alt=media&token=d98ab804-6860-4f87-8d2b-f0c969be8ea6',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-4.webp?alt=media&token=21e4d21a-b563-4538-a83c-06b7fcf0250c',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-5.webp?alt=media&token=14aca8f9-09b9-41ba-8c5b-3b76d3ae5153',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-6.webp?alt=media&token=fa6b2138-e8d1-43e4-a837-6ae1e70400e7',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-7.webp?alt=media&token=1ca1476c-73b9-4fbe-9dbc-f3584ba0d733',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-8.webp?alt=media&token=57dcf895-4518-4a34-830d-f603a8a72e9a',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-9.webp?alt=media&token=f3fc0267-3eda-4320-a8f0-fa563059fcc0',
    'https://firebasestorage.googleapis.com/v0/b/new-worldgame.appspot.com/o/challenges%2Fchallenge-10.webp?alt=media&token=c32f824c-a7aa-41da-a651-7bce88b2bf81',
  ];

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
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService
  ) {
    this.user = this.auth.currentUser;
  }
  ngOnInit(): void {
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
    'Forestry',
    'Energy',
    'Climate',
    'Environment',
    'Education',
    'Healthcare',
    'Technology',
    // 'Community',
  ];

  // Define the solutions data

  activeCategory: string = 'Forestry';
  filteredSolutions: Solution[] = [];

  // Set the active category and filter solutions accordingly
  setActiveCategory(category: string): void {
    this.activeCategory = category;
    this.filterSolutions();
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
}
