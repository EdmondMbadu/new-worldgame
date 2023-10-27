import { Component, Inject, Input, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PageScrollService } from 'ngx-page-scroll-core';
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
  @Input() path: string = '';
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() email: string = '';
  showDropDown: boolean = false;
  allSolutions: Solution[] = [];
  allUsers: User[] = [];
  filteredItems: Solution[] = [];

  constructor(
    private pageScrollService: PageScrollService,
    @Inject(DOCUMENT) private document: any,
    private auth: AuthService,
    private solution: SolutionService,
    private data: DataService
  ) {}

  ngOnInit(): void {
    this.pageScrollService.scroll({
      document: this.document,
      scrollTarget: '.theEnd',
    });
    this.filteredItems = [];

    if (this.email) {
      this.solution.getAllSolutionsFromAllAccounts().subscribe((data) => {
        this.allSolutions = data;
        // this.filteredItems = data;
        // console.log('Oh my', this.filteredItems);
      });
      this.data.getAllUsers().subscribe((data) => {
        this.allUsers = data;
      });
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

  logOut() {
    this.auth.logout();
  }

  toggleDropDown() {
    if (this.showDropDown) {
      this.showDropDown = false;
    } else {
      this.showDropDown = true;
    }
  }

  search(value: string) {
    if (value) {
      const lowerCaseValue = value.toLowerCase();
      return of(
        this.allSolutions.filter(
          (solution) =>
            solution.title?.toLowerCase().includes(lowerCaseValue) ||
            solution.authorName?.toLowerCase().includes(lowerCaseValue)
          // client.amountPaid?.includes(lowerCaseValue)
        )
      );
    } else {
      return of([]);
    }
  }
}
