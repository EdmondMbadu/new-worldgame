import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { ChallengeJoinRequest, ChallengePage, User } from 'src/app/models/user';
import { AuthService } from 'src/app/services/auth.service';
import { ChallengesService } from 'src/app/services/challenges.service';
import { PresenceService } from 'src/app/services/presence.service';
import { ToastService } from 'src/app/services/toast.service';

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
  joinRequests: ChallengeJoinRequest[] = [];
  myJoinRequests: ChallengeJoinRequest[] = [];
  featuredSpaceId = '';
  selectedRequestSpace: ChallengePage | null = null;
  requestMessage = '';
  requestError = '';
  submittingRequest = false;
  processingRequestIds = new Set<string>();
  onlineUids = new Set<string>();
  private memberUsersByEmail = new Map<string, ChallengeSpaceMember | null>();
  private memberUidsBySpace = new Map<string, string[]>();
  private memberLastActiveByUid = new Map<string, string | undefined>();
  private challengeSpacesSub?: Subscription;
  private featuredSpaceSub?: Subscription;
  private joinRequestsSub?: Subscription;
  private myJoinRequestsSub?: Subscription;
  private presenceSub?: Subscription;

  constructor(
    public auth: AuthService,
    private challenges: ChallengesService,
    private presence: PresenceService,
    private toast: ToastService
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

    this.featuredSpaceSub = this.challenges
      .getFeaturedChallengeSpaceConfig()
      .subscribe({
        next: (config) => {
          this.featuredSpaceId = config?.featuredSpaceId || '';
        },
        error: (error) => {
          console.error('Unable to load featured challenge space', error);
        },
      });

    this.joinRequestsSub = this.challenges.getChallengeJoinRequests().subscribe({
      next: (requests) => {
        this.joinRequests = requests || [];
      },
      error: (error) => {
        console.error('Unable to load challenge join requests', error);
      },
    });

    this.myJoinRequestsSub = this.challenges
      .getMyChallengeJoinRequests()
      .subscribe({
        next: (requests) => {
          this.myJoinRequests = requests || [];
        },
        error: (error) => {
          console.error('Unable to load your challenge join requests', error);
        },
      });
  }

  ngOnDestroy(): void {
    this.challengeSpacesSub?.unsubscribe();
    this.featuredSpaceSub?.unsubscribe();
    this.joinRequestsSub?.unsubscribe();
    this.myJoinRequestsSub?.unsubscribe();
    this.presenceSub?.unsubscribe();
  }

  get joinedSpaces(): ChallengePage[] {
    return this.filteredSpacesWithoutFeatured.filter((space) =>
      this.isCurrentUserInSpace(space)
    );
  }

  get availableSpaces(): ChallengePage[] {
    return this.filteredSpacesWithoutFeatured.filter(
      (space) => !this.isCurrentUserInSpace(space) && !space.isPrivate
    );
  }

  get featuredSpace(): ChallengePage | null {
    if (!this.featuredSpaceId) {
      return null;
    }

    return (
      this.filteredSpaces.find((space) => this.isFeaturedSpace(space)) || null
    );
  }

  get filteredSpacesWithoutFeatured(): ChallengePage[] {
    return this.filteredSpaces.filter((space) => !this.isFeaturedSpace(space));
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

  featuredActionLabel(space: ChallengePage): string {
    if (this.isCurrentUserInSpace(space)) {
      return 'Open featured space';
    }

    return this.requestButtonLabel(space);
  }

  routeTarget(space: ChallengePage): string[] {
    return ['/home-challenge', space.challengePageId || space.customUrl || ''];
  }

  adminPendingRequests(): ChallengeJoinRequest[] {
    const adminSpaces = new Map(
      this.challengeSpaces
        .filter((space) => this.isCurrentUserAdminForSpace(space))
        .map((space) => [this.spaceKey(space), space])
    );

    return (this.joinRequests || [])
      .filter((request) => adminSpaces.has(request.challengePageId))
      .sort((a, b) =>
        this.requestDateMs(b.createdAt) - this.requestDateMs(a.createdAt)
      );
  }

  requestSpaceTitle(request: ChallengeJoinRequest): string {
    const space = this.challengeSpaces.find(
      (item) => this.spaceKey(item) === request.challengePageId
    );
    return space ? this.displayTitle(space) : request.challengePageTitle;
  }

  requestButtonLabel(space: ChallengePage): string {
    const status = this.myRequestStatus(space);
    if (status === 'pending') return 'Request pending';
    if (status === 'accepted') return 'Accepted';
    return 'Request to join';
  }

  canRequestToJoin(space: ChallengePage): boolean {
    return this.myRequestStatus(space) !== 'pending';
  }

  openJoinRequest(space: ChallengePage): void {
    if (!this.canRequestToJoin(space)) {
      return;
    }

    this.selectedRequestSpace = space;
    this.requestMessage = '';
    this.requestError = '';
  }

  closeJoinRequest(): void {
    if (this.submittingRequest) {
      return;
    }

    this.selectedRequestSpace = null;
    this.requestMessage = '';
    this.requestError = '';
  }

  async submitJoinRequest(): Promise<void> {
    const space = this.selectedRequestSpace;
    const message = this.requestMessage.trim();

    if (!space) {
      return;
    }

    if (!message) {
      this.requestError = 'Please write a short note before requesting access.';
      return;
    }

    const challengePageId = this.spaceKey(space);
    if (!challengePageId) {
      this.requestError = 'This challenge space is missing an ID.';
      return;
    }

    this.submittingRequest = true;
    this.requestError = '';

    try {
      await this.challenges.requestToJoinChallengePage(challengePageId, message);
      this.toast.success('Your request was sent to the challenge space admin.');
      this.selectedRequestSpace = null;
      this.requestMessage = '';
    } catch (error) {
      console.error('Unable to request challenge space access', error);
      this.requestError = 'Could not send this request. Please try again.';
    } finally {
      this.submittingRequest = false;
    }
  }

  async acceptRequest(request: ChallengeJoinRequest): Promise<void> {
    if (!request.id || this.processingRequestIds.has(request.id)) {
      return;
    }

    this.processingRequestIds.add(request.id);
    try {
      await this.challenges.acceptChallengeJoinRequest(request.id);
      this.toast.success(`${request.requesterName || request.requesterEmail} was added.`);
    } catch (error) {
      console.error('Unable to accept challenge join request', error);
      this.toast.error('Could not accept this request.');
    } finally {
      this.processingRequestIds.delete(request.id);
    }
  }

  async rejectRequest(request: ChallengeJoinRequest): Promise<void> {
    if (!request.id || this.processingRequestIds.has(request.id)) {
      return;
    }

    this.processingRequestIds.add(request.id);
    try {
      await this.challenges.rejectChallengeJoinRequest(request.id);
      this.toast.success('Request rejected.');
    } catch (error) {
      console.error('Unable to reject challenge join request', error);
      this.toast.error('Could not reject this request.');
    } finally {
      this.processingRequestIds.delete(request.id);
    }
  }

  isProcessingRequest(request: ChallengeJoinRequest): boolean {
    return !!request.id && this.processingRequestIds.has(request.id);
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

  isCurrentUserAdminForSpace(space: ChallengePage): boolean {
    const user = this.auth.currentUser;
    const email = this.normalizeEmail(user?.email || '');
    const uid = user?.uid || '';
    const adminEmails = (space.adminEmails || []).map((value: string) =>
      this.normalizeEmail(value)
    );
    const adminUids = (space.adminUids || []).map((value: string) =>
      String(value || '').trim()
    );

    return (
      (!!uid && space.authorId === uid) ||
      (!!uid && adminUids.includes(uid)) ||
      (!!email && adminEmails.includes(email))
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

  isFeaturedSpace(space: ChallengePage): boolean {
    return !!this.featuredSpaceId && this.spaceKey(space) === this.featuredSpaceId;
  }

  private myRequestStatus(
    space: ChallengePage
  ): ChallengeJoinRequest['status'] | '' {
    const challengePageId = this.spaceKey(space);
    const request = (this.myJoinRequests || []).find(
      (item) => item.challengePageId === challengePageId
    );
    return request?.status || '';
  }

  private requestDateMs(value: any): number {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private normalizeEmail(value: string): string {
    return String(value || '').trim().toLowerCase();
  }
}
