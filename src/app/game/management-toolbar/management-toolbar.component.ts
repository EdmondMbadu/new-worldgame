import { Component, Input } from '@angular/core';

interface SubToolLink {
  path: string;
  label: string;
}

@Component({
  selector: 'app-management-toolbar',

  templateUrl: './management-toolbar.component.html',
  styleUrl: './management-toolbar.component.css',
})
export class ManagementToolbarComponent {
  @Input() items: SubToolLink[] = [
    { path: '/user-management', label: 'Sign-Up' },
    { path: '/solution-publication', label: 'Solutions' },
    { path: '/management-primer', label: 'Primer' },
    { path: '/management-gsl-2025', label: 'GSL-2025' },
    { path: '/tournament-management', label: 'Tournaments' },
    { path: '/management-demo', label: 'Demo Sign-ups' },
    { path: '/schools-management', label: 'Schools' },
    { path: '/management-ask', label: 'Questions' },
    { path: '/feedback-management', label: 'NWG Feedback' },
    { path: '/bulk-emails', label: 'Bulk Emails' },
  ];
}
