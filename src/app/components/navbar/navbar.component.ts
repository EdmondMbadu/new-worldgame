import { Component, Inject, Input, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { AuthService } from 'src/app/services/auth.service';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { SolutionService } from 'src/app/services/solution.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  @Input() loggedOn: boolean = false;

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
  @Input() currentPagePending: boolean = false;
  @Input() currentPageAbout: boolean = false;
  @Input() currentPageJoinNow: boolean = false;
  @Input() currentPageSignIn: boolean = false;
  @Input() currentPageNews: boolean = false;
  @Input() currentPageTournament: boolean = false;
  profilePicturePath: string = '';
  constructor(
    private auth: AuthService,
    private solution: SolutionService,
    private data: DataService
  ) {}

  @Input() hoveredHomePath: string = ``;
  @Input() hoveredEvaluationPath: string = ``;
  @Input() hoveredTournamentPath: string = ``;
  @Input() hoveredManualPath: string = ``;
  @Input() hoveredPendingPath: string = ``;
  @Input() hoveredStartLabPath: string = ``;
  @Input() hoveredSolutionTourPath: string = ``;
  @Input() hoveredOtherAisPath: string = ``;

  beta: boolean = true;

  ngOnInit(): void {
    // this.applyTheme();
    // this.darkModeInitial();
    const darkModeInitialized = localStorage.getItem('darkModeInitialized');

    if (!darkModeInitialized) {
      // set the default to dark mode if and only if not initialized before
      this.data.darkModeInitial();

      // Mark dark mode as initialized so it doesn't run again
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
  }

  toggle(property: 'beta') {
    this[property] = !this[property];
  }
  toggleAside() {
    this.sideBarBig = !this.sideBarBig;
    this.sideBarSmall = !this.sideBarSmall;
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

  lightMode() {
    localStorage['theme'] = 'light'; // Save to localStorage
    this.applyTheme();
    this.showThemeDropDown = !this.showThemeDropDown;
  }
  darkModeInitial() {
    localStorage['theme'] = 'dark'; // Save to localStorage
    // Save to localStorage

    this.applyTheme();
  }
  darkMode() {
    localStorage['theme'] = 'dark'; // Save to localStorage
    // Save to localStorage

    this.applyTheme();
    this.showThemeDropDown = !this.showThemeDropDown;
  }
  systemMode() {
    localStorage.removeItem('theme');
    this.applyTheme(); // This will now apply the OS preference
    this.showThemeDropDown = !this.showThemeDropDown;
  }
  applyTheme() {
    const userTheme = localStorage.getItem('theme'); // 'light', 'dark', or null
    console.log('theme ', userTheme);
    this.data.setTheme(userTheme);
    // Explicitly check for 'light' and 'dark' settings

    if (userTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (userTheme === 'light') {
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
