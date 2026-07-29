import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Solution } from 'src/app/models/solution';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { SolutionService } from 'src/app/services/solution.service';
import {
  isSolutionOwner,
  solutionOwnerIdentity,
} from 'src/app/utils/solution-ownership';

@Component({
    selector: 'app-problem-list',
    templateUrl: './problem-list.component.html',
    styleUrls: ['./problem-list.component.css'],
    standalone: false
})
export class ProblemListComponent {
  @Input() solutions?: Solution[] = [];
  currentUser: User;
  constructor(
    private solution: SolutionService,
    public auth: AuthService,
    public data: DataService,
    private router: Router
  ) {
    this.currentUser = this.auth.currentUser;
  }
  confirmationDeleteSolution: boolean = false;

  @Input() users: User[] = [];
  @Input() margin = '';
  @Input() home: boolean = false;
  @Input() memberCountBySolutionId = new Map<string, number>();
  @Input() onlineCountBySolutionId = new Map<string, number>();

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
  @Output() deleteSolutionEvent = new EventEmitter<Solution>();
  @Output() leaveSolutionEvent = new EventEmitter<Solution>();

  sendDeleteConfirmation(currentSolution: Solution) {
    this.deleteSolutionEvent.emit(currentSolution);
  }

  sendLeaveSolutionConfirmation(currentSolution: Solution) {
    this.leaveSolutionEvent.emit(currentSolution);
  }
  imagesPath: string = '../../../assets/img/user.png';

  isAuthorOfSolution(solution: Solution): boolean {
    return isSolutionOwner(solution, this.auth.currentUser);
  }

  memberLabel(solution: Solution): string {
    const count =
      this.memberCountBySolutionId.get(this.solutionKey(solution)) ??
      this.participantCount(solution);
    return `${count} member${count === 1 ? '' : 's'}`;
  }

  onlineLabel(solution: Solution): string {
    const count = this.onlineCountBySolutionId.get(this.solutionKey(solution)) || 0;
    return `${count} online`;
  }

  private participantCount(solution: Solution): number {
    const emails = new Set<string>();
    const addEmail = (value: any) => {
      const email = String(value?.name || value?.email || value || '')
        .trim()
        .toLowerCase();
      if (email) emails.add(email);
    };

    if (Array.isArray(solution.participants)) {
      solution.participants.forEach(addEmail);
    } else if (solution.participants && typeof solution.participants === 'object') {
      Object.values(solution.participants).forEach(addEmail);
    }
    (solution.participantsHolder || []).forEach(addEmail);
    addEmail(solutionOwnerIdentity(solution)?.authorEmail);

    return emails.size || (solutionOwnerIdentity(solution) ? 1 : 0);
  }

  private solutionKey(solution: Solution): string {
    return solution.solutionId || solution.title || '';
  }
}
