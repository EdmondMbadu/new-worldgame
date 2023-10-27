import { Component, Input, OnInit } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { TimeService } from 'src/app/services/time.service';

@Component({
  selector: 'app-solution',
  templateUrl: './solution.component.html',
  styleUrls: ['./solution.component.css'],
})
export class PostComponent implements OnInit {
  @Input() title: string = 'Electrifying Africa';

  avatarNoPicturePath: string = '../../../assets/img/user.png';
  @Input() solution: Solution = {};
  @Input() user: User = {};
  dummyUser: User = { firstName: '', lastName: '', profilePicture: {} };
  excerpt: string = '';
  profilePicture?: string = '';
  constructor(private time: TimeService) {}

  showComments: boolean = false;
  full: boolean = false;
  fullAritcle: string = '';
  timeElapsed: string = '';
  ngOnInit(): void {}

  showLessOrMore() {
    if (this.full) {
      this.full = false;
    } else {
      this.full = true;
    }
  }

  displayComments() {
    if (this.showComments) {
      this.showComments = false;
    } else {
      this.showComments = true;
    }
  }
}
