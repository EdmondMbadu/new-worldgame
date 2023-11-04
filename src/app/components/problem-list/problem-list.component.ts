import { Component, Input } from '@angular/core';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { SolutionService } from 'src/app/services/solution.service';

@Component({
  selector: 'app-problem-list',
  templateUrl: './problem-list.component.html',
  styleUrls: ['./problem-list.component.css'],
})
export class ProblemListComponent {
  @Input() solutions?: Solution[];
  currentUser: User;
  constructor(private solution: SolutionService, public auth: AuthService) {
    this.currentUser = this.auth.currentUser;
  }
  @Input() users: User[] = [];
  @Input() margin = '';
  @Input() path: string = '/problem-feedback';
  @Input() viewAllPath: string = '/problem-list-view';
  @Input() problems: string[] = [
    'World Hunger',
    'Electrifying Africa',
    'Climate Change',
  ];
  @Input() emails: string[] = [
    'mbadungoma@gmailcom',
    'medardgabel@gmail.com',
    'bucky@gmail.com',
  ];

  imagesPath: string = '../../../assets/img/user.png';
}
