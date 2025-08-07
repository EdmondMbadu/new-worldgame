import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { FormControl } from '@angular/forms';
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  of,
  switchMap,
} from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { ChallengePage, User } from 'src/app/models/user';
import { SolutionService } from 'src/app/services/solution.service';
import { DataService } from 'src/app/services/data.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { use } from 'marked';
import { SchoolService } from 'src/app/services/school.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit, OnChanges {
  @Input() loggedOn: boolean = false;
  dark: boolean = false;

  @Input() current: string = 'pb-1  border-b-4';
  searchControl = new FormControl();
  showThemeDropDown: boolean = false;
  @Input() path: string = '';
  companyDropDown: boolean = false;
  @Input() colorTheme = '';
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() email: string = '';
  showDropDown: boolean = false;
  allSolutions: Solution[] = [];
  allUsers: User[] = [];
  filteredItems: Solution[] = [];
  displayHamburgerMenu: boolean = true;
  displayHamburgerMenuClose: boolean = false;
  displayHamburgerHomeMenu: boolean = true;
  displayHamburgerHomeMenuClose: boolean = false;
  @Input() currentPageHome: boolean = false;
  resourcesMenu: boolean = false;
  @Input() sideBarBig: boolean = true;
  @Input() sideBarSmall: boolean = false;
  @Input() currentPageEvaluation: boolean = false;
  @Input() currentPageDiscover: boolean = false;
  @Input() currentPagePending: boolean = false;
  @Input() currentPageAbout: boolean = false;
  @Input() currentPageJoinNow: boolean = false;
  @Input() currentPageSignIn: boolean = false;
  @Input() currentPageNews: boolean = false;
  @Input() currentPageTournament: boolean = false;
  @Input() currenPageLabBanner: boolean = true;
  profilePicturePath: string = '';

  hasSchoolAccess = false; // show link for admins OR invited students
  isSchoolAdmin = false;
  schoolRoute: any[] = ['/school-admin'];
  schoolQuery: any = {}; // { sid: '...' } when student only has an invite
  pendingInvitesCount = 0;

  constructor(
    public auth: AuthService,
    private solution: SolutionService,
    private data: DataService,
    private challenge: ChallengesService,
    private schoolService: SchoolService
  ) {}

  @Input() hoveredHomePath: string = ``;
  @Input() hoveredEvaluationPath: string = ``;
  @Input() hoveredTournamentPath: string = ``;
  @Input() hoveredManualPath: string = ``;
  @Input() hoveredPendingPath: string = ``;
  @Input() hoveredStartLabPath: string = ``;
  @Input() hoveredSolutionTourPath: string = ``;
  @Input() hoveredOtherAisPath: string = ``;
  @Input() hoveredSchoolAdmin: string = ``;
  @Input() hoveredDiscoverPath: string = ``;

  beta: boolean = true;
  lab: boolean = true;
  solutionDropDown = false;
  guideDropDown = false;
  @Input() showMoreOrLess!: boolean;
  moreOrLess: string = 'More';
  @Output() showMoreOrLessChange = new EventEmitter<boolean>();
  @Output() toggleAsideEvent = new EventEmitter<void>();

  userChallengePages: ChallengePage[] = [];
  showMyPages: boolean = false; // Control visibility of "My Pages"

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['showMoreOrLess'] &&
      changes['showMoreOrLess'].currentValue !== undefined
    ) {
      this.updateMoreOrLessLabel(changes['showMoreOrLess'].currentValue);
    }
  }

  toggleMoreOrLess() {
    this.showMoreOrLess = !this.showMoreOrLess;
    this.updateMoreOrLessLabel(this.showMoreOrLess);
  }

  private updateMoreOrLessLabel(state: boolean) {
    this.moreOrLess = state ? 'Less' : 'More';
  }

  ngOnInit(): void {
    // this.applyTheme();
    // // this.darkModeInitial();
    this.setThemeModeLogo();

    const darkModeInitialized = localStorage.getItem('darkModeInitialized');

    if (!darkModeInitialized) {
      // set the default to dark mode if and only if not initialized before
      this.data.darkModeInitial();
      console.log('dark mode initializing ...', this.dark);
      // Mark dark mode as initialized so it doesn't run again
      this.dark = true;
      localStorage.setItem('darkModeInitialized', 'true');
    }

    this.filteredItems = [];

    if (this.email) {
      this.solution.getAllSolutionsFromAllAccounts().subscribe((data) => {
        this.allSolutions = data.filter((data) => data.finished === 'true');
      });
      this.data.getAllUsers().subscribe((data) => {
        this.allUsers = data;
      });
      if (
        this.auth.currentUser!.profilePicture &&
        this.auth.currentUser.profilePicture.path
      ) {
        this.profilePicturePath =
          this.auth.currentUser.profilePicture.downloadURL;
      }
    }

    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => this.search(value))
      )
      .subscribe((results) => {
        this.filteredItems = results!;
      });

    // these are the challengePages that this user has if they have any.

    // Combine challenges (authored + participant) without duplicates
    combineLatest([
      this.challenge.getAllChallengePagesByThisUser(),
      this.challenge.getAllChallengesWhereUserIsParticipant(),
    ]).subscribe(([authoredChallenges, participantChallenges]) => {
      // Merge the two arrays
      const merged = [...authoredChallenges, ...participantChallenges];

      // Remove duplicates (assuming ChallengePage has an 'id' property)
      // Option 1: Using Map
      const uniqueChallenges = [
        ...new Map(
          merged.map((challenge) => [challenge.challengePageId, challenge])
        ).values(),
      ];

      // Option 2: Using a Set (if 'id' is guaranteed unique)
      // const uniqueChallenges = Array.from(new Set(merged.map(ch => ch.id)))
      //   .map(id => merged.find(ch => ch.id === id)!);

      this.userChallengePages = uniqueChallenges;
      this.showMyPages = this.userChallengePages.length > 0;
    });

    this.isSchoolAdmin = this.auth.currentUser?.role === 'schoolAdmin';
    // Watch current user & invites to decide link visibility + query param
    // Make isSchoolAdmin reactive to the live user
    this.auth.user$.pipe(filter((u: any) => !!u)).subscribe((u) => {
      this.isSchoolAdmin = u?.role === 'schoolAdmin';

      const email = (u.email || '').toLowerCase().trim();
      const hasSchoolId = !!u.schoolId;

      this.schoolService.getPendingInvitesForEmail(email).subscribe({
        next: (invites: any[]) => {
          this.pendingInvitesCount = invites.length;
          this.hasSchoolAccess =
            this.isSchoolAdmin || hasSchoolId || invites.length > 0;

          // keep your query param logic
          if (hasSchoolId) this.schoolQuery = {};
          else if (invites.length > 0)
            this.schoolQuery = {
              sid: invites[0].id,
            }; // or .schoolId if that's your field
          else this.schoolQuery = {};
        },
        error: (err) => console.error('Invites stream error:', err),
      });
    });
  }

  get schoolNavLabel(): string {
    return this.isSchoolAdmin ? 'School Admin Page' : 'School Dashboard';
  }

  setThemeModeLogo() {
    try {
      if (localStorage.getItem('theme') === 'light') {
        this.dark = false;
      } else {
        this.dark = true;
      }
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
      this.dark = true; // Default to dark mode if localStorage is unavailable
    }
  }

  toggle(
    property:
      | 'beta'
      | 'solutionDropDown'
      | 'guideDropDown'
      | 'showMyPages'
      | 'lab'
  ) {
    this[property] = !this[property];
  }
  toggleAside() {
    this.sideBarBig = !this.sideBarBig;
    this.sideBarSmall = !this.sideBarSmall;
    this.toggleAsideEvent.emit();
  }

  logOut() {
    this.auth.logout();
  }
  toggleCompanyDropDown() {
    this.companyDropDown = !this.companyDropDown;
  }

  toggleHamburger() {
    this.displayHamburgerMenu = !this.displayHamburgerMenu;
    this.displayHamburgerMenuClose = !this.displayHamburgerMenuClose;
  }
  toggleHamburgerHome() {
    this.displayHamburgerHomeMenu = !this.displayHamburgerHomeMenu;
    this.displayHamburgerHomeMenuClose = !this.displayHamburgerHomeMenuClose;
  }
  toggleResourcesMenuPhone() {
    this.resourcesMenu = !this.resourcesMenu;
  }

  toggleDropDown() {
    this.showDropDown = !this.showDropDown;
  }
  toggleDropDownTheme() {
    this.showThemeDropDown = !this.showThemeDropDown;
  }

  search(value: string) {
    if (value) {
      const lowerCaseValue = value.toLowerCase();
      return of(
        this.allSolutions.filter(
          (solution) =>
            solution.title?.toLowerCase().includes(lowerCaseValue) ||
            solution.authorName?.toLowerCase().includes(lowerCaseValue)
        )
      );
    } else {
      return of([]);
    }
  }

  // lightMode() {
  //   localStorage['theme'] = 'light'; // Save to localStorage
  //   this.applyTheme();
  //   this.dark = false;
  //   // this.showThemeDropDown = !this.showThemeDropDown;
  // }
  // darkModeInitial() {
  //   localStorage['theme'] = 'dark'; // Save to localStorage
  //   // Save to localStorage

  //   this.applyTheme();
  //   this.dark = true;
  // }
  // darkMode() {
  //   localStorage['theme'] = 'dark'; // Save to localStorage
  //   // Save to localStorage

  //   this.applyTheme();
  //   this.dark = true;
  //   // this.showThemeDropDown = !this.showThemeDropDown;
  // }
  lightMode() {
    try {
      localStorage.setItem('theme', 'light');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }
    this.applyTheme();
    this.dark = false;
  }

  darkMode() {
    try {
      localStorage.setItem('theme', 'dark');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }
    this.applyTheme();
    this.dark = true;
  }

  darkModeInitial() {
    try {
      localStorage.setItem('theme', 'dark');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }
    this.applyTheme();
    this.dark = true;
  }

  // systemMode() {
  //   localStorage.removeItem('theme');
  //   this.applyTheme(); // This will now apply the OS preference
  //   this.showThemeDropDown = !this.showThemeDropDown;
  // }
  systemMode() {
    try {
      localStorage.removeItem('theme');
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }
    this.applyTheme();
    this.showThemeDropDown = !this.showThemeDropDown;
  }

  // applyTheme() {
  //   const userTheme = localStorage.getItem('theme'); // 'light', 'dark', or null
  //   console.log('theme ', userTheme);
  //   this.data.setTheme(userTheme);
  //   // Explicitly check for 'light' and 'dark' settings

  //   if (userTheme === 'dark') {
  //     this.dark = true;
  //     document.documentElement.classList.add('dark');
  //   } else if (userTheme === 'light') {
  //     this.dark = false;
  //     document.documentElement.classList.remove('dark');
  //   } else {
  //     // Apply OS preference only if no user preference is set
  //     const osPrefersDark = window.matchMedia(
  //       '(prefers-color-scheme: dark)'
  //     ).matches;
  //     if (osPrefersDark) {
  //       document.documentElement.classList.add('dark');
  //     } else {
  //       document.documentElement.classList.remove('dark');
  //       document.documentElement.classList.add('light');
  //     }
  //   }
  // }

  applyTheme() {
    let userTheme = null;
    try {
      userTheme = localStorage.getItem('theme'); // 'light', 'dark', or null
    } catch (error) {
      console.warn('Access to localStorage denied:', error);
    }

    console.log('theme ', userTheme);
    this.data.setTheme(userTheme);

    if (userTheme === 'dark') {
      this.dark = true;
      document.documentElement.classList.add('dark');
    } else if (userTheme === 'light') {
      this.dark = false;
      document.documentElement.classList.remove('dark');
    } else {
      // Apply OS preference only if no user preference is set
      const osPrefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (osPrefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }
}
