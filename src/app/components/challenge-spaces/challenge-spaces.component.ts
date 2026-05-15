import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChallengePage } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';

@Component({
  selector: 'app-challenge-spaces',
  templateUrl: './challenge-spaces.component.html',
})
export class ChallengeSpacesComponent implements OnInit, OnDestroy {
  searchTerm = '';
  loading = true;
  challengeSpaces: ChallengePage[] = [];
  private challengeSpacesSub?: Subscription;

  constructor(
    public auth: AuthService,
    private challenges: ChallengesService
  ) {}

  ngOnInit(): void {
    this.challengeSpacesSub = this.challenges.getAllChallengePages().subscribe({
      next: (pages) => {
        this.challengeSpaces = (pages || [])
          .filter((page) => this.isVisibleToCurrentUser(page))
          .sort((a, b) =>
            this.displayTitle(a).localeCompare(this.displayTitle(b))
          );
        this.loading = false;
      },
      error: (error) => {
        console.error('Unable to load challenge spaces', error);
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.challengeSpacesSub?.unsubscribe();
  }

  get joinedSpaces(): ChallengePage[] {
    return this.filteredSpaces.filter((space) => this.isCurrentUserInSpace(space));
  }

  get availableSpaces(): ChallengePage[] {
    return this.filteredSpaces.filter(
      (space) => !this.isCurrentUserInSpace(space) && !space.isPrivate
    );
  }

  get filteredSpaces(): ChallengePage[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) return this.challengeSpaces;

    return this.challengeSpaces.filter((space) =>
      [
        space.name,
        space.heading,
        space.subHeading,
        space.description,
        space.customUrl,
      ]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(query))
    );
  }

  displayTitle(space: ChallengePage): string {
    return (
      String(space.name || space.heading || '').trim() || 'Untitled challenge space'
    );
  }

  displaySubtitle(space: ChallengePage): string {
    return String(space.subHeading || space.description || '').trim();
  }

  routeTarget(space: ChallengePage): string[] {
    return ['/home-challenge', space.challengePageId || space.customUrl || ''];
  }

  imageUrl(space: ChallengePage): string {
    return (
      space.imageChallenge ||
      space.logoImage ||
      'assets/img/earth-triangle-test.png'
    );
  }

  memberCount(space: ChallengePage): number {
    const memberEmails = new Set<string>();

    (space.participants || []).forEach((email) => {
      const normalized = this.normalizeEmail(email);
      if (normalized) memberEmails.add(normalized);
    });

    (space.adminEmails || []).forEach((email) => {
      const normalized = this.normalizeEmail(email);
      if (normalized) memberEmails.add(normalized);
    });

    if (memberEmails.size) return memberEmails.size;

    const memberUids = new Set<string>();
    if (space.authorId) memberUids.add(space.authorId);
    (space.adminUids || []).forEach((uid) => {
      const normalized = String(uid || '').trim();
      if (normalized) memberUids.add(normalized);
    });

    return memberUids.size;
  }

  memberLabel(space: ChallengePage): string {
    const count = this.memberCount(space);
    return `${count} member${count === 1 ? '' : 's'}`;
  }

  isCurrentUserInSpace(space: ChallengePage): boolean {
    const user = this.auth.currentUser;
    const email = this.normalizeEmail(user?.email || '');
    const uid = user?.uid || '';
    const adminEmails = (space.adminEmails || []).map((value: string) =>
      this.normalizeEmail(value)
    );
    const adminUids = (space.adminUids || []).map((value: string) =>
      String(value || '').trim()
    );
    const participants = (space.participants || []).map((value) =>
      this.normalizeEmail(value)
    );

    return (
      (!!uid && space.authorId === uid) ||
      (!!uid && adminUids.includes(uid)) ||
      (!!email && (participants.includes(email) || adminEmails.includes(email)))
    );
  }

  private isVisibleToCurrentUser(space: ChallengePage): boolean {
    return !space.isPrivate || this.isCurrentUserInSpace(space);
  }

  private normalizeEmail(value: string): string {
    return String(value || '').trim().toLowerCase();
  }
}
