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

  profilePicturePath?: string = '';
  completedSolutions: Solution[] = [];

  solutions: Solution[] = [];
  constructor(
    private activatedRoute: ActivatedRoute,
    public auth: AuthService,
    private solution: SolutionService
  ) {
    this.id = this.activatedRoute.snapshot.paramMap.get('id');

    auth.getAUser(this.id).subscribe((data) => {
      this.user = data;
      if (this.user?.profilePicture && this.user.profilePicture.path) {
        this.profilePicturePath = this.user.profilePicture.downloadURL;
        // console.log('here  iam', this.profilePicturePath);
      }
    });
    this.solution.getAllSolutionsOfThisUser(this.id).subscribe((data: any) => {
      this.solutions = data;
      this.findCompletedSolutions();
    });
  }
  ngOnInit(): void {
    // this.dateJoined = this.time.getMonthYear(this.user!.dateJoined);
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
