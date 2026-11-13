import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription, timer } from 'rxjs';
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
    standalone: false
})
export class ChallengeSpacesComponent implements OnInit, OnDestroy {
  private search = '';
  get searchTerm(): string { return this.search; }
  set searchTerm(value: string) {
    this.search = value;
    this.updateSections();
  }

  loading = true;
  directoryLoading = true;
  directoryError = false;
  private challengeSpaces: ChallengePage[] = [];
  private myJoinRequests = new Map<string, ChallengeJoinRequest>();
  joinedSpaces: ChallengePage[] = [];
  availableSpaces: ChallengePage[] = [];
  featuredSpace: ChallengePage | null = null;
  pendingRequests: ChallengeJoinRequest[] = [];
  featuredSpaceId = '';
  selectedRequestSpace: ChallengePage | null = null;
  requestMessage = '';
  requestError = '';
  submittingRequest = false;
  processingRequestIds = new Set<string>();
  private memberUsersByEmail = new Map<string, ChallengeSpaceMember | null>();
  private memberUidsBySpace = new Map<string, string[]>();
  private memberLastActiveByUid = new Map<string, string | undefined>();
  private memberCounts = new Map<string, number>();
  private onlineCounts = new Map<string, number>();
  private challengeSpacesSub?: Subscription;
  private previewSub?: Subscription;
  private auxiliaryLoad?: Subscription;
  private featuredSpaceSub?: Subscription;
  private joinRequestsSub?: Subscription;
  private myJoinRequestsSub?: Subscription;
  private presenceSub?: Subscription;
  private destroyed = false;

  constructor(
    public auth: AuthService,
    private challenges: ChallengesService,
    private presence: PresenceService,
    private toast: ToastService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadDirectory();
    this.previewSub = this.challenges.getChallengeSpacePreviews(
      this.auth.currentUser?.uid, this.auth.currentUser?.email
    )
      .subscribe((pages) => {
        if (!this.directoryLoading) return;
        const previews = new Map(this.challengeSpaces.map((page) => [this.spaceKey(page), page]));
        for (const page of pages) previews.set(this.spaceKey(page), page);
        this.showSpaces([...previews.values()]);
      });

    this.featuredSpaceSub = this.challenges
      .getFeaturedChallengeSpaceConfig()
      .subscribe({
        next: (config) => {
          this.featuredSpaceId = config?.featuredSpaceId || '';
          this.updateSections();
        },
        error: (error) => {
          console.error('Unable to load featured challenge space', error);
        },
      });

    this.myJoinRequestsSub = this.challenges
      .getMyChallengeJoinRequests()
      .subscribe({
        next: (requests) => {
          this.myJoinRequests.clear();
          for (const request of requests || []) {
            if (!this.myJoinRequests.has(request.challengePageId)) {
              this.myJoinRequests.set(request.challengePageId, request);
            }
          }
        },
        error: (error) => {
          console.error('Unable to load your challenge join requests', error);
        },
      });
  }

  loadDirectory(): void {
    this.directoryLoading = true;
    this.directoryError = false;
    this.loading = !this.challengeSpaces.length;
    this.challengeSpacesSub?.unsubscribe();
    this.challengeSpacesSub = this.challenges.getChallengeSpaceDirectory().subscribe({
      next: (pages) => {
        this.directoryLoading = false;
        this.loading = false;
        this.showSpaces(pages);
        this.auxiliaryLoad = timer(0).subscribe(() => {
          this.watchAdminRequests();
          void this.refreshPresenceForSpaces();
        });
      },
      error: (error) => {
        console.error('Unable to load challenge spaces', error);
        this.directoryLoading = false;
        this.directoryError = true;
        this.loading = false;
      },
    });
  }

  private showSpaces(pages: ChallengePage[]): void {
    this.challengeSpaces = pages.filter((page) => this.isVisibleToCurrentUser(page))
      .sort((a, b) => this.displayTitle(a).localeCompare(this.displayTitle(b)));
    this.memberCounts = new Map(this.challengeSpaces.map((space) => [
      this.spaceKey(space), this.memberCount(space),
    ]));
    if (this.challengeSpaces.length) this.loading = false;
    this.updateSections();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.challengeSpacesSub?.unsubscribe();
    this.previewSub?.unsubscribe();
    this.auxiliaryLoad?.unsubscribe();
    this.featuredSpaceSub?.unsubscribe();
    this.joinRequestsSub?.unsubscribe();
    this.myJoinRequestsSub?.unsubscribe();
    this.presenceSub?.unsubscribe();
  }

  private updateSections(): void {
    const query = this.searchTerm.trim().toLowerCase();
    this.joinedSpaces = [];
    this.availableSpaces = [];
    this.featuredSpace = null;
    for (const space of this.challengeSpaces) {
      if (query && ![space.name, space.heading, space.subHeading, space.description, space.customUrl]
        .some((value) => String(value || '').toLowerCase().includes(query))) continue;
      if (this.isFeaturedSpace(space)) this.featuredSpace = space;
      else if (this.isCurrentUserInSpace(space)) this.joinedSpaces.push(space);
      else if (!space.isPrivate) this.availableSpaces.push(space);
    }
  }

  displayTitle(space: ChallengePage): string {
    return (
      String(space.name || space.heading || '').trim() ||
      this.translate.instant('challengeSpaces.untitled')
    );
  }

  displaySubtitle(space: ChallengePage): string {
    return String(space.subHeading || space.description || '').trim();
  }

  featuredActionLabel(space: ChallengePage): string {
    if (this.isCurrentUserInSpace(space)) {
      return this.translate.instant('challengeSpaces.actions.openFeatured');
    }

    return this.requestButtonLabel(space);
  }

