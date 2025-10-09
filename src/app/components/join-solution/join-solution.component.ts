import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, combineLatest, of, switchMap } from 'rxjs';
import { Solution, SolutionRecruitmentProfile } from 'src/app/models/solution';
import { SolutionService } from 'src/app/services/solution.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';

type ReqStatus = 'none' | 'pending' | 'cancelled' | 'approved' | 'rejected';

@Component({
  selector: 'app-join-solution',
  templateUrl: './join-solution.component.html',
  styleUrl: './join-solution.component.css',
})
export class JoinSolutionComponent implements OnInit, OnDestroy {
  solution: Solution = {};
  loading = true;

  // join state
  joining = false; // submitting request/cancel
  alreadyMember = false; // is in participants
  myRequestStatus: ReqStatus = 'none';

  acceptingId: string | null = null;
  decliningId: string | null = null;

  // owner view of requests
  pendingRequests$ = of<any[]>([]);
  isOwner = false;

  // modal
  showRequestModal = false;
  showRequestsModal = false;
  requestMessage = '';
  maxLen = 280;

  private sub?: Subscription;
  private id!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solutionService: SolutionService,
    public auth: AuthService,
    public data: DataService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;

    const sol$ = this.solutionService.getSolution(this.id);

    const me = this.auth.currentUser;
    const myReq$ = me?.uid
      ? this.solutionService.getJoinRequestForUser(this.id, me.uid)
      : of(undefined);

    // 1) main state
    this.sub = combineLatest([sol$, myReq$]).subscribe(([s, r]: any[]) => {
      this.solution = s;
      this.loading = false;

      // robust owner test
      this.isOwner = this.isOwnerOf(s);

      // membership
      const userEmail = this.auth?.currentUser?.email ?? null;
      this.alreadyMember = this.isUserInParticipants(
        s?.participants,
        userEmail
      );

      // my request status
      this.myRequestStatus = (r?.status as ReqStatus) || 'none';
    });

    // 2) owner-gated stream of pending requests
    this.pendingRequests$ = sol$.pipe(
      switchMap((s: any) =>
        this.isOwnerOf(s)
          ? this.solutionService.listPendingJoinRequests(this.id)
          : of([])
      )
    );
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ----- Actions -----
  openRequestModal() {
    if (!this.ensureAuthenticated()) return;
    this.requestMessage = '';
    this.showRequestModal = true;
  }
  closeRequestModal() {
    this.showRequestModal = false;
  }

