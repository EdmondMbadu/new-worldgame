import { Component, Inject, Input, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { PageScrollService } from 'ngx-page-scroll-core';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css'],
})
export class NavbarComponent implements OnInit {
  @Input() loggedOn: boolean = false;

  @Input() current: string = 'pb-1  border-b-4';

  @Input() path: string = '';
  @Input() firstName: string = '';
  @Input() lastName: string = '';
  @Input() email: string = '';
  showDropDown: boolean = false;

  constructor(
    private pageScrollService: PageScrollService,
    @Inject(DOCUMENT) private document: any,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.pageScrollService.scroll({
      document: this.document,
      scrollTarget: '.theEnd',
    });
  }

  logOut() {
    this.auth.logout();
  }

  toggleDropDown() {
    console.log('current dropdown value', this.showDropDown);
    if (this.showDropDown) {
      this.showDropDown = false;
    } else {
      this.showDropDown = true;
    }
  }
}
