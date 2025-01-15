import { Component, Input, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { map } from 'rxjs/operators';

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
  // Centralized data for all challenges
  challenges: {
    [key: string]: {
      titles: string[];
      descriptions: string[];
      images: string[];
    };
  } = {
    Forestry: {
      titles: [
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
      ],
      descriptions: [
        'Many post-industrial cities face challenges with vacant lots and deteriorating green spaces...',
        'Urban heat islands contribute to increased energy consumption and health risks...',
        'Equitable distribution of urban tree canopy is essential for environmental justice...',
        'Engaging the next generation in urban forestry is crucial for sustainability...',
        'Accurate data on urban trees aids in effective management...',
        'Urban waterways often suffer from pollution and erosion...',
        'Pollinators are vital for biodiversity...',
        'Urban orchards can provide fresh produce in food deserts...',
        'Urban tree removals often result in waste...',
        'Climate change poses threats to urban tree health...',
      ],
      images: [],
    },
    Food: {
      titles: [
        // Duplicating Forestry titles for demonstration
        'Zero Hunger Cities: Urban Farming Revolution',
        'Feeding the Future: Sustainable Agriculture Practices',
        'Closing the Waste Gap: Food Loss and Waste Solutions',
        'Tech for Hunger: Innovations for Food Security',
        'The Protein Puzzle: Sustainable Alternatives',
        'Global Gardens: Local Solutions for Global Hunger',
        'Climate-Smart Food Systems: Adapting to a Changing World',
        'Nourishing the Next Generation: Tackling Childhood Malnutrition',
        'Water for Food: Solving the Irrigation Crisis',
        'Food Justice for All: Equity in Access and Distribution',
        // Add unique titles for Energy if needed...
      ],
      descriptions: [
        `How can cities use vertical farming, rooftop gardens, and urban agriculture to ensure fresh, local
    food for growing populations? This challenge focuses on making cities self-sufficient in food
    production while reducing carbon footprints.`,
        `Global food demand is set to double by 2050. Can your team design scalable solutions for
    regenerative farming, soil health restoration, and eco-friendly pest management to feed the planet
    sustainably?`,
        `One-third of all food produced globally is wasted. What systems, technologies, or community
    models can reduce waste along the supply chain from farms to tables?`,
        `From AI to blockchain, how can emerging technologies improve food distribution, monitor
    supply chains, and predict shortages in vulnerable regions?`,
        `With rising demand for protein, can your team develop solutions like lab-grown meat, insect
farming, or plant-based innovations that are both scalable and nutritious?`,
        `What small-scale, community-based models—like seed banks or micro-farms—can empower
rural communities to grow and access nutritious food?`,
        `Extreme weather events and shifting climate patterns threaten food security. How can we
develop systems that are resilient to droughts, floods, and rising temperatures?`,
        `Millions of children face stunted growth due to lack of nutrients. Can your team design solutions
like fortified foods, educational campaigns, or mobile nutrition clinics to combat this?`,
        `Agriculture accounts for 70% of global freshwater use. How can innovative water-saving
methods, like drip irrigation or desalination, ensure sustainable food production?`,
        `Access to nutritious food is uneven worldwide. Can you create policies, technologies, or social
movements that ensure equal access to affordable, healthy food in underserved communities?`,

        // Add unique descriptions for Energy if needed...
      ],
      images: [],
    },
    Energy: {
      titles: [
        // Duplicating Forestry titles for demonstration
        'Power to the People: Expanding Clean Energy Access',
        'Breaking the Fossil Fuel Cycle: Transitioning to Renewables',
        'Smart Energy Cities: Future-Ready Urban Power',
        'Battery Breakthrough: Storing Renewable Energy',
        'The Hydrogen Revolution: Fuel of the Future',
        'Greener Grids: Modernizing Power Networks',
        'Empowering Transportation: Reducing Fossil Fuels on the Road',
        'Waste Not, Want Not: Turning Waste into Energy',
        'Solar Everywhere: Affordable Panels for All',
        'Cooling the Planet: Energy Without Warming the World',
        // Add unique titles for Energy if needed...
      ],
      descriptions: [
        `Over 700 million people still live without electricity. Can your team design affordable, renewable
energy solutions like solar kits or microgrids to light up off-the-grid communities?`,
        `The world still relies heavily on coal, oil, and gas. What innovative ideas can help us accelerate
the shift to renewable energy sources like wind, solar, and hydropower?`,
        `How can cities reduce energy waste and rely more on renewables? Imagine cities powered by
smart grids, energy-efficient buildings, and electric vehicle networks.`,
        `Renewable energy sources like solar and wind don’t work 24/7. Can your team create new ways
to store energy—like better batteries or other technologies—that make clean power reliable
anytime?`,
        `Hydrogen could power everything from cars to factories. What creative solutions can you design
to produce, store, or use hydrogen in a way that’s clean, safe, and affordable?`,
        `Many power grids are old and wasteful. How can we upgrade them to handle more renewable
energy, reduce outages, and deliver power efficiently?`,
        `Cars, trucks, and planes are big contributors to emissions. Can you design solutions like electric
vehicle charging networks, cleaner fuels, or bike-friendly cities to revolutionize how we get
around?`,
        `Trash and organic waste are piling up, but they could be valuable resources. What systems or
technologies could turn waste into clean energy while reducing pollution?`,
        `Solar power is amazing, but it’s still not available to everyone. Can you come up with ways to
make solar panels cheaper, more efficient, or easier to install—even in hard-to-reach areas?`,
        `Cooling systems like air conditioners use a lot of energy. How can we design efficient cooling
solutions to keep people comfortable without harming the planet?`,

        // Add unique descriptions for Energy if needed...
      ],
      images: [],
    },
    Health: {
      titles: [
        // Duplicating Forestry titles for demonstration
        'Care for All: Expanding Access to Healthcare',
        'Future-Proof Medicine: Tackling Emerging Diseases',
        'Healthy Mothers, Healthy Babies: Ending Preventable Deaths',
        'Mental Health Matters: Breaking the Stigma',
        'Digital Doctor: Technology Transforming Healthcare',
        'Affordable Care Everywhere: Reducing Healthcare Costs',
        'Global Health Equity: Ending Disparities in Care',
        'The Vaccine Challenge: Reaching Every Community',
        'Clean Hands, Healthy Lives: Fighting Infections Worldwide',
        'Aging with Dignity: Healthcare for Older Adults',
        // Add unique titles for Energy if needed...
      ],
      descriptions: [
        `Millions of people around the world can’t access basic healthcare. Can your team create
solutions like mobile clinics, telemedicine tools, or community health programs to bring care to
those who need it most?`,
        `From pandemics to antibiotic resistance, new health threats are constantly emerging. How can
we develop systems, vaccines, or treatments to prepare for the next global health crisis?`,
        `Every year, millions of mothers and newborns die from preventable causes. Can your team
design tools, education programs, or healthcare solutions to save lives during childbirth?`,
        `Mental health care is often overlooked or stigmatized. How can we create better access to
resources, support systems, and awareness campaigns to promote mental well-being?`,
        `How can technologies like AI, apps, or wearables improve diagnosis, treatment, and patient
care? Imagine the future of healthcare powered by innovation!`,
        `High medical costs keep millions from getting care. Can you come up with ideas to make
healthcare affordable, like innovative insurance models, cost-cutting technologies, or
community-based solutions?`,
        `Access to quality healthcare varies greatly depending on where you live. Can your team design
policies, technologies, or systems to ensure everyone gets the care they need, no matter their
background?`,
        `Vaccines save lives, but many people still don’t have access to them. How can we improve
vaccine delivery, storage, or awareness to protect communities from preventable diseases?`,
        `Diseases spread quickly without proper hygiene and sanitation. Can you create low-cost,
effective solutions to promote cleanliness, like portable handwashing stations or education
campaigns?`,
        `The world’s population is aging, and healthcare systems aren’t ready. How can we improve elder
care, from better treatments to innovative support for aging with dignity at home?`,

        // Add unique descriptions for Energy if needed...
      ],
      images: [],
    },
  };

  // Active data to display
  titles: string[] = [];
  descriptions: string[] = [];
  challengeImages: string[] = [];

  updateChallenges(): void {
    const categoryData = this.challenges[this.activeCategory];
    this.titles = categoryData.titles;
    this.descriptions = categoryData.descriptions;
    this.challengeImages = categoryData.images;
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
  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private storage: AngularFireStorage
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
    this.updateChallenges();

    await this.loadCategoryImages(this.activeCategory);
    // Set initial data for the default category
    this.setActiveCategory(this.activeCategory);
  }
  async loadCategoryImages(category: string): Promise<void> {
    // Skip fetching if the category data is already cached
    if (this.categoryImages[category]) {
      return;
    }

    try {
      // Fetch images for the selected category
      await this.fetchImages(
        `challenges/${category.toLowerCase()}`,
        category,
        category.toLowerCase()
      );

      // Cache the fetched images for the category
      this.categoryImages[category] = this.challenges[category]?.images || [];
    } catch (error) {
      console.error(`Error loading images for category ${category}:`, error);
    }
  }
  async fetchImages(
    folderPath: string,
    category: string,
    filePrefix: string
  ): Promise<void> {
    const storageRef = this.storage.ref(folderPath);

    const sortedUrls = await storageRef
      .listAll()
      .pipe(
        map((result) =>
          result.items
            .map((itemRef) => ({
              ref: itemRef,
              name: itemRef.name,
            }))
            .filter((item) => item.name.startsWith(filePrefix)) // Filter files by prefix
            .sort(
              (a, b) =>
                this.extractNumber(a.name, filePrefix) -
                this.extractNumber(b.name, filePrefix)
            )
            .map((sortedItem) => sortedItem.ref.getDownloadURL())
        )
      )
      .toPromise()
      .then((urlPromises: any) => Promise.all(urlPromises));

    // Assign images to the appropriate category
    this.challenges[category].images = sortedUrls;
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
  categories: string[] = ['Forestry', 'Food', 'Energy', 'Health'];

  // Define the solutions data

  activeCategory: string = 'Food';
  filteredSolutions: Solution[] = [];

  // Set the active category and filter solutions accordingly
  // setActiveCategory(category: string): void {
  //   this.activeCategory = category;
  //   this.filterSolutions();
  // }
  async setActiveCategory(category: string) {
    this.activeCategory = category;
    await this.loadCategoryImages(category);

    this.updateChallenges();
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
