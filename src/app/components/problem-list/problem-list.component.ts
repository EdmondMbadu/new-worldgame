import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-problem-list',
  templateUrl: './problem-list.component.html',
  styleUrls: ['./problem-list.component.css'],
})
export class ProblemListComponent {
  @Input() margin = '';
  @Input() path = '/problem-list-view';
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

  @Input() imagesPath: string[] = [
    '../../../assets/img/edmond.png',
    '../../../assets/img/bucky.jpeg',
    '../../../assets/img/medard.jpeg',
  ];
}