  async sendJoinRequest() {
    if (this.joining) return;
    if (!this.ensureAuthenticated()) return;
    this.joining = true;
    try {
      const user = this.auth.currentUser;
      if (!user?.uid) {
        throw new Error('Missing user information');
      }
      await this.solutionService.requestToJoin(
        this.id,
        {
          uid: user.uid,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        this.requestMessage || ''
      );
      this.myRequestStatus = 'pending';
      this.showRequestModal = false;
    } catch (e) {
      console.error(e);
      alert('Could not send request. Try again.');
    } finally {
      this.joining = false;
    }
  }

  async cancelMyRequest() {
    if (this.joining) return;
    if (!this.ensureAuthenticated()) return;
    this.joining = true;
    try {
      const user = this.auth.currentUser;
      if (!user?.uid) {
        throw new Error('Missing user information');
      }
      await this.solutionService.cancelJoinRequest(this.id, user.uid);
      this.myRequestStatus = 'cancelled';
    } catch (e) {
      console.error(e);
      alert('Could not cancel request.');
    } finally {
      this.joining = false;
    }
  }

  // ----- Helpers -----
  get designersCount(): number {
    const p = this.solution?.participants;
    if (!p) return 0;
    return Array.isArray(p) ? p.length : Object.keys(p).length;
  }
  get sdgs() {
    return this.solution?.sdgs || [];
  }
  get designersList() {
    return (this.solution as any).teamMembers || [];
  }
  trackByIndex(i: number) {
    return i;
  }

  get recruitmentProfile(): SolutionRecruitmentProfile {
    const profile = this.solution?.recruitmentProfile ?? {};
    return {
      teamLabel: profile.teamLabel || 'Team 1',
      initiativeName:
        profile.initiativeName || this.solution?.title || 'Solution initiative',
      focusArea:
        profile.focusArea ||
        this.solution?.solutionArea ||
        this.solution?.sdgs?.join(', ') ||
        'Focus area not provided',
      challengeDescription:
        profile.challengeDescription || this.solution?.description || '',
      scopeOfWork: profile.scopeOfWork || '',
      finalProduct: profile.finalProduct || '',
      startDate: profile.startDate || '',
      completionDate: profile.completionDate || '',
      timeCommitment: profile.timeCommitment || '1 hour per week',
      teamSizeMin: profile.teamSizeMin ?? null,
      teamSizeMax: profile.teamSizeMax ?? null,
      perspectives:
        profile.perspectives || 'Global perspective\nCross-cultural curiosity',
      interests:
        profile.interests ||
        'Interest in the global energy situation and equitable solutions',
      knowledge:
        profile.knowledge ||
        'Experience living in or understanding regions such as Africa, China, India, Latin America',
      skills:
        profile.skills ||
        'Researching data and trends\nTurning insights into stories\nWorking with AI, maps, charts',
      additionalNotes: profile.additionalNotes || '',
    };
  }

  splitLines(value?: string | null): string[] {
    if (!value) return [];
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  formatRequesterLabel(request: any): string {
    if (!request) return 'A designer';
    const parts = [request.firstName, request.lastName]
      .map((p: string) => (p || '').trim())
      .filter((p: string) => p.length > 0);
    if (parts.length) {
      return parts.join(' ');
    }
    return (request.email || '').toString();
  }

  private ensureAuthenticated(): boolean {
    const user = this.auth?.currentUser;
    if (user?.uid) {
      return true;
    }
    alert('Please log in to join this solution.');
    this.auth?.setRedirectUrl?.(this.router.url);
    this.router.navigate(['/login']);
    return false;
  }

  private isOwnerOf(s: any): boolean {
    const uid = this.auth?.currentUser?.uid;
    const email = (this.auth?.currentUser?.email || '').toLowerCase();

    // common owner fields your docs might use
    const ownerUidMatches =
      s?.authorAccountId === uid ||
      s?.authorUid === uid ||
      s?.ownerId === uid ||
      s?.createdById === uid;

    const ownerEmailMatches =
      (s?.authorEmail || '').toLowerCase() === email ||
      (s?.ownerEmail || '').toLowerCase() === email;

    return !!(ownerUidMatches || ownerEmailMatches);
  }

  private isUserInParticipants(
    participants: any,
    email?: string | null
  ): boolean {
    if (!participants || !email) return false;
    if (Array.isArray(participants)) {
      return participants.some(
        (p: any) =>
          (p?.name || '').trim().toLowerCase() === email.trim().toLowerCase()
      );
    }
    return !!participants[email] || Object.values(participants).includes(email);
  }

  async accept(r: any) {
    if (!r?.uid || !r?.email) return;
    this.acceptingId = r.uid;
    try {
      await this.solutionService.approveJoinRequest(this.id, {
        uid: r.uid,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
      });
      // Optional toast
      // alert(`${r.email} added to participants.`);
    } catch (e) {
      console.error(e);
      alert('Could not approve request. Please try again.');
    } finally {
      this.acceptingId = null;
    }
  }

  async decline(r: any) {
    if (!r?.uid) return;
    this.decliningId = r.uid;
    try {
      await this.solutionService.declineJoinRequest(this.id, r.uid);
    } catch (e) {
      console.error(e);
      alert('Could not decline request. Please try again.');
    } finally {
      this.decliningId = null;
    }
  }

  openRequestsModal(): void {
    this.showRequestsModal = true;
  }

  closeRequestsModal(): void {
    this.showRequestsModal = false;
  }
}
