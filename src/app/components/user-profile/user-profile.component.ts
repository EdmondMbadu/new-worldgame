import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css'],
})
export class UserProfileComponent implements OnInit {
  id: any = '';
  user: any = {};
  dateJoined: string = '';
  followers: string[] = [];
  following: string[] = [];
  authenticatedUser: User = this.auth.currentUser;
  profilePicturePath?: string = '';
  completedSolutions: Solution[] = [];
  followingThisUser: boolean = false;

  solutions: Solution[] = [];
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService,
    private time: TimeService,
    private data: DataService
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    auth.getAUser(this.id).subscribe((data) => {
      this.user = data;
      this.dateJoined = this.time.getMonthYear(this.user.dateJoined!);
      if (this.auth.currentUser.followingArray !== undefined) {
        this.following = this.auth.currentUser.followingArray;
      }
      if (this.user.followersArray !== undefined) {
        this.followers = this.user.followersArray;
      }
      this.checkIfFollowing();

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
  ngOnInit(): void {}

  checkIfFollowing() {
    this.followingThisUser =
      this.followers.indexOf(this.auth.currentUser.uid) > -1;
  }

  followThisUser() {
    this.followers.push(this.auth.currentUser.uid);
    this.following.push(this.user.uid);
    this.checkIfFollowing();
    this.data.updateFollowers(this.user.uid, this.followers);
    this.data.updateFollowing(this.auth.currentUser.uid, this.following);
  }
  UnFollowThisUser() {
    this.followers = this.followers.filter((item) => {
      return item !== this.auth.currentUser.uid;
    });
    this.following = this.following.filter((item) => {
      return item !== this.user.uid;
    });
    this.checkIfFollowing();
    this.data.updateFollowers(this.user.uid, this.followers);
    this.data.updateFollowing(this.auth.currentUser.uid!, this.following);
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
