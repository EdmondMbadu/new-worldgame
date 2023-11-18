import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
})
export class UserProfileComponent implements OnInit {
  id: any = '';
  user: any = {};
  dateJoined: string = '';
  time: any;
  authenticatedUser: User = this.auth.currentUser;
  profilePicturePath?: string = '';
  completedSolutions: Solution[] = [];
  followingThisUser: boolean = false;
  followingArray: string[] = [];

  solutions: Solution[] = [];
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    auth.getAUser(this.id).subscribe((data) => {
      this.user = data;
      this.followingThisUser = this.checkIfFollowing();
      this.solution
        .getAllSolutionsOfThisUser(data?.email!)
        .subscribe((data: any) => {
          this.solutions = data;
          this.findCompletedSolutions();
        });
      if (this.user?.profilePicture && this.user.profilePicture.path) {
        this.profilePicturePath = this.user.profilePicture.downloadURL;
        // console.log('here  iam', this.profilePicturePath);
      }
    });
  }
  ngOnInit(): void {
    if (this.authenticatedUser.followingArray !== undefined) {
      this.followingArray = this.authenticatedUser.followersArray!;
    }
    // this.dateJoined = this.time.getMonthYear(this.user!.dateJoined);
  }

  checkIfFollowing() {
    if (this.user.followersArray === undefined) {
      return false;
    } else if (
      this.user.followersArray.indexOf(this.authenticatedUser.uid) > -1
    ) {
      return true;
    }
    return false;
  }

  followSomeone() {
    // if (this.followingThisUser) {
    //   this.followingArray = this.followingArray.filter((item) => {
    //     item !== this.user.uid;
    //   });
    // }
  }
  findCompletedSolutions() {
    this.completedSolutions = [];
    for (let s of this.solutions) {
      if (s.finished === 'true') {
        this.completedSolutions.push(s);
      }
    }
  }
}
