import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import {
  SlpLane,
  SlpNavItem,
  SlpShellViewModel,
} from 'src/app/services/slp-context.service';

@Component({
  selector: 'app-slp-shell',
  templateUrl: './slp-shell.component.html',
  styleUrls: ['./slp-shell.component.css'],
})
export class SlpShellComponent {
  @Input() activeLane: SlpLane = 'publish';
  @Input() shell!: SlpShellViewModel;
  showUserMenu = false;

  constructor(
    public auth: AuthService,
    private elementRef: ElementRef<HTMLElement>
  ) {}

  isActive(item: SlpNavItem): boolean {
    return item.lane === this.activeLane;
  }

  get currentUser(): User | null {
    return (this.auth.currentUser as User) || null;
  }

  get hasUserMenu(): boolean {
    return !!this.currentUser?.email;
  }

  get profilePicturePath(): string {
    return this.currentUser?.profilePicture?.downloadURL || '';
  }

  get userDisplayName(): string {
    const firstName = this.currentUser?.firstName?.trim() || '';
    const lastName = this.currentUser?.lastName?.trim() || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || this.currentUser?.email || 'Account';
  }

  get userInitials(): string {
    const firstName = this.currentUser?.firstName?.trim() || '';
    const lastName = this.currentUser?.lastName?.trim() || '';
    const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.trim();
    if (initials) {
      return initials.toUpperCase();
    }
    const email = this.currentUser?.email?.trim() || '';
    return email.charAt(0).toUpperCase() || 'A';
  }

  get avatarInitials(): string {
    const source = this.shell?.solutionTitle?.trim() || 'SLP';
    return source
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  toggleUserMenu(): void {
    if (!this.hasUserMenu) {
      return;
    }
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  logOut(): void {
    this.closeUserMenu();
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showUserMenu) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeUserMenu();
  }
}
