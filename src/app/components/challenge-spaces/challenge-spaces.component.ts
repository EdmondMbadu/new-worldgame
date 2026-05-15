import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { ChallengePage, User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { PresenceService } from 'src/app/services/presence.service';

interface ChallengeSpaceMember {
  uid: string;
  lastActiveAt?: string;
}

@Component({
  selector: 'app-challenge-spaces',
  templateUrl: './challenge-spaces.component.html',
})
export class ChallengeSpacesComponent implements OnInit, OnDestroy {
  searchTerm = '';
  loading = true;
  challengeSpaces: ChallengePage[] = [];
  onlineUids = new Set<string>();
  private memberUsersByEmail = new Map<string, ChallengeSpaceMember | null>();
  private memberUidsBySpace = new Map<string, string[]>();
  private memberLastActiveByUid = new Map<string, string | undefined>();
  private challengeSpacesSub?: Subscription;
  private presenceSub?: Subscription;

  constructor(
    public auth: AuthService,
    private challenges: ChallengesService,
    private presence: PresenceService
  ) {}

  ngOnInit(): void {
    this.challengeSpacesSub = this.challenges.getAllChallengePages().subscribe({
      next: (pages) => {
        this.challengeSpaces = (pages || [])
          .filter((page) => this.isVisibleToCurrentUser(page))
          .sort((a, b) =>
            this.displayTitle(a).localeCompare(this.displayTitle(b))
          );
        void this.refreshPresenceForSpaces();
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
    this.presenceSub?.unsubscribe();
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

  onlineCount(space: ChallengePage): number {
    return (this.memberUidsBySpace.get(this.spaceKey(space)) || []).filter((uid) =>
      this.onlineUids.has(uid)
    ).length;
  }

  onlineLabel(space: ChallengePage): string {
    const count = this.onlineCount(space);
    return `${count} online`;
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

  private async refreshPresenceForSpaces(): Promise<void> {
    const emails = Array.from(
      new Set(
        this.challengeSpaces
          .flatMap((space) => this.memberEmails(space))
          .map((email) => this.normalizeEmail(email))
          .filter(Boolean)
      )
    );

    await Promise.all(emails.map((email) => this.resolveMemberByEmail(email)));

    const allUids = new Set<string>();
    this.memberUidsBySpace.clear();
    this.memberLastActiveByUid.clear();

    this.challengeSpaces.forEach((space) => {
      const uids = new Set<string>();

      this.memberEmails(space).forEach((email) => {
        const member = this.memberUsersByEmail.get(this.normalizeEmail(email));
        if (!member?.uid) return;
        uids.add(member.uid);
        this.memberLastActiveByUid.set(member.uid, member.lastActiveAt);
      });

      if (space.authorId) uids.add(space.authorId);
      (space.adminUids || []).forEach((uid) => {
        const normalized = String(uid || '').trim();
        if (normalized) uids.add(normalized);
      });

      const uidList = Array.from(uids);
      this.memberUidsBySpace.set(this.spaceKey(space), uidList);
      uidList.forEach((uid) => allUids.add(uid));
    });

    this.presenceSub?.unsubscribe();
    this.presenceSub = this.presence
      .watchOnlineUids$(Array.from(allUids), this.memberLastActiveByUid)
      .subscribe((onlineUids) => {
        this.onlineUids = onlineUids;
      });
  }

  private async resolveMemberByEmail(
    email: string
  ): Promise<ChallengeSpaceMember | null> {
    const normalizedEmail = this.normalizeEmail(email);
    if (this.memberUsersByEmail.has(normalizedEmail)) {
      return this.memberUsersByEmail.get(normalizedEmail) || null;
    }

    const currentUserEmail = this.normalizeEmail(this.auth.currentUser?.email || '');
    const currentUid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    if (normalizedEmail && normalizedEmail === currentUserEmail && currentUid) {
      const member = {
        uid: currentUid,
        lastActiveAt: new Date().toISOString(),
      };
      this.memberUsersByEmail.set(normalizedEmail, member);
      return member;
    }

    try {
      let users = await firstValueFrom(this.auth.getUserFromEmail(email));
      if (!users?.length && normalizedEmail !== email) {
        users = await firstValueFrom(this.auth.getUserFromEmail(normalizedEmail));
      }

      const user = users?.[0] as User | undefined;
      const member = user?.uid
        ? {
            uid: user.uid,
            lastActiveAt: user.lastActiveAt,
          }
        : null;
      this.memberUsersByEmail.set(normalizedEmail, member);
      return member;
    } catch {
      this.memberUsersByEmail.set(normalizedEmail, null);
      return null;
    }
  }

  private memberEmails(space: ChallengePage): string[] {
    return Array.from(
      new Set(
        [...(space.participants || []), ...(space.adminEmails || [])]
          .map((email) => this.normalizeEmail(email))
          .filter(Boolean)
      )
    );
  }

  private spaceKey(space: ChallengePage): string {
    return space.challengePageId || space.customUrl || this.displayTitle(space);
  }

  private normalizeEmail(value: string): string {
    return String(value || '').trim().toLowerCase();
  }
}