  routeTarget(space: ChallengePage): string[] {
    return ['/home-challenge', space.challengePageId || space.customUrl || ''];
  }

  readonly trackSpace = (_index: number, space: ChallengePage): string =>
    this.spaceKey(space);

  trackJoinRequest(_index: number, request: ChallengeJoinRequest): string {
    return request.id || `${request.challengePageId}:${request.requesterEmail}`;
  }

  private watchAdminRequests(): void {
    const adminIds = new Set(
      this.challengeSpaces
        .filter((space) => this.isCurrentUserAdminForSpace(space))
        .map((space) => this.spaceKey(space))
    );
    if (!adminIds.size || this.joinRequestsSub) return;
    this.joinRequestsSub = this.challenges.getChallengeJoinRequests().subscribe({
      next: (requests) => {
        this.pendingRequests = (requests || []).filter((request) => adminIds.has(request.challengePageId))
          .sort((a, b) => this.requestDateMs(b.createdAt) - this.requestDateMs(a.createdAt));
      },
      error: (error) => console.error('Unable to load challenge join requests', error),
    });
  }

  requestSpaceTitle(request: ChallengeJoinRequest): string {
    const space = this.challengeSpaces.find(
      (item) => this.spaceKey(item) === request.challengePageId
    );
    return space ? this.displayTitle(space) : request.challengePageTitle;
  }

  requestButtonLabel(space: ChallengePage): string {
    const status = this.myRequestStatus(space);
    if (status === 'pending') {
      return this.translate.instant('challengeSpaces.actions.requestPending');
    }
    if (status === 'accepted') {
      return this.translate.instant('challengeSpaces.actions.accepted');
    }
    return this.translate.instant('challengeSpaces.actions.requestToJoin');
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
      this.requestError = this.translate.instant(
        'challengeSpaces.requestForm.errors.noteRequired'
      );
      return;
    }

    const challengePageId = this.spaceKey(space);
    if (!challengePageId) {
      this.requestError = this.translate.instant(
        'challengeSpaces.requestForm.errors.missingId'
      );
      return;
    }

    this.submittingRequest = true;
    this.requestError = '';

    try {
      await this.challenges.requestToJoinChallengePage(challengePageId, message);
      this.toast.success(
        this.translate.instant('challengeSpaces.toasts.requestSent')
      );
      this.selectedRequestSpace = null;
      this.requestMessage = '';
    } catch (error) {
      console.error('Unable to request challenge space access', error);
      this.requestError = this.translate.instant(
        'challengeSpaces.requestForm.errors.sendFailed'
      );
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
      this.toast.success(
        this.translate.instant('challengeSpaces.toasts.memberAdded', {
          name: request.requesterName || request.requesterEmail,
        })
      );
    } catch (error) {
      console.error('Unable to accept challenge join request', error);
      this.toast.error(
        this.translate.instant('challengeSpaces.toasts.acceptFailed')
      );
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
      this.toast.success(
        this.translate.instant('challengeSpaces.toasts.requestRejected')
      );
    } catch (error) {
      console.error('Unable to reject challenge join request', error);
      this.toast.error(
        this.translate.instant('challengeSpaces.toasts.rejectFailed')
      );
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
      'assets/img/gsl-logo.png'
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
    const count = this.memberCounts.get(this.spaceKey(space)) ?? 0;
    return this.translate.instant(
      count === 1
        ? 'challengeSpaces.members.one'
        : 'challengeSpaces.members.other',
      { count }
    );
  }

  onlineCount(space: ChallengePage): number {
    return this.onlineCounts.get(this.spaceKey(space)) ?? 0;
  }

  onlineLabel(space: ChallengePage): string {
    const count = this.onlineCount(space);
    return this.translate.instant(
      count === 1
        ? 'challengeSpaces.online.one'
        : 'challengeSpaces.online.other',
      { count }
    );
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

    await this.resolveMembersByEmail(emails);
    if (this.destroyed) return;

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
        this.onlineCounts = new Map([...this.memberUidsBySpace].map(([key, uids]) => [
          key, uids.filter((uid) => onlineUids.has(uid)).length,
        ]));
      });
  }

  private async resolveMembersByEmail(emails: string[]): Promise<void> {
    const currentUserEmail = this.normalizeEmail(this.auth.currentUser?.email || '');
    const currentUid = this.auth.currentUser?.uid || this.auth.currentAuthUid || '';
    const unresolved = emails.filter((email) => {
      const normalizedEmail = this.normalizeEmail(email);
      if (!normalizedEmail || this.memberUsersByEmail.has(normalizedEmail)) {
        return false;
      }
      if (normalizedEmail === currentUserEmail && currentUid) {
        this.memberUsersByEmail.set(normalizedEmail, {
          uid: currentUid,
          lastActiveAt: new Date().toISOString(),
        });
        return false;
      }
      return true;
    });
    if (!unresolved.length) return;

    try {
      const users = await this.auth.getUsersByEmailsOnce(unresolved);
      const usersByEmail = new Map<string, User>();
      users.forEach((user) => {
        const email = this.normalizeEmail(user.emailLower || user.email || '');
        if (email) usersByEmail.set(email, user);
      });
      unresolved.forEach((email) => {
        const normalizedEmail = this.normalizeEmail(email);
        const user = usersByEmail.get(normalizedEmail);
        this.memberUsersByEmail.set(
          normalizedEmail,
          user?.uid
            ? { uid: user.uid, lastActiveAt: user.lastActiveAt }
            : null
        );
      });
    } catch {
      unresolved.forEach((email) => {
        this.memberUsersByEmail.set(this.normalizeEmail(email), null);
      });
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
    return this.myJoinRequests.get(this.spaceKey(space))?.status || '';
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
