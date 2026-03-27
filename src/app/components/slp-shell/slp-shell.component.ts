import { Component, Input } from '@angular/core';

interface SlpNavItem {
  label: string;
  icon: string;
  route?: string;
  state?: 'complete' | 'active' | 'idle';
}

interface SlpLinkItem {
  label: string;
  icon?: string;
  route?: string;
}

@Component({
  selector: 'app-slp-shell',
  templateUrl: './slp-shell.component.html',
  styleUrls: ['./slp-shell.component.css'],
})
export class SlpShellComponent {
  @Input() activeRoute = '/slp';
  @Input() phase = 'Publish';

  readonly sideNav: SlpNavItem[] = [
    { label: 'Celebrate', icon: 'check_circle', state: 'complete' },
    { label: 'Publish', icon: 'publish', route: '/slp', state: 'active' },
    { label: 'Fund', icon: 'payments', route: '/fund' },
    { label: 'Partner', icon: 'handshake', route: '/partner' },
    { label: 'Archive', icon: 'inventory_2' },
  ];

  readonly quickLinks: SlpLinkItem[] = [
    { label: 'Solution Library', icon: 'menu_book', route: '/blogs/solution-libraries' },
    { label: 'Impact Record', icon: 'insights', route: '/overview' },
    { label: 'Support', icon: 'help_outline', route: '/contact' },
  ];

  readonly topLinks: SlpLinkItem[] = [
    { label: 'Explorer', route: '/overview' },
    { label: 'Library', route: '/blogs/solution-libraries' },
    { label: 'Archive', route: '/archive-pictures' },
  ];

  readonly footerLinks: SlpLinkItem[] = [
    { label: 'Programs', route: '/plans' },
    { label: 'Privacy', route: '/privacy' },
    { label: 'Contact', route: '/contact' },
  ];

  isActive(route?: string): boolean {
    return !!route && route === this.activeRoute;
  }
}
